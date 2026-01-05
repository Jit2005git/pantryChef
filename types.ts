export interface Ingredient {
  name: string;
  amount?: string;
}

export interface Recipe {
  id: string;
  title: string;
  cuisine: string; // 'Indian' | 'Western' | etc.
  description: string;
  ingredients: string[];
  instructions: string[];
  missingIngredients: string[];
  prepTime: string;
  calories?: string;
  difficulty?: string;
  imageUrl?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  queryType: 'text' | 'image' | 'audio';
  queryPreview: string; // Text snippet or base64 image thumbnail
  recipes: Recipe[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  isPro: boolean;
  avatarUrl?: string;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  COLORFUL = 'colorful'
}