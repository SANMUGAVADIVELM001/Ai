/**
 * Prompt for extracting a structured profile from a learner's free-text
 * goal. The LLM only extracts what the learner literally said — it must
 * never invent a skill level or score; `experienceLevel` always comes back
 * null here and is filled in later by the diagnostic assessment engine.
 */
export function buildGoalProfilePrompt(goalText: string): string {
  return `You are an information-extraction system for a learning platform. Extract structured facts from the learner's goal statement below. Only use information explicitly stated or clearly implied in the text — do not guess or invent facts.

Learner statement:
"""
${goalText}
"""

Respond with ONLY a JSON object matching exactly this shape (no markdown, no commentary):
{
  "goal": string or null (the target role/career, e.g. "Machine Learning Engineer"),
  "timelineMonths": number or null (convert weeks/years to months if stated),
  "currentSkills": string[] (skills the learner says they already know),
  "studyHoursPerDay": number or null,
  "learningPreferences": string[] (e.g. "hands-on projects", "videos", "reading"),
  "experienceLevel": null (always null — this is determined by an assessment, never inferred from text)
}`;
}
