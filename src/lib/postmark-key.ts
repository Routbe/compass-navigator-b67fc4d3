/** Validates the Postmark server token in one place so mail never fails silently. */
const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PostmarkTokenStatus {
  token: string | null;
  error: string | null;
}

/** Read inside a handler, never at module level. */
export function postmarkTokenStatus(): PostmarkTokenStatus {
  const token = (process.env["POSTMARK_SERVER_TOKEN"] ?? "").trim();
  if (!token) return { token: null, error: "POSTMARK_SERVER_TOKEN ontbreekt: er kan geen e-mail verzonden worden." };
  if (!TOKEN_PATTERN.test(token)) return { token: null, error: "POSTMARK_SERVER_TOKEN heeft niet het verwachte formaat (Server API token uit Postmark → Server → API Tokens)." };
  return { token, error: null };
}

export function describePostmarkFailure(status: number, detail: string): string {
  if (status === 401) return "Postmark weigerde de server-token (401). Controleer POSTMARK_SERVER_TOKEN.";
  if (status === 422) {
    try {
      const body = JSON.parse(detail) as { ErrorCode?: number; Message?: string };
      if (body.ErrorCode === 400) return "Afzender niet bevestigd in Postmark: verifieer het domein rout.be (DKIM + Return-Path).";
      if (body.ErrorCode === 406) return "Ontvanger staat op de Postmark-blokkeerlijst (eerdere bounce of klacht).";
      return `Postmark weigerde de mail (${body.ErrorCode ?? 422}): ${body.Message ?? "onbekende reden"}`;
    } catch {
      return "Postmark weigerde de mail (422).";
    }
  }
  if (status === 429) return "Postmark-limiet bereikt; later opnieuw proberen.";
  return `Postmark gaf status ${status}.`;
}
