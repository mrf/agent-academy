import { z } from "zod";

const MARKDOWN_FENCE = /```(?:json)?\s*\n?([\s\S]*?)```/;
const JSON_START = /[\[{]/;

export function extractJson(text: string): string {
  const fenceMatch = text.match(MARKDOWN_FENCE);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  const jsonStart = text.search(JSON_START);
  if (jsonStart > 0) {
    return text.slice(jsonStart);
  }

  return text;
}

export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(extractJson(text)) as T;
  } catch {
    return fallback;
  }
}

export const GeneratedQuizSchema = z.array(
  z.object({
    question: z.string(),
    options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    correct: z.number().int().min(0).max(3),
    explanation: z.string(),
  }),
);

export const EvaluationSchema = z.object({
  correct: z.boolean(),
  feedback: z.string(),
  score: z.number().min(0).max(100),
});

export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;
