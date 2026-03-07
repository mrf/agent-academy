import { client } from "./client.js";
import {
  safeJsonParse,
  GeneratedQuizSchema,
  type GeneratedQuiz,
} from "./json-utils.js";
import { MODELS } from "../constants.js";
import type { ClearanceLevel } from "../types.js";

const MAX_BATCHES = 5;

const SYSTEM_PROMPT = `You generate quiz questions for a spy-themed CLI coding academy.

Return ONLY valid JSON — no markdown, no explanation.

Schema: an array of objects, each with:
- "question": string (the question text)
- "options": [string, string, string, string] (exactly 4 choices)
- "correct": number (0-3 index of correct option)
- "explanation": string (brief explanation of the answer)

Example:
[
  {
    "question": "What does 'git status' show?",
    "options": ["Commit history", "Working tree status", "Remote URLs", "Branch list"],
    "correct": 1,
    "explanation": "git status shows the state of the working directory and staging area."
  }
]

Difficulty tiers:
- recruit: Recognition-level. Simple recall and identification questions.
- operative: Understanding-level. Requires comprehension and comparison.
- elite: Application-level. Requires applying knowledge to scenarios.`;

function buildUserPrompt(
  topic: string,
  difficulty: ClearanceLevel,
  count: number,
): string {
  return `Generate ${count} ${difficulty}-level quiz questions about: ${topic}`;
}

async function callApi(
  topic: string,
  difficulty: ClearanceLevel,
  count: number,
): Promise<GeneratedQuiz> {
  const response = await client.messages.create({
    model: MODELS.GENERATOR,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: buildUserPrompt(topic, difficulty, count) },
      { role: "assistant", content: "[" },
    ],
  });

  const block = response.content[0];
  const text = block.type === "text" ? block.text : "";
  const raw = safeJsonParse("[" + text, []);

  const result = GeneratedQuizSchema.safeParse(raw);
  return result.success ? result.data : [];
}

export async function generateFieldAssessments(
  topic: string,
  difficulty: ClearanceLevel,
  count: number = 5,
  batches: number = 1,
): Promise<GeneratedQuiz> {
  const batchCount = Math.min(Math.max(batches, 1), MAX_BATCHES);
  const results: GeneratedQuiz = [];

  for (let i = 0; i < batchCount; i++) {
    let questions = await callApi(topic, difficulty, count);

    // Retry once on empty result
    if (questions.length === 0) {
      questions = await callApi(topic, difficulty, count);
    }

    results.push(...questions);
  }

  return results;
}
