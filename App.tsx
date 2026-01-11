import React, { useState, useEffect } from 'react';
import { Menu, Search, User as UserIcon, HelpCircle, X, ChevronRight, Pin as PinIcon, BookOpen, LogOut, AlertTriangle, CheckCircle2, ShoppingBasket, Sparkles, CameraOff } from 'lucide-react';
import InputSection from './components/InputSection';
import RecipeCard from './components/RecipeCard';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { suggestRecipes } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { Recipe, User, HistoryItem, Theme, SpoilageWarning } from './types';

const SUGGESTED_RECIPES: Recipe[] = [
  {
    id: 's1',
    title: 'Signature Butter Chicken',
    cuisine: 'Indian',
    description: 'A velvet-smooth tomato gravy with charred chicken thigh pieces, finished with a touch of fenugreek.',
    ingredients: ['Chicken Thighs', 'Butter', 'San Marzano Tomatoes', 'Heavy Cream', 'Kashmiri Chili'],
    instructions: ['Marinate chicken in yogurt and spices', 'Grill until charred', 'Simmer in tomato butter sauce', 'Garnish with cream'],
    prepTime: '45 mins',
    calories: '650',
    missingIngredients: [],
    difficulty: 'Medium',
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's2',
    title: 'Zesty Lemon Garlic Pasta',
    cuisine: 'Italian',
    description: 'Al dente linguine tossed in a vibrant emulsion of cold-pressed olive oil, toasted garlic, and fresh lemon zest.',
    ingredients: ['Linguine', 'Extra Virgin Olive Oil', 'Garlic', 'Lemon', 'Parsley', 'Red Pepper Flakes'],
    instructions: ['Boil pasta in salted water', 'Sauté garlic in oil until golden', 'Toss pasta with oil and lemon juice', 'Garnish with parsley'],
    prepTime: '15 mins',
    calories: '420',
    missingIngredients: [],
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's3',
    title: 'Mediterranean Quinoa Bowl',
    cuisine: 'Greek',
    description: 'A protein-packed bowl featuring fluffy quinoa, crisp cucumbers, and salty feta, drizzled with a balsamic glaze.',
    ingredients: ['Quinoa', 'Cucumber', 'Cherry Tomatoes', 'Feta Cheese', 'Balsamic Glaze'],
    instructions: ['Cook quinoa and let cool', 'Chop vegetables finely', 'Combine all ingredients in a bowl', 'Drizzle with glaze'],
    prepTime: '20 mins',
    calories: '380',
    missingIngredients: [],
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's4',
    title: 'Sesame Ginger Tofu Stir-fry',
    cuisine: 'Asian',
    description: 'Crispy tofu cubes tossed with vibrant snap peas and carrots in a savory, aromatic sesame-ginger reduction.',
    ingredients: ['Firm Tofu', 'Snap Peas', 'Carrots', 'Soy Sauce', 'Ginger', 'Sesame Oil'],
    instructions: ['Press and cube tofu', 'Fry tofu until golden and crispy', 'Stir-fry vegetables quickly', 'Toss with sauce'],
    prepTime: '25 mins',
    calories: '310',
    missingIngredients: [],
    difficulty: 'Medium',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  }
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<SpoilageWarning[]>([]);
  const [isUnclear, setIsUnclear] = useState(false);
  const [unclearMessage, setUnclearMessage] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pinnedRecipes, setPinnedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('activity');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) syncUser(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) syncUser(session.user);
      else { setUser(null); setHistory([]); setPinnedRecipes([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const syncUser = async (sbUser: any) => {
    const mappedUser: User = {
      id: sbUser.id,
      name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Chef',
      email: sbUser.email!,
      isPro: false,
      avatarUrl: sbUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${sbUser.email}&background=FF6B6B&color=fff`
    };
    setUser(mappedUser);
    fetchUserData(sbUser.id);
  };

  const fetchUserData = async (userId: string) => {
    const { data: historyData } = await supabase.from('history').select('*').eq('user_id', userId).order('timestamp', { ascending: false });
    if (historyData) {
      setHistory(historyData.map(h => ({ id: h.id, timestamp: new Date(h.timestamp).getTime(), queryType: h.query_type as any, queryPreview: h.query_preview, recipes: h.recipes })));
    }
    const { data: pinData } = await supabase.from('pinned_recipes').select('*').eq('user_id', userId);
    if (pinData) setPinnedRecipes(pinData.map(p => p.recipe_data));
  };

  const handleSearch = async (input: { text?: string; imageBase64?: string; mimeType?: string; audioBase64?: string }) => {
    setIsLoading(true);
    setRecipes([]);
    setDetectedIngredients([]);
    setWarnings([]);
    setIsUnclear(false);
    setUnclearMessage('');

    try {
      const result = await suggestRecipes(input);
      
      if (result.isUnclear) {
        setIsUnclear(true);
        setUnclearMessage(result.unclearMessage || "click pictures clearly so that the chef can give the recipe");
      } else {
        setRecipes(result.recipes);
        setDetectedIngredients(result.detectedIngredients);
        setWarnings(result.spoilageWarnings);

        const queryPreview = input.text || (input.imageBase64 ? 'Fridge Scan' : 'Voice Query');
        const queryType = input.imageBase64 ? 'image' : input.audioBase64 ? 'audio' : 'text';

        const newHistoryItem: HistoryItem = { id: Date.now().toString(), timestamp: Date.now(), queryType, queryPreview, recipes: result.recipes };
        setHistory(prev => [newHistoryItem, ...prev]);

        if (user && result.recipes.length > 0) {
          await supabase.from('history').insert({ user_id: user.id, query_type: queryType, query_preview: queryPreview, recipes: result.recipes, timestamp: new Date().toISOString() });
        }
      }
    } catch (error) {
      alert("Chef is busy! Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePin = async (recipe: Recipe) => {
    const isPinned = !!pinnedRecipes.find(r => r.id === recipe.id);
    if (isPinned) {
      setPinnedRecipes(prev => prev.filter(r => r.id !== recipe.id));
      if (user) await supabase.from('pinned_recipes').delete().match({ user_id: user.id }).filter('recipe_data->>id', 'eq', recipe.id);
    } else {
      setPinnedRecipes(prev => [...prev, recipe]);
      if (user) await supabase.from('pinned_recipes').insert({ user_id: user.id, recipe_data: recipe });
    }
  };

  return (
    <div className={`min-h-screen flex flex-col relative overflow-x-hidden ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-gray-50'}`}>
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-gray-100 dark:bg-slate-900/70 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setRecipes([]); setDetectedIngredients([]); setWarnings([]); setIsUnclear(false); }}>
            <div className="bg-chef-orange p-2 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform">
               <span className="text-2xl">🧑‍🍳</span>
            </div>
            <span className="font-black text-2xl tracking-tighter text-gray-800 dark:text-white">Pantry<span className="text-chef-orange">Chef</span></span>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setIsSettingsOpen(true)} className="p-3 text-gray-500 hover:bg-gray-100 rounded-2xl dark:hover:bg-slate-800 transition-all"><UserIcon size={22} /></button>
             {user ? (
               <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full border-2 border-white shadow-md cursor-pointer ml-2" onClick={() => setIsSettingsOpen(true)} />
             ) : (
               <button onClick={() => setIsAuthOpen(true)} className="bg-chef-dark dark:bg-chef-orange text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest ml-2">Sign In</button>
             )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative z-10">
        <aside className={`fixed lg:sticky top-20 left-0 h-[calc(100vh-80px)] w-80 bg-white/80 backdrop-blur-3xl border-r border-gray-100 dark:bg-slate-900/80 dark:border-slate-800 transform transition-transform duration-500 z-30 ${showHistorySidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="p-8 h-full flex flex-col overflow-y-auto scrollbar-hide">
            <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-[0.25em] mb-8">SEARCH HISTORY</h3>
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-40">
                <BookOpen size={48} className="text-gray-300 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-center">Your culinary history will appear here.</p>
              </div>
            ) : history.map(item => (
              <div key={item.id} onClick={() => { setRecipes(item.recipes); setDetectedIngredients([]); setWarnings([]); setIsUnclear(false); }} className="p-5 rounded-3xl bg-white dark:bg-slate-800 mb-4 border border-gray-100 dark:border-slate-700 hover:border-orange-200 transition-all cursor-pointer shadow-sm group">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                <p className="font-black text-sm text-gray-800 dark:text-gray-200 truncate group-hover:text-chef-orange transition-colors">{item.recipes[0]?.title || 'Chef Suggestion'}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-16 max-w-7xl mx-auto w-full">
           <div className={`text-center transition-all duration-1000 ${recipes.length > 0 || isLoading || isUnclear ? 'mb-12' : 'my-24'}`}>
              <h1 className="text-6xl md:text-8xl font-black mb-8 text-gray-900 dark:text-white tracking-tighter leading-[0.85]">
                Turn <span className="text-chef-orange italic">leftovers</span><br/>
                into <span className="text-transparent bg-clip-text bg-gradient-to-r from-chef-yellow via-chef-orange to-red-500">Gourmet meals.</span>
              </h1>
              <InputSection onSearch={handleSearch} isLoading={isLoading} />
           </div>

           {/* Unclear Image Warning */}
           {isUnclear && (
             <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
               <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-10 rounded-[40px] flex flex-col items-center text-center gap-6 shadow-xl shadow-amber-100/50 dark:shadow-none">
                  <div className="bg-amber-500 p-5 rounded-[24px] text-white shadow-lg shadow-amber-200 dark:shadow-none">
                    <CameraOff size={40} />
                  </div>
                  <div>
                    <h3 className="text-amber-900 dark:text-amber-100 text-2xl font-black mb-2 tracking-tight">Hazy Picture Detected</h3>
                    <p className="text-amber-800 dark:text-amber-400 font-bold text-lg italic">
                      "{unclearMessage}"
                    </p>
                  </div>
                  <button 
                    onClick={() => { setIsUnclear(false); setUnclearMessage(''); }}
                    className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-200 transition-colors"
                  >
                    Try Again
                  </button>
               </div>
             </div>
           )}

           {/* Identified Ingredients & Warnings */}
           {(detectedIngredients.length > 0 || warnings.length > 0) && !isUnclear && (
             <div className="mb-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
               {warnings.length > 0 && (
                 <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-6 rounded-[32px] flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="bg-red-500 p-3 rounded-2xl text-white shadow-lg shadow-red-200 dark:shadow-none">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h4 className="text-red-800 dark:text-red-400 font-black uppercase text-xs tracking-widest mb-1">Spoilage Warning</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {warnings.map((w, i) => (
                          <div key={i} className="text-sm font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
                            {w.item}: <span className="font-medium italic opacity-80">{w.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                 </div>
               )}

               {detectedIngredients.length > 0 && (
                 <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-gray-100 dark:border-slate-700 p-8 rounded-[40px] shadow-sm">
                   <div className="flex items-center gap-3 mb-6">
                      <ShoppingBasket className="text-chef-orange" size={20} />
                      <h4 className="text-gray-900 dark:text-white font-black uppercase text-xs tracking-[0.2em]">Identified Items</h4>
                   </div>
                   <div className="flex flex-wrap gap-3">
                     {detectedIngredients.map((ing, i) => (
                       <span key={i} className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-gray-200 dark:border-slate-600 shadow-sm transition-transform hover:scale-105">
                         {ing}
                       </span>
                     ))}
                   </div>
                   <p className="mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <CheckCircle2 size={12} className="text-chef-green" /> 
                     All recipes below strictly use only these ingredients.
                   </p>
                 </div>
               )}
             </div>
           )}

           {/* Search Results or Recommendations */}
           {recipes.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
               {recipes.map((recipe) => (
                 <RecipeCard key={recipe.id} recipe={recipe} onPin={togglePin} isPinned={!!pinnedRecipes.find(r => r.id === recipe.id)} />
               ))}
             </div>
           ) : !isLoading && !isUnclear && (
             <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
               <div className="flex items-center gap-4 mb-10">
                 <div className="p-3 bg-chef-yellow/20 text-chef-orange rounded-2xl">
                    <Sparkles size={24} />
                 </div>
                 <div>
                   <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Chef's Recommendations</h2>
                   <p className="text-sm font-medium text-gray-400">Discover trending recipes from around the globe.</p>
                 </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                 {SUGGESTED_RECIPES.map((recipe) => (
                   <RecipeCard key={recipe.id} recipe={recipe} onPin={togglePin} isPinned={!!pinnedRecipes.find(r => r.id === recipe.id)} />
                 ))}
               </div>
             </div>
           )}
        </main>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} history={history} onThemeChange={(t) => { if(t==='dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); setTheme(t as Theme); }} onSignOut={() => { supabase.auth.signOut(); setUser(null); }} initialTab={settingsTab} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onLogin={syncUser} />
    </div>
  );
}

export default App;