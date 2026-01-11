import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, AnalysisResult, SpoilageWarning } from '../types';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are "Pantry Chef", a world-class culinary AI assistant specializing in zero-waste cooking and food safety.
Your mission is to analyze inputs (text, images, or audio) to:
1. IDENTIFY all food items and ingredients.
2. INSPECT visual inputs for quality: If the picture is hazy, blurry, too dark, or otherwise not understandable, set 'isUnclear' to true and return the specific message: "click pictures clearly so that the chef can give the recipe".
3. INSPECT visual inputs for spoilage: If any food looks rotten, expired, moldy, discolored, or "bad looking", flag it immediately in 'spoilageWarnings'.
4. SUGGEST gourmet recipes using ONLY the fresh ingredients identified.
5. ZERO additional ingredients allowed (except salt, pepper, water, and generic oil).
6. The 'missingIngredients' field MUST be an empty array [].
7. If 'isUnclear' is true, return empty arrays for recipes, ingredients, and warnings.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    recipes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          cuisine: { type: Type.STRING },
          description: { type: Type.STRING },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          prepTime: { type: Type.STRING },
          calories: { type: Type.STRING },
          difficulty: { type: Type.STRING },
        },
        required: ["id", "title", "cuisine", "ingredients", "instructions", "prepTime", "missingIngredients"],
      },
    },
    detectedIngredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of all food items found in the input."
    },
    spoilageWarnings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING },
          reason: { type: Type.STRING, description: "Why the food looks bad (e.g., mold, discoloration, wilting)." }
        },
        required: ["item", "reason"]
      }
    },
    isUnclear: {
      type: Type.BOOLEAN,
      description: "True if the image is too blurry or hazy to identify anything."
    },
    unclearMessage: {
      type: Type.STRING,
      description: "Mandatory message if isUnclear is true: 'click pictures clearly so that the chef can give the recipe'"
    }
  },
  required: ["recipes", "detectedIngredients", "spoilageWarnings", "isUnclear"]
};

export const generateRecipeImage = async (title: string, cuisine: string): Promise<string | undefined> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A professional food photography shot of ${title}, a ${cuisine} dish. High resolution, appetizing.` }],
      },
      config: { imageConfig: { aspectRatio: "16:9" } },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (error) { console.error("Image generation failed", error); }
  return undefined;
};

export const suggestRecipes = async (
  input: { text?: string; imageBase64?: string; mimeType?: string; audioBase64?: string }
): Promise<AnalysisResult> => {
  try {
    const ai = getAI();
    const parts: any[] = [];

    if (input.text) {
      parts.push({ text: `Ingredients provided: ${input.text}.` });
    }

    if (input.imageBase64 && input.mimeType) {
      parts.push({
        inlineData: { data: input.imageBase64, mimeType: input.mimeType }
      });
      parts.push({ text: "Carefully analyze this image. First, check if the image is clear enough to identify ingredients. If it is hazy or blurry, flag it. If clear, identify every food item and look for spoilage." });
    }

    if (input.audioBase64) {
      parts.push({
        inlineData: { data: input.audioBase64, mimeType: "audio/wav" }
      });
      parts.push({ text: "Listen to the ingredients listed." });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1, // Lower temperature for more consistent classification of image quality
      },
    });

    if (response.text) {
      const result = JSON.parse(response.text) as AnalysisResult;
      result.recipes = result.recipes.map((r, i) => ({ 
        ...r, 
        id: r.id || `recipe-${Date.now()}-${i}` 
      }));
      return result;
    }

    return { recipes: [], detectedIngredients: [], spoilageWarnings: [], isUnclear: false };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const getHelpContent = async (topic: 'guide' | 'privacy' | 'faq'): Promise<string> => {
  const ai = getAI();
  const prompt = topic === 'guide' ? "Write a user guide for Pantry Chef." : topic === 'privacy' ? "Write a privacy policy." : "Generate FAQs.";
  const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
  return response.text || "";
};

export const getSupportResponse = async (history: {role: 'user' | 'model', text: string}[], newMessage: string): Promise<string> => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    config: { systemInstruction: "You are a support agent for Pantry Chef." }
  });
  const result = await chat.sendMessage({ message: newMessage });
  return result.text || "";
};