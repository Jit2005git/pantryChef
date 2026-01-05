import React, { useState, useEffect } from 'react';
import { Recipe } from '../types';
import { Share2, Copy, Pin, Clock, Flame, ChefHat, Loader2, Check } from 'lucide-react';
import { generateRecipeImage } from '../services/geminiService';

interface RecipeCardProps {
  recipe: Recipe;
  onPin: (recipe: Recipe) => void;
  isPinned?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onPin, isPinned }) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [displayImage, setDisplayImage] = useState<string | null>(recipe.imageUrl || null);
  const [imageLoading, setImageLoading] = useState(!recipe.imageUrl);

  useEffect(() => {
    let isMounted = true;
    if (!recipe.imageUrl) {
      setImageLoading(true);
      generateRecipeImage(recipe.title, recipe.cuisine).then(url => {
        if (isMounted && url) {
          setDisplayImage(url);
          setImageLoading(false);
        } else if (isMounted) {
          // Fallback static image if generation fails
          const fallback = recipe.cuisine.toLowerCase().includes('indian') 
            ? 'https://images.unsplash.com/photo-1585937421612-70a008356f36?auto=format&fit=crop&w=600&q=80'
            : 'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=600&q=80';
          setDisplayImage(fallback);
          setImageLoading(false);
        }
      });
    }
    return () => { isMounted = false; };
  }, [recipe.title, recipe.cuisine, recipe.imageUrl]);

  const handleCopy = () => {
    const text = `${recipe.title}\n\nIngredients:\n${recipe.ingredients.join('\n')}\n\nInstructions:\n${recipe.instructions.join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: recipe.title,
      text: `Check out this delicious ${recipe.cuisine} recipe for ${recipe.title} on Pantry Chef!`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (err) {
        console.log("Share canceled or failed", err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group border border-gray-100 dark:border-slate-700">
      <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
        {imageLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-chef-orange" size={32} />
            <span className="text-xs text-gray-400 font-medium">Plating...</span>
          </div>
        ) : (
          <img 
            src={displayImage || ''} 
            alt={recipe.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        )}
        <div className="absolute top-0 right-0 p-2 flex gap-2">
          <button 
            onClick={() => onPin(recipe)}
            className={`p-2 rounded-full backdrop-blur-md transition-colors ${isPinned ? 'bg-chef-yellow text-white' : 'bg-white/30 text-white hover:bg-white/50'}`}
          >
            <Pin size={18} fill={isPinned ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-4 w-full">
          <span className="inline-block px-2 py-0.5 bg-chef-orange text-white text-[10px] font-bold rounded-full mb-1 uppercase tracking-wider">
            {recipe.cuisine}
          </span>
          <h3 className="text-white font-bold text-lg leading-tight truncate drop-shadow-md">{recipe.title}</h3>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-widest">
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-chef-orange" />
            <span>{recipe.prepTime}</span>
          </div>
          <div className="flex items-center gap-1 border-x px-3 border-gray-100 dark:border-slate-700">
            <Flame size={12} className="text-chef-orange" />
            <span>{recipe.calories || 'N/A'} kcal</span>
          </div>
          <div className="flex items-center gap-1">
            <ChefHat size={12} className="text-chef-orange" />
            <span>{recipe.difficulty || 'Medium'}</span>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
          {recipe.description}
        </p>

        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
           <div className="mb-4 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-900/20">
             <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-tight">Shopping List: {recipe.missingIngredients.slice(0,3).join(', ')}{recipe.missingIngredients.length > 3 ? '...' : ''}</p>
           </div>
        )}

        <div className="flex gap-2 border-t dark:border-slate-700 pt-3 mt-auto">
          <button 
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-all active:scale-95"
          >
            {copied ? <Check size={14} className="text-chef-green" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button 
             onClick={handleShare}
             className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all active:scale-95 rounded-xl ${shared ? 'bg-chef-green text-white' : 'text-chef-green bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20'}`}
          >
            {shared ? <Check size={14} /> : <Share2 size={14} />}
            {shared ? 'Shared!' : 'Share'}
          </button>
        </div>
        
        <details className="mt-3 text-xs text-gray-700 dark:text-gray-400">
            <summary className="cursor-pointer font-bold hover:text-chef-orange transition-colors list-none flex items-center gap-1">
                <span className="text-chef-orange">▶</span> Ingredients
            </summary>
            <ul className="list-disc pl-4 mt-2 space-y-1 border-l-2 border-chef-orange/20 ml-1">
                {recipe.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                ))}
            </ul>
        </details>
        
        <details className="mt-2 text-xs text-gray-700 dark:text-gray-400">
            <summary className="cursor-pointer font-bold hover:text-chef-orange transition-colors list-none flex items-center gap-1">
                <span className="text-chef-orange">▶</span> Method
            </summary>
            <ol className="list-decimal pl-4 mt-2 space-y-2 border-l-2 border-chef-yellow/20 ml-1">
                {recipe.instructions.map((step, i) => (
                    <li key={i} className="pl-1">{step}</li>
                ))}
            </ol>
        </details>
      </div>
    </div>
  );
};

export default RecipeCard;