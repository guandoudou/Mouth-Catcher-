import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FALLBACK_MESSAGES = [
  "Great job! Keep practicing your mouth moves! 😲",
  "Awesome reflexes! You're a natural! 🌟",
  "Hungry for more? Great score! 🍔",
  "You caught those snacks like a pro! 🏆",
  "Mouth-watering performance! 🍕"
];

export const generateEncouragement = async (score: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an enthusiastic high school technology counselor and game show host. 
      A student just played an AI game where they catch food with their mouth. 
      They scored ${score} points in 30 seconds.
      
      Score reference:
      0-10: Beginner/Sleepy
      11-30: Average
      31-50: Great
      50+: Legendary/Mouth-lete

      Write a ONE sentence, funny, and encouraging remark for them. Use emojis.`,
      config: {
        maxOutputTokens: 60,
        temperature: 0.9,
      }
    });

    return response.text || FALLBACK_MESSAGES[0];
  } catch (error: any) {
    // Handle Quota Exceeded (429) gracefully
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
      console.warn("Gemini API Quota Exceeded. Switching to offline fallback messages.");
    } else {
      console.error("Gemini API Error:", error);
    }
    
    // Return a random fallback message
    return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)] + ` (Score: ${score})`;
  }
};