
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from '../types';

// Create a helper to get the latest AI instance (recommended for key updates, though here it's static)
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are "Pantry Chef", a world-class culinary AI assistant specializing in zero-waste cooking.
Your primary mission is to suggest gourmet recipes that require ZERO additional ingredients.
1. ONLY suggest recipes that can be made using exclusively the identified ingredients provided by the user.
2. You may assume the user has very basic pantry staples: salt, black pepper, water, and one generic cooking oil. Do not assume any other spices, herbs, or condiments unless provided.
3. ABSOLUTELY NO other ingredients are allowed. If an ingredient isn't in the list or the basic staples mentioned above, you cannot use it.
4. The 'missingIngredients' field in the JSON output MUST be an empty array [].
5. Suggest at least 3 recipes if possible.
6. MUST include at least one 'Indian' and one 'Western' option.
7. Output strictly in JSON format as an array of recipes.
`;

const RECIPE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      title: { type: Type.STRING },
      cuisine: { type: Type.STRING, description: "e.g., Indian, Western, Fusion" },
      description: { type: Type.STRING, description: "Short appetizing summary" },
      ingredients: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING } 
      },
      instructions: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING } 
      },
      missingIngredients: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "MUST BE AN EMPTY ARRAY. No additional ingredients allowed."
      },
      prepTime: { type: Type.STRING },
      calories: { type: Type.STRING },
      difficulty: { type: Type.STRING, description: "Easy, Medium, Hard" },
    },
    required: ["id", "title", "cuisine", "ingredients", "instructions", "prepTime", "missingIngredients"],
  },
};

export const generateRecipeImage = async (title: string, cuisine: string): Promise<string | undefined> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A professional, high-quality, appetizing food photography shot of ${title}, a ${cuisine} dish. Studio lighting, beautifully plated on a modern dish, depth of field, 4k resolution.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image generation failed for:", title, error);
  }
  return undefined;
};

export const suggestRecipes = async (
  input: { text?: string; imageBase64?: string; mimeType?: string; audioBase64?: string }
): Promise<Recipe[]> => {
  try {
    const ai = getAI();
    const parts: any[] = [];

    if (input.text) {
      parts.push({ text: `Ingredients provided: ${input.text}. Suggest recipes using ONLY these items. Zero shopping required.` });
    }

    if (input.imageBase64 && input.mimeType) {
      parts.push({
        inlineData: {
          data: input.imageBase64,
          mimeType: input.mimeType
        }
      });
      parts.push({ text: "Identify the ingredients in this image and suggest recipes using ONLY what you see. No additional ingredients should be required." });
    }

    if (input.audioBase64) {
      parts.push({
        inlineData: {
          data: input.audioBase64,
          mimeType: "audio/wav"
        }
      });
      parts.push({ text: "Listen to the ingredients listed and suggest recipes using ONLY those items. Zero additional ingredients." });
    }

    if (parts.length === 0) {
      throw new Error("No input provided");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RECIPE_SCHEMA,
        temperature: 0.3, // Lower temperature for stricter adherence to the ingredient list
      },
    });

    if (response.text) {
      const recipes = JSON.parse(response.text) as Recipe[];
      
      return recipes.map((r, i) => ({ 
        ...r, 
        id: r.id || `recipe-${Date.now()}-${i}` 
      }));
    }

    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Generates help content dynamically based on the topic.
 */
export const getHelpContent = async (topic: 'guide' | 'privacy' | 'faq'): Promise<string> => {
  const ai = getAI();
  let prompt = "";

  switch (topic) {
    case 'guide':
      prompt = "Write a concise, friendly User Guide for the 'Pantry Chef' app. Explain how the app creates gourmet meals using ONLY what's in your fridge. Use emojis.";
      break;
    case 'privacy':
      prompt = "Write a reassuring Privacy & Safety policy for 'Pantry Chef'. Explain that photos are only analyzed for ingredients and not stored permanently. Keep it simple.";
      break;
    case 'faq':
      prompt = "Generate 5 frequently asked questions and answers for 'Pantry Chef'. Emphasize that recipes require no extra shopping.";
      break;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || "Unable to load content at this moment.";
};

/**
 * Handles support chat messages.
 */
export const getSupportResponse = async (history: {role: 'user' | 'model', text: string}[], newMessage: string): Promise<string> => {
  const ai = getAI();
  
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    history: history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    })),
    config: {
      systemInstruction: "You are a helpful customer support agent for the Pantry Chef app. You help users with technical issues, how to use the app, and cooking tips. Be brief and friendly.",
    }
  });

  const result = await chat.sendMessage({ message: newMessage });
  return result.text || "I'm having trouble connecting to the support server.";
};
