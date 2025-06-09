/**
 * Extracts a JSON object from a string that might contain markdown backticks
 * and other text.
 * @param text The text returned from the AI.
 * @returns The parsed JSON object.
 * @throws An error if no valid JSON object is found.
 */
export function extractJsonFromAiResponse(text: string): any {
  const jsonRegex = /```json\s*([\s\S]*?)\s*```|({[\s\S]*})/;
  const match = text.match(jsonRegex);

  if (!match) {
    // As a last resort, try to parse the whole string if it starts with {
    if (text.trim().startsWith('{')) {
      try {
        return JSON.parse(text.trim());
      } catch (e) {
        throw new Error("AI response does not contain a valid JSON object.");
      }
    }
    throw new Error("AI response does not contain a valid JSON object.");
  }

  // Prefer the content of a markdown block if present (match[1]), otherwise use the raw object (match[2]).
  const jsonString = match[1] || match[2];

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse extracted JSON:", error);
    throw new Error("Invalid JSON format in the AI response.");
  }
} 