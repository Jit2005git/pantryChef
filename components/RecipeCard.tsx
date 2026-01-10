import React, { useState, useEffect, useRef } from 'react';
import { Recipe } from '../types';
import { 
  Share2, Copy, Pin, Clock, Flame, ChefHat, 
  Loader2, Check, TrendingUp, MessageCircle, 
  Send as TelegramIcon, Mail, Smartphone, X 
} from 'lucide-react';
import { generateRecipeImage } from '../services/geminiService';

interface RecipeCardProps {
  recipe: Recipe;
  onPin: (recipe: Recipe) => void;
  isPinned?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onPin, isPinned }) => {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [displayImage, setDisplayImage] = useState<string | null>(recipe.imageUrl || null);
  const [imageLoading, setImageLoading] = useState(!recipe.imageUrl);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    if (!recipe.imageUrl) {
      setImageLoading(true);
      generateRecipeImage(recipe.title, recipe.cuisine).then(url => {
        if (isMounted && url) {
          setDisplayImage(url);
          setImageLoading(false);
        } else if (isMounted) {
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareMenu]);

  const getShareText = () => {
    const ingredients = recipe.ingredients.map(i => `• ${i}`).join('\n');
    const instructions = recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n');
    return `Check out this ${recipe.cuisine} recipe: *${recipe.title}*\n\nIngredients:\n${ingredients}\n\nInstructions:\n${instructions}\n\nShared via Pantry Chef 🧑‍🍳`;
  };

  const handleCopy = () => {
    const text = getShareText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareVia = (platform: 'whatsapp' | 'telegram' | 'email' | 'sms') => {
    const text = getShareText();
    const url = window.location.href;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);

    let shareUrl = '';
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}`;
        window.open(shareUrl, '_blank');
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        window.open(shareUrl, '_blank');
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent('Recipe: ' + recipe.title)}&body=${encodedText}`;
        window.location.href = shareUrl;
        break;
      case 'sms':
        // Some mobile OS require & instead of ? for the body parameter
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        shareUrl = `sms:${isIOS ? '&' : '?'}body=${encodedText}`;
        window.location.href = shareUrl;
        break;
    }

    setShowShareMenu(false);
  };

  const calValue = parseInt(recipe.calories || '0');
  const calColor = calValue > 700 ? 'bg-red-500' : calValue > 400 ? 'bg-chef-orange' : 'bg-chef-green';
  const calWidth = Math.min((calValue / 1000) * 100, 100);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group border border-gray-100 dark:border-slate-700 h-full flex flex-col relative">
      <div className="relative h-48 sm:h-52 overflow-hidden bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
        {imageLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-chef-orange" size={32} />
            <span className="text-xs text-gray-400 font-medium">Plating...</span>
          </div>
        ) : (
          <img 
            src={displayImage || ''} 
            alt={recipe.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          />
        )}
        
        <div className="absolute top-0 right-0 p-3 flex gap-2">
          <button 
            onClick={() => onPin(recipe)}
            className={`p-2 rounded-full backdrop-blur-md transition-all ${isPinned ? 'bg-chef-yellow text-white shadow-lg' : 'bg-white/30 text-white hover:bg-white/50'}`}
          >
            <Pin size={18} fill={isPinned ? "currentColor" : "none"} />
          </button>
        </div>
        
        <div className="absolute bottom-0 left-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 w-full">
          <span className="inline-block px-3 py-1 bg-chef-orange text-white text-[10px] font-black rounded-full mb-2 uppercase tracking-widest shadow-sm">
            {recipe.cuisine}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-chef-orange" />
              <span className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-tighter">
                {recipe.calories || 'N/A'} <span className="text-gray-400">KCAL</span>
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full transition-all duration-1000 ${calColor}`} 
                style={{ width: `${calWidth}%` }}
              ></div>
            </div>
          </div>
          <div className="pl-4 text-right">
             <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Intensity</span>
             <span className={`text-[10px] font-black uppercase ${calColor.replace('bg-', 'text-')}`}>
                {calValue > 700 ? 'High' : calValue > 400 ? 'Moderate' : 'Light'}
             </span>
          </div>
        </div>

        <h3 className="text-gray-900 dark:text-white font-black text-lg sm:text-xl leading-tight mb-3 group-hover:text-chef-orange transition-colors">
          {recipe.title}
        </h3>

        <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 dark:text-gray-500 mb-5 uppercase tracking-[0.15em] border-y border-gray-50 dark:border-slate-700 py-2 sm:py-3">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-chef-orange" />
            <span>{recipe.prepTime}</span>
          </div>
          <div className="flex items-center gap-2 border-l pl-4 border-gray-100 dark:border-slate-700">
            <ChefHat size={12} className="text-chef-orange" />
            <span>{recipe.difficulty || 'Medium'}</span>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed font-medium italic">
          "{recipe.description}"
        </p>

        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
           <div className="mb-6 bg-red-50/50 dark:bg-red-900/10 p-3 rounded-2xl border border-red-100 dark:border-red-900/20">
             <p className="text-[9px] text-red-600 dark:text-red-400 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                <TrendingUp size={10} /> Shopping Required
             </p>
             <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                {recipe.missingIngredients.join(', ')}
             </p>
           </div>
        )}

        <div className="mt-auto flex gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-slate-700 relative">
          <button 
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-700 rounded-xl sm:rounded-2xl hover:bg-chef-orange hover:text-white transition-all active:scale-95 shadow-sm"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="hidden xs:inline">{copied ? 'Copied' : 'Copy'}</span>
            <span className="xs:hidden">{copied ? '✓' : 'Copy'}</span>
          </button>
          
          <button 
             onClick={() => setShowShareMenu(!showShareMenu)}
             className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 rounded-xl sm:rounded-2xl shadow-sm ${showShareMenu ? 'bg-chef-green text-white' : 'text-chef-green bg-green-50 dark:bg-green-900/10 hover:bg-chef-green hover:text-white'}`}
          >
            <Share2 size={14} />
            <span className="hidden xs:inline">Share</span>
            <span className="xs:hidden">Share</span>
          </button>

          {/* Floating Share Menu */}
          {showShareMenu && (
            <div 
              ref={menuRef}
              className="absolute bottom-full left-0 right-0 mb-4 bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-gray-100 dark:border-slate-700 p-2 z-20 flex justify-around animate-in slide-in-from-bottom-2 fade-in duration-200"
            >
              <button onClick={() => shareVia('whatsapp')} className="p-4 rounded-2xl hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 transition-all active:scale-90" title="WhatsApp">
                <MessageCircle size={24} />
              </button>
              <button onClick={() => shareVia('telegram')} className="p-4 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-all active:scale-90" title="Telegram">
                <TelegramIcon size={24} />
              </button>
              <button onClick={() => shareVia('email')} className="p-4 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all active:scale-90" title="Email">
                <Mail size={24} />
              </button>
              <button onClick={() => shareVia('sms')} className="p-4 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500 transition-all active:scale-90" title="Message/SMS">
                <Smartphone size={24} />
              </button>
              <button onClick={() => setShowShareMenu(false)} className="p-4 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-all active:scale-90" title="Close">
                <X size={24} />
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-4 space-y-1">
          <details className="text-xs text-gray-700 dark:text-gray-400 group/details">
              <summary className="cursor-pointer font-black uppercase tracking-widest text-[9px] text-gray-400 hover:text-chef-orange transition-colors list-none flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                  <span>Ingredients</span>
                  <span className="text-chef-orange group-open/details:rotate-90 transition-transform">▶</span>
              </summary>
              <ul className="list-disc pl-5 mt-2 space-y-1 border-l-2 border-chef-orange/20 ml-2 py-1 font-medium text-[11px]">
                  {recipe.ingredients.map((ing, i) => (
                      <li key={i}>{ing}</li>
                  ))}
              </ul>
          </details>
          
          <details className="text-xs text-gray-700 dark:text-gray-400 group/details">
              <summary className="cursor-pointer font-black uppercase tracking-widest text-[9px] text-gray-400 hover:text-chef-orange transition-colors list-none flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">
                  <span>Steps</span>
                  <span className="text-chef-orange group-open/details:rotate-90 transition-transform">▶</span>
              </summary>
              <ol className="list-decimal pl-5 mt-2 space-y-2 border-l-2 border-chef-yellow/20 ml-2 py-1 font-medium text-[11px]">
                  {recipe.instructions.map((step, i) => (
                      <li key={i} className="pl-1">{step}</li>
                  ))}
              </ol>
          </details>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;