import Anthropic from "@anthropic-ai/sdk";

// NEVER log the full error object — may contain API key in request metadata

export const client = new Anthropic({ timeout: 15_000 });

export function safeApiError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 401)
      return "API key appears invalid. Check ANTHROPIC_API_KEY.";
    if (error.status === 429)
      return "Rate limited. Wait a moment and try again.";
    if (error.status === 529)
      return "API is overloaded. Try again shortly.";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Unknown error occurred.";
}
