export interface Ingredient {
  name: string;
  amount?: string;
}

export interface SpoilageWarning {
  item: string;
  reason: string;
}

export interface Recipe {
  id: string;
  title: string;
  cuisine: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  missingIngredients: string[];
  prepTime: string;
  calories?: string;
  difficulty?: string;
  imageUrl?: string;
}

export interface AnalysisResult {
  recipes: Recipe[];
  detectedIngredients: string[];
  spoilageWarnings: SpoilageWarning[];
  isUnclear?: boolean;
  unclearMessage?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  queryType: 'text' | 'image' | 'audio';
  queryPreview: string;
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