/**
 * Central transactional mailer — Postmark, transactional stream only.
 *
 * Every system e-mail in ROUT (sign-in codes, security notices, Chronos
 * warnings, receipts) goes through `sendMail`. The payload is built by the
 * pure `buildPostmarkPayload` so the privacy guarantees are testable:
 *   - TrackOpens false, TrackLinks "None": no pixel, links stay pure https://rout.be/…
 *   - MessageStream "outbound": Postmark's transactional stream (never broadcast)
 *   - no List-Unsubscribe / List-* / Precedence headers, ever
 *   - X-Entity-Ref-ID per message so clients never thread unrelated codes
 *   - fixed system senders on rout.be
 *
 * Never throws: a failing mail must not break a webhook or a sign-up.
 */

import { maskEmail } from "@/lib/security/redact";
import { postmarkTokenStatus, describePostmarkFailure } from "@/lib/postmark-key";
import type { EmailCategory } from "./template-ids";

export const POSTMARK_ENDPOINT = "https://api.postmarkapp.com/email";
export const MESSAGE_STREAM = "outbound";
export const AUTH_SENDER = "ROUT <auth@rout.be>";
export const SYSTEM_SENDER = "ROUT <system@rout.be>";

/** Categories sent from auth@rout.be; everything else uses system@rout.be. */
const SECURITY_CATEGORIES = new Set([
  "login", "recovery", "email_change", "reauthentication", "confirmation", "security", "merge", "deletion",
]);

/** Headers that would make a client treat the mail as a list or newsletter. */
const FORBIDDEN_HEADER = /^(list-|precedence$|x-mailin-|x-campaign|feedback-id$)/i;

export interface MailOptions {
  notificationUserId?: string;
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  /** Legacy (former provider templates); ignored — every mail is rendered by us. */
  templateId?: number;
  category?: EmailCategory;
  language?: unknown;
  /** Legacy template params; only logged as a redacted summary. */
  params?: Record<string, unknown>;
  replyTo?: { email: string; name?: string };
  tags?: string[];
  attachments?: { name: string; contentBase64: string }[];
  /** Legacy flag; our rendered HTML is always the only body. */
  htmlFirst?: boolean;
  skipAdminAlert?: boolean;
  correlationId?: string;
}

export interface AdminAlertParams {
  FAILED_TEMPLATE_ID: number | string;
  USED_FALLBACK_ID: number | string;
  RECIPIENT_EMAIL: string;
  REASON: string;
}

/** Every mail is tagged transactional (+ security for auth mails); caller tags are kept. */
export function transactionalTags(category?: string, extra?: string[]): string[] {
  const tags = ["transactional"];
  if (category && SECURITY_CATEGORIES.has(category)) tags.push("security", "auth");
  if (category === "login") tags.push("otp");
  for (const t of extra ?? []) if (t && !tags.includes(t)) tags.push(t);
  return tags;
}

export function senderFor(category?: string, tags?: string[]): string {
  const auth = (category && SECURITY_CATEGORIES.has(category)) || tags?.some((t) => t === "auth" || t === "otp");
  return auth ? AUTH_SENDER : SYSTEM_SENDER;
}

function formatAddress(a: { email: string; name?: string }): string {
  const name = a.name?.replace(/["\r\n]/g, "").trim();
  return name ? `"${name}" <${a.email}>` : a.email;
}

function adminAddress(): string {
  return process.env["CONTACT_ADMIN_EMAIL"] ?? process.env["ADMIN_EMAIL"] ?? "hallo@rout.be";
}

export function isMailConfigured(): boolean {
  return postmarkTokenStatus().token !== null;
}

export function newCorrelationId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `mail_${Date.now().toString(36)}_${rand}`;
}

export function textFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mimeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "txt" ? "text/plain" : ext === "ics" ? "text/calendar" : "application/octet-stream";
}

/** Pure payload builder: the single place the privacy rules are enforced. */
export function buildPostmarkPayload(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  category?: string;
  tags?: string[];
  replyTo?: { email: string; name?: string };
  attachments?: { name: string; contentBase64: string }[];
  correlationId: string;
  extraHeaders?: Record<string, string>;
}): Record<string, unknown> {
  const headers = [{ Name: "X-Entity-Ref-ID", Value: input.correlationId }];
  for (const [Name, Value] of Object.entries(input.extraHeaders ?? {})) {
    if (!FORBIDDEN_HEADER.test(Name) && Name.toLowerCase() !== "x-entity-ref-id") headers.push({ Name, Value });
  }
  const tags = transactionalTags(input.category, input.tags);
  return {
    From: senderFor(input.category, input.tags),
    To: input.to,
    ReplyTo: formatAddress(input.replyTo ?? { email: "hallo@rout.be", name: "ROUT" }),
    Subject: input.subject,
    HtmlBody: input.html,
    TextBody: input.text,
    // Postmark allows one tag; the most specific one wins.
    Tag: tags[tags.length - 1],
    Metadata: { category: input.category ?? "none", ref: input.correlationId },
    Headers: headers,
    TrackOpens: false,
    TrackLinks: "None",
    MessageStream: MESSAGE_STREAM,
    ...(input.attachments?.length
      ? { Attachments: input.attachments.map((f) => ({ Name: f.name, Content: f.contentBase64, ContentType: mimeFor(f.name) })) }
      : {}),
  };
}

