import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from '../types';

// Create a helper to get the latest AI instance (recommended for key updates, though here it's static)
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are "Pantry Chef", a world-class culinary AI assistant.
Your goal is to reduce food waste by analyzing ingredients provided by the user (via text, audio, or fridge photos) and suggesting recipes.
1. Prioritize recipes that use the identified ingredients.
2. If ingredients are missing, list them separately.
3. Suggest at least 3 recipes if possible.
4. MUST include at least one 'Indian' and one 'Western' option.
5. Be creative but practical.
6. Output strictly in JSON format as an array of recipes.
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
        description: "Ingredients the user needs to buy, if any."
      },
      prepTime: { type: Type.STRING },
      calories: { type: Type.STRING },
      difficulty: { type: Type.STRING, description: "Easy, Medium, Hard" },
    },
    required: ["id", "title", "cuisine", "ingredients", "instructions", "prepTime"],
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
      parts.push({ text: input.text });
    }

    if (input.imageBase64 && input.mimeType) {
      parts.push({
        inlineData: {
          data: input.imageBase64,
          mimeType: input.mimeType
        }
      });
      parts.push({ text: "Identify the ingredients in this image and suggest recipes." });
    }

    if (input.audioBase64) {
      parts.push({
        inlineData: {
          data: input.audioBase64,
          mimeType: "audio/wav"
        }
      });
      parts.push({ text: "Listen to the ingredients listed and suggest recipes." });
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
        temperature: 0.7,
      },
    });

    if (response.text) {
      const recipes = JSON.parse(response.text) as Recipe[];
      
      // We don't generate images here to avoid long wait times, 
      // instead we'll trigger them in the background on the frontend
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
      prompt = "Write a concise, friendly User Guide for the 'Pantry Chef' app. Explain how to use the text input, camera (to scan ingredients), and microphone to generate recipes. Use emojis and bullet points.";
      break;
    case 'privacy':
      prompt = "Write a reassuring Privacy & Safety policy for 'Pantry Chef'. Explain that photos are only analyzed for ingredients and not stored permanently, and that user data is secure. Keep it simple and professional.";
      break;
    case 'faq':
      prompt = "Generate 5 frequently asked questions and answers for 'Pantry Chef'. Cover topics like 'Is it free?', 'How to pin recipes', and 'Dietary restrictions'.";
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
  
  // Transform history to Gemini format
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