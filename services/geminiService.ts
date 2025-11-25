import { GoogleGenAI, Type } from "@google/genai";
import { MissionData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMissionBriefing = async (): Promise<MissionData> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Generate a short, intense sci-fi military mission briefing for a lone commando. Return JSON with codename, objective (1 sentence), and intel (1 short cryptic sentence about the enemy).",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            codename: { type: Type.STRING },
            objective: { type: Type.STRING },
            intel: { type: Type.STRING }
          },
          required: ["codename", "objective", "intel"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as MissionData;
  } catch (error) {
    console.error("Gemini Briefing Error:", error);
    // Fallback if API fails
    return {
      codename: "OPERATION SILENT ECHO",
      objective: "Infiltrate the cyber-factory and destroy the rogue AI core.",
      intel: "Enemy units are heavily armored. Aim for the optical sensors."
    };
  }
};