const isTransient = (status: number) => status === 408 || status === 429 || status >= 500;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [400, 1200];
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function postToPostmark(token: string, body: Record<string, unknown>, label: string, correlationId: string): Promise<{ sent: boolean; error?: string }> {
  let lastError = "Could not reach the mail provider.";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(POSTMARK_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", "X-Postmark-Server-Token": token },
        body: JSON.stringify(body),
      });
      const detail = (await res.text().catch(() => "")).slice(0, 500);
      let code = 0;
      try { code = Number((JSON.parse(detail) as { ErrorCode?: number }).ErrorCode ?? 0); } catch { /* non-JSON */ }
      if (res.ok && code === 0) {
        console.info(`[Mailer] ${label} sent`, { correlationId, try: attempt });
        return { sent: true };
      }
      lastError = describePostmarkFailure(res.status, detail);
      console.error(`[Postmark API Error] ${label} failed [${res.status}]`, { correlationId, try: `${attempt}/${MAX_ATTEMPTS}`, detail });
      if (!isTransient(res.status) || attempt === MAX_ATTEMPTS) return { sent: false, error: lastError };
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
      console.error(`[Mailer] ${label} threw`, { correlationId, try: `${attempt}/${MAX_ATTEMPTS}`, error: lastError });
      if (attempt === MAX_ATTEMPTS) return { sent: false, error: lastError };
    }
    await wait(BACKOFF_MS[attempt - 1] ?? 1200);
  }
  return { sent: false, error: lastError };
}

/** Log-safe view of params: keys and lengths only. */
export function summariseParams(params?: Record<string, unknown>): Record<string, string> {
  if (!params) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") { out[key] = "(empty)"; continue; }
    const text = typeof value === "string" ? value : JSON.stringify(value) ?? "";
    out[key] = SAFE_PARAM_KEYS.has(key.toUpperCase()) && /^[a-z-]{2,10}$/i.test(text) ? text : `<${text.length} chars>`;
  }
  return out;
}
const SAFE_PARAM_KEYS = new Set(["LANG", "LANGUAGE", "LOCALE"]);

const escapeHtml = (v: string) => v.replace(/[&<>"]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"));

/** Fire-and-forget alert to the team when a mail could not be delivered. */
export function notifyAdminOfFallback(params: AdminAlertParams): void {
  void sendMail({
    to: adminAddress(),
    subject: `[ROUT] Mail niet afgeleverd (${params.FAILED_TEMPLATE_ID})`,
    category: "system",
    language: "nl",
    skipAdminAlert: true,
    tags: ["mailer-alert"],
    html:
      `<p>Een systeemmail kon niet worden afgeleverd.</p>` +
      `<p>Onderdeel: <strong>${escapeHtml(String(params.FAILED_TEMPLATE_ID))}</strong><br>` +
      `Ontvanger: ${escapeHtml(maskEmail(params.RECIPIENT_EMAIL))}<br>` +
      `Reden: ${escapeHtml(params.REASON)}</p>`,
  });
}

export async function sendMail(opts: MailOptions): Promise<{ sent: boolean; error?: string }> {
  if (opts.notificationUserId) {
    try {
      const { notificationMailPolicy } = await import("@/lib/email/unsubscribe.server");
      const policy = await notificationMailPolicy(opts.notificationUserId, opts.category, opts.tags);
      // Preference is honoured in-app; list headers are never attached.
      if (!policy.allowed) return { sent: false, error: "Notification email disabled by recipient." };
    } catch {
      return { sent: false, error: "Notification preference check unavailable." };
    }
  }
  const correlationId = opts.correlationId ?? newCorrelationId();
  const { token, error: tokenError } = postmarkTokenStatus();
  if (!token) {
    console.error(`[Mailer] ${tokenError}`, { correlationId, to: maskEmail(opts.to) });
    return { sent: false, error: tokenError ?? "E-mailverzending is niet geconfigureerd." };
  }
  if (!opts.html && !opts.text) {
    console.error("[Mailer] nothing to send: no body supplied", { correlationId, category: opts.category ?? "(none)" });
    return { sent: false, error: "No body was provided for this e-mail." };
  }

  let html = opts.html ?? `<pre>${escapeHtml(opts.text ?? "")}</pre>`;
  if (!/<html[\s>]/i.test(html)) {
    const { brandHtml } = await import("./react/branded.server");
    const branded = await brandHtml(html, { language: opts.language, preview: opts.subject, ...(opts.category ? { category: opts.category } : {}) });
    if (branded) html = branded;
  }
  const text = opts.text ?? textFromHtml(html);

  const body = buildPostmarkPayload({
    to: opts.to,
    subject: opts.subject ?? "ROUT",
    html,
    text,
    ...(opts.category ? { category: opts.category } : {}),
    ...(opts.tags ? { tags: opts.tags } : {}),
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    ...(opts.attachments ? { attachments: opts.attachments } : {}),
    correlationId,
  });
  console.info("[Mailer] sending", { correlationId, to: maskEmail(opts.to), category: opts.category ?? "(none)", params: summariseParams(opts.params) });

  const result = await postToPostmark(token, body, `${opts.category ?? "mail"}`, correlationId);
  if (!result.sent && !opts.skipAdminAlert) {
    notifyAdminOfFallback({ FAILED_TEMPLATE_ID: opts.category ?? "mail", USED_FALLBACK_ID: "none", RECIPIENT_EMAIL: opts.to, REASON: `${result.error ?? "unknown"} [${correlationId}]` });
  }
  return result;
}
