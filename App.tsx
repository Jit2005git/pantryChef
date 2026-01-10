import React, { useState, useEffect } from 'react';
import { Menu, Search, User as UserIcon, HelpCircle, X, ChevronRight, Pin as PinIcon, BookOpen, LogOut } from 'lucide-react';
import InputSection from './components/InputSection';
import RecipeCard from './components/RecipeCard';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { suggestRecipes } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { Recipe, User, HistoryItem, Theme } from './types';

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
    title: 'Artisan Avocado Sourdough',
    cuisine: 'Western',
    description: 'Whipped hass avocado on toasted sourdough with a soft-boiled organic egg and chili oil.',
    ingredients: ['Sourdough Bread', 'Hass Avocado', 'Organic Egg', 'Aleppo Pepper', 'Lemon'],
    instructions: ['Toast thick sourdough slices', 'Mash avocado with lemon and sea salt', 'Soft boil egg for 6.5 mins', 'Assemble and drizzle chili oil'],
    prepTime: '15 mins',
    calories: '320',
    missingIngredients: [],
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 's3',
    title: 'Spiced Paneer Skewers',
    cuisine: 'Indian',
    description: 'Charcoal-grilled cottage cheese cubes marinated in a robust tandoori masala with bell peppers.',
    ingredients: ['Paneer', 'Greek Yogurt', 'Red Onion', 'Green Capsicum', 'Garam Masala'],
    instructions: ['Cut paneer and veg into cubes', 'Marinate in spiced yogurt for 2 hours', 'Skewer and grill over high heat', 'Serve with mint chutney'],
    prepTime: '40 mins',
    calories: '450',
    missingIngredients: [],
    difficulty: 'Medium',
    imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c175f0?auto=format&fit=crop&w=800&q=80'
  }
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pinnedRecipes, setPinnedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('activity');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);

  // Supabase Auth Listener & Initial Data Fetch
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncUser(session.user);
      } else {
        setUser(null);
        setHistory([]);
        setPinnedRecipes([]);
      }
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
    // Fetch History
    const { data: historyData } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (historyData) {
      setHistory(historyData.map(h => ({
        id: h.id,
        timestamp: new Date(h.timestamp).getTime(),
        queryType: h.query_type as any,
        queryPreview: h.query_preview,
        recipes: h.recipes
      })));
    }

    // Fetch Pins
    const { data: pinData } = await supabase
      .from('pinned_recipes')
      .select('*')
      .eq('user_id', userId);
    
    if (pinData) {
      setPinnedRecipes(pinData.map(p => p.recipe_data));
    }
  };

  const openSettings = (tab = 'activity') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const handleSearch = async (input: { text?: string; imageBase64?: string; mimeType?: string; audioBase64?: string }) => {
    setIsLoading(true);
    setRecipes([]);

    try {
      const generatedRecipes = await suggestRecipes(input);
      setRecipes(generatedRecipes);

      const queryPreview = input.text || (input.imageBase64 ? 'Fridge Scan' : 'Voice Query');
      const queryType = input.imageBase64 ? 'image' : input.audioBase64 ? 'audio' : 'text';

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        queryType,
        queryPreview,
        recipes: generatedRecipes
      };
      
      setHistory(prev => [newHistoryItem, ...prev]);

      // Save to Supabase if logged in
      if (user) {
        await supabase.from('history').insert({
          user_id: user.id,
          query_type: queryType,
          query_preview: queryPreview,
          recipes: generatedRecipes,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      alert("Chef is busy! Please try your query again.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePin = async (recipe: Recipe) => {
    const isPinned = !!pinnedRecipes.find(r => r.id === recipe.id);
    
    if (isPinned) {
      setPinnedRecipes(prev => prev.filter(r => r.id !== recipe.id));
      if (user) {
        // Find the record and delete by recipe id inside the recipe_data json
        await supabase.from('pinned_recipes').delete().match({ user_id: user.id }).filter('recipe_data->>id', 'eq', recipe.id);
      }
    } else {
      setPinnedRecipes(prev => [...prev, recipe]);
      if (user) {
        await supabase.from('pinned_recipes').insert({
          user_id: user.id,
          recipe_data: recipe
        });
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHistory([]);
    setPinnedRecipes([]);
    setRecipes([]);
    setIsSettingsOpen(false);
  };

  const handleThemeChange = (t: string) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setTheme(t as Theme);
  };

  return (
    <div className={`min-h-screen flex flex-col relative overflow-x-hidden ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-gray-50'}`}>
      
      <div className="fixed inset-0 z-0 pointer-events-none">
         <img 
           src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1920&q=80" 
           className="w-full h-full object-cover opacity-[0.03] dark:opacity-[0.05]"
           alt="background texture"
         />
      </div>

      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-gray-100 dark:bg-slate-900/70 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setRecipes([]); setShowHistorySidebar(false); }}>
            <div className="bg-chef-orange p-2 rounded-2xl text-white shadow-lg shadow-orange-200 dark:shadow-none group-hover:scale-110 transition-transform">
               <span className="text-2xl">🧑‍🍳</span>
            </div>
            <span className="font-black text-2xl tracking-tighter text-gray-800 dark:text-white">Pantry<span className="text-chef-orange">Chef</span></span>
          </div>
          
          <div className="flex items-center gap-2">
             <button 
               onClick={() => openSettings('help')}
               className="hidden md:flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-chef-orange hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-xl transition-all"
             >
                <HelpCircle size={18} />
                <span>Support</span>
             </button>

             <button 
               onClick={() => openSettings('activity')}
               className="p-3 text-gray-500 hover:bg-gray-100 rounded-2xl dark:hover:bg-slate-800 transition-all group"
               title="Settings"
             >
                <UserIcon size={22} className="group-hover:scale-110 transition-transform" />
             </button>
             
             {user ? (
               <div className="flex items-center gap-3 pl-4 border-l border-gray-100 dark:border-slate-800 ml-2">
                 <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform" onClick={() => openSettings('activity')} />
                 <div className="hidden sm:flex flex-col">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Active Chef</p>
                   <p className="text-sm font-black leading-none">{user.name.split(' ')[0]}</p>
                 </div>
                 <button onClick={handleSignOut} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Sign Out">
                    <LogOut size={18} />
                 </button>
               </div>
             ) : (
               <button 
                 onClick={() => setIsAuthOpen(true)}
                 className="bg-chef-dark dark:bg-chef-orange text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-xl transition-all active:scale-95 ml-2"
               >
                 Sign In
               </button>
             )}

             <button 
               className="lg:hidden p-3 ml-1"
               onClick={() => setShowHistorySidebar(!showHistorySidebar)}
             >
                <Menu size={24} />
             </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative z-10">
        <aside className={`
            fixed lg:sticky top-20 left-0 h-[calc(100vh-80px)] w-80 bg-white/80 backdrop-blur-3xl border-r border-gray-100 dark:bg-slate-900/80 dark:border-slate-800
            transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-30
            ${showHistorySidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-8 h-full flex flex-col">
            <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-[0.25em] mb-8 flex items-center gap-3">
               <div className="w-1 h-4 bg-chef-orange rounded-full"></div> SEARCH HISTORY
            </h3>
            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-slate-700">
                    <BookOpen size={24} className="text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400 font-black uppercase tracking-widest px-8">
                    {user ? 'No records yet.' : 'Sign in to sync.'}
                  </p>
                </div>
              ) : (
                history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => { setRecipes(item.recipes); if(window.innerWidth < 1024) setShowHistorySidebar(false); }} 
                    className="p-5 rounded-3xl bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/20 cursor-pointer border border-gray-100 dark:border-slate-700 hover:border-orange-200 transition-all group shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                       <ChevronRight size={14} className="text-gray-300 group-hover:text-chef-orange transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="font-black text-sm text-gray-800 truncate dark:text-gray-200">
                      {item.recipes[0]?.title || 'Chef Suggestion'}
                    </p>
                  </div>
                ))
              )}
            </div>
            
            {pinnedRecipes.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-slate-800">
                  <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-[0.25em] mb-6 flex items-center gap-3">
                    <div className="w-1 h-4 bg-chef-yellow rounded-full"></div> PINNED COLLECTION
                  </h3>
                  <div className="space-y-3">
                     {pinnedRecipes.slice(0, 5).map(recipe => (
                        <div key={recipe.id} onClick={() => setRecipes([recipe])} className="group flex items-center justify-between gap-4 text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl hover:bg-chef-yellow/10 transition-all cursor-pointer border border-transparent hover:border-chef-yellow/20">
                           <div className="flex items-center gap-3 truncate">
                             <div className="w-2 h-2 rounded-full bg-chef-yellow shadow-sm shadow-chef-yellow shrink-0"></div>
                             <span className="truncate">{recipe.title}</span>
                           </div>
                           <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                        </div>
                     ))}
                  </div>
                </div>
            )}
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-16 max-w-7xl mx-auto w-full relative">
           <div className={`text-center transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${recipes.length > 0 ? 'mb-16' : 'my-24'}`}>
              <h1 className="text-6xl md:text-8xl font-black mb-8 text-gray-900 dark:text-white tracking-tighter leading-[0.85]">
                Turn <span className="text-chef-orange italic">leftovers</span><br/>
                into <span className="text-transparent bg-clip-text bg-gradient-to-r from-chef-yellow via-chef-orange to-red-500">Gourmet meals.</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-500 mb-12 max-w-2xl mx-auto dark:text-gray-400 font-medium leading-relaxed">
                Scan your fridge or list your ingredients. Our AI turns your leftovers into professional-grade culinary delights in seconds.
              </p>
              <InputSection onSearch={handleSearch} isLoading={isLoading} />
           </div>

           {recipes.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-12 duration-700">
               {recipes.map((recipe) => (
                 <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    onPin={togglePin}
                    isPinned={!!pinnedRecipes.find(r => r.id === recipe.id)}
                 />
               ))}
             </div>
           ) : (
             !isLoading && (
               <div className="mt-24">
                 <div className="flex items-center justify-between mb-10">
                   <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-4">
                     <span className="bg-orange-100 dark:bg-orange-950/40 p-3 rounded-[24px]">🔥</span> Trending Now
                   </h2>
                   <button onClick={() => openSettings('help')} className="text-xs font-black uppercase tracking-widest text-chef-orange hover:underline decoration-2 underline-offset-4">Explore More</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                   {SUGGESTED_RECIPES.map((recipe) => (
                      <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        onPin={togglePin}
                        isPinned={!!pinnedRecipes.find(r => r.id === recipe.id)}
                      />
                   ))}
                 </div>
               </div>
             )
           )}
        </main>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        user={user}
        history={history}
        onThemeChange={handleThemeChange}
        onSignOut={handleSignOut}
        initialTab={settingsTab}
      />

      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={syncUser}
      />
    </div>
  );
}

export default App;