import React, { useState, useRef, useEffect } from 'react';
import { X, Activity, Palette, MessageSquare, CreditCard, Crown, LogOut, HelpCircle, ChevronRight, BookOpen, Shield, LifeBuoy, ArrowLeft, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { User, HistoryItem } from '../types';
import { getHelpContent, getSupportResponse } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  history: HistoryItem[];
  onThemeChange: (theme: string) => void;
  onSignOut: () => void;
  initialTab?: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user, history, onThemeChange, onSignOut, initialTab = 'activity' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Help Section State
  const [activeHelpTopic, setActiveHelpTopic] = useState<'guide' | 'privacy' | 'faq' | 'chat' | null>(null);
  const [helpContent, setHelpContent] = useState<string>('');
  const [isHelpLoading, setIsHelpLoading] = useState(false);
  
  // Feedback State
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setActiveHelpTopic(null);
    setFeedbackStatus('idle');
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (activeHelpTopic === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeHelpTopic]);

  const handleHelpClick = async (topic: 'guide' | 'privacy' | 'faq' | 'chat') => {
    setActiveHelpTopic(topic);
    
    if (topic === 'chat') {
      if (chatMessages.length === 0) {
        setChatMessages([{ role: 'model', text: "Hi there! I'm the Pantry Chef support bot. How can I help you today?" }]);
      }
      return;
    }

    setIsHelpLoading(true);
    setHelpContent('');
    try {
      const content = await getHelpContent(topic);
      setHelpContent(content);
    } catch (error) {
      setHelpContent("Sorry, we couldn't load this information right now.");
    } finally {
      setIsHelpLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    
    try {
      const response = await getSupportResponse(chatMessages, userMsg);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I lost connection to the server." }]);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);
    setFeedbackStatus('idle');

    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id || null,
        content: feedbackText,
        user_email: user?.email || 'Guest',
        timestamp: new Date().toISOString()
      });

      if (error) throw error;

      setFeedbackStatus('success');
      setFeedbackText('');
      // Reset success message after 3 seconds
      setTimeout(() => setFeedbackStatus('idle'), 3000);
    } catch (err) {
      console.error("Feedback submission error:", err);
      setFeedbackStatus('error');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'activity':
        return (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
            <h3 className="font-black text-2xl mb-6 text-gray-800 dark:text-white">Culinary Journey</h3>
            {history.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 dark:bg-slate-800/50 rounded-[40px] border border-dashed border-gray-200 dark:border-slate-700">
                <Activity className="mx-auto text-gray-300 dark:text-slate-600 mb-4" size={56} />
                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">No history found</p>
              </div>
            ) : (
              history.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-5 hover:shadow-md transition-all group cursor-pointer">
                  <div className="w-14 h-14 bg-chef-orange/10 text-chef-orange rounded-2xl flex items-center justify-center shrink-0 text-2xl group-hover:scale-110 transition-transform">
                    {item.queryType === 'image' ? '📸' : item.queryType === 'audio' ? '🎤' : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800 dark:text-white truncate text-lg">{item.recipes[0]?.title || 'Chef Suggestion'}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">{new Date(item.timestamp).toLocaleDateString()} • {item.recipes.length} Recipes</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-chef-orange transition-colors" />
                </div>
              ))
            )}
          </div>
        );
      case 'help':
        if (activeHelpTopic) {
           return (
             <div className="h-full flex flex-col">
               <button 
                 onClick={() => setActiveHelpTopic(null)} 
                 className="flex items-center gap-2 text-gray-500 hover:text-chef-orange mb-6 font-black text-xs uppercase tracking-widest transition-colors self-start"
               >
                 <ArrowLeft size={16} /> Back to Centre
               </button>
               
               {activeHelpTopic === 'chat' ? (
                 <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-[40px] overflow-hidden">
                   <div className="flex-1 overflow-y-auto p-6 space-y-5">
                     {chatMessages.map((msg, i) => (
                       <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-chef-orange text-white rounded-br-none shadow-lg shadow-orange-100' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-bl-none shadow-sm'}`}>
                           {msg.text}
                         </div>
                       </div>
                     ))}
                     <div ref={chatEndRef} />
                   </div>
                   <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex gap-3">
                     <input 
                       value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                       placeholder="Ask about cooking tips..."
                       className="flex-1 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-chef-orange/50 outline-none text-sm dark:text-white"
                     />
                     <button 
                       onClick={handleSendMessage}
                       className="p-3 bg-chef-orange text-white rounded-2xl hover:bg-red-500 transition-all active:scale-90 shadow-lg shadow-orange-100"
                     >
                       <Send size={20} />
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-8 rounded-[40px] shadow-sm h-full overflow-y-auto">
                   {isHelpLoading ? (
                     <div className="flex flex-col items-center justify-center h-64 gap-4">
                       <Loader2 className="animate-spin text-chef-orange" size={40} />
                       <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Intelligence...</span>
                     </div>
                   ) : (
                     <div className="prose prose-orange dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                       <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">
                         {activeHelpTopic === 'faq' ? 'FAQ' : activeHelpTopic === 'guide' ? 'User Guide' : 'Privacy'}
                       </h3>
                       <div className="whitespace-pre-wrap leading-relaxed font-medium">
                         {helpContent}
                       </div>
                     </div>
                   )}
                 </div>
               )}
             </div>
           );
        }

        return (
          <div className="space-y-6">
            <h3 className="font-black text-2xl mb-6 text-gray-800 dark:text-white">Chef Support</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {id: 'guide', icon: BookOpen, color: 'blue', label: 'User Guides', text: 'Master the AI Chef tools.'},
                {id: 'chat', icon: LifeBuoy, color: 'green', label: 'Culinary Chat', text: 'Direct help for cooks.'},
                {id: 'privacy', icon: Shield, color: 'purple', label: 'Data Safety', text: 'How we protect your fridge.'},
                {id: 'faq', icon: MessageSquare, color: 'orange', label: 'Top Questions', text: 'Quick fixes and tips.'}
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => handleHelpClick(item.id as any)}
                  className={`p-6 bg-${item.color}-50 dark:bg-${item.color}-950/10 rounded-3xl border border-${item.color}-100 dark:border-${item.color}-900/20 flex flex-col gap-3 text-left hover:scale-[1.03] active:scale-95 transition-all group`}
                >
                  <item.icon className={`text-${item.color}-500 group-hover:scale-110 transition-transform`} size={28} />
                  <h4 className={`font-black text-${item.color}-900 dark:text-${item.color}-200 text-lg`}>{item.label}</h4>
                  <p className={`text-xs text-${item.color}-700/70 dark:text-${item.color}-400/60 font-medium`}>{item.text}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case 'theme':
        return (
          <div className="space-y-6">
            <h3 className="font-black text-2xl text-gray-800 dark:text-white">Interface</h3>
            <div className="grid grid-cols-2 gap-8">
              <button 
                onClick={() => onThemeChange('light')} 
                className="group p-3 bg-gray-50 dark:bg-slate-800 rounded-[40px] border-2 transition-all hover:scale-[1.02] active:scale-95 border-transparent focus:border-chef-orange"
              >
                <div className="w-full h-40 bg-white rounded-3xl border shadow-sm mb-4"></div>
                <span className="font-black uppercase tracking-widest text-xs text-gray-700 dark:text-gray-300">Light Mode</span>
              </button>
              <button 
                onClick={() => onThemeChange('dark')} 
                className="group p-3 bg-gray-50 dark:bg-slate-800 rounded-[40px] border-2 transition-all hover:scale-[1.02] active:scale-95 border-transparent focus:border-chef-orange"
              >
                <div className="w-full h-40 bg-slate-900 rounded-3xl border-slate-700 shadow-sm mb-4"></div>
                <span className="font-black uppercase tracking-widest text-xs text-gray-700 dark:text-gray-300">Dark Mode</span>
              </button>
            </div>
          </div>
        );
      case 'feedback':
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <h3 className="font-black text-2xl text-gray-800 dark:text-white">Give Feedback</h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Help us shape the future of zero-waste cooking.</p>
            
            <div className="relative">
              <textarea 
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                disabled={isSubmittingFeedback || feedbackStatus === 'success'}
                className="w-full p-6 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-3xl h-48 resize-none focus:ring-2 focus:ring-chef-orange focus:border-transparent transition-all dark:text-white font-medium disabled:opacity-50" 
                placeholder="What features should we add next? Any bugs?"
              ></textarea>
              
              {feedbackStatus === 'success' && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                  <CheckCircle2 className="text-chef-green mb-2" size={48} />
                  <p className="text-chef-green font-black uppercase tracking-[0.2em] text-sm">Review Received!</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Thank you for your help.</p>
                </div>
              )}
            </div>

            {feedbackStatus === 'error' && (
              <p className="text-red-500 text-xs font-bold animate-pulse">Failed to send review. Please try again.</p>
            )}

            <button 
              onClick={handleSubmitFeedback}
              disabled={isSubmittingFeedback || !feedbackText.trim() || feedbackStatus === 'success'}
              className={`font-black py-5 rounded-3xl w-full shadow-xl transition-all active:scale-[0.98] uppercase tracking-widest text-sm flex items-center justify-center gap-3 ${
                feedbackText.trim() && !isSubmittingFeedback
                ? 'bg-chef-orange text-white hover:bg-red-500 shadow-orange-100 dark:shadow-none' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmittingFeedback ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Review</span>
              )}
            </button>
          </div>
        );
      case 'pro':
        return (
          <div className="bg-gradient-to-br from-chef-yellow via-chef-orange to-red-500 p-10 rounded-[40px] text-center relative overflow-hidden shadow-2xl shadow-orange-100">
             <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 scale-150">
               <Crown size={120} />
             </div>
             <div className="relative z-10">
               <div className="bg-white/20 backdrop-blur-xl w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/30">
                 <Crown size={52} className="text-white drop-shadow-lg" />
               </div>
               <h3 className="font-black text-4xl text-white mb-3 tracking-tighter">Chef Pro</h3>
               <p className="text-white/90 mb-10 font-bold uppercase tracking-widest text-xs">Unlock Infinite Possibilities</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
                 {[
                   {icon: "⚡", text: "Instant AI Results"},
                   {icon: "📊", text: "Full Nutrition Facts"},
                   {icon: "🗓️", text: "Meal Planner"},
                   {icon: "🎨", text: "HD Food Pics"}
                 ].map((item, i) => (
                   <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                     <span className="text-xl">{item.icon}</span> 
                     <span className="font-black text-white text-[10px] uppercase tracking-widest text-left">{item.text}</span>
                   </div>
                 ))}
               </div>
               <button className="w-full bg-white text-chef-orange py-5 rounded-3xl font-black shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-sm">
                 Upgrade for $4.99/mo
               </button>
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[750px] rounded-[50px] shadow-3xl flex overflow-hidden border border-white/20 dark:border-slate-800">
        {/* Sidebar */}
        <div className="w-80 bg-gray-50 dark:bg-slate-950/50 border-r border-gray-100 dark:border-slate-800 p-10 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="bg-chef-orange p-2 rounded-2xl text-white shadow-lg shadow-orange-200 dark:shadow-none">
                <span className="text-2xl">🧑‍🍳</span>
              </div>
              <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tighter">Settings</h2>
            </div>
            <nav className="space-y-3">
              {[
                {id: 'activity', label: 'Activity', icon: Activity},
                {id: 'help', label: 'Help Centre', icon: HelpCircle},
                {id: 'theme', label: 'Theme', icon: Palette},
                {id: 'feedback', label: 'Feedback', icon: MessageSquare},
                {id: 'pro', label: 'Chef Pro', icon: Crown, special: true},
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id !== 'help') setActiveHelpTopic(null);
                  }} 
                  className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all font-black text-xs uppercase tracking-[0.2em] ${
                    activeTab === tab.id 
                      ? tab.special 
                        ? 'bg-gradient-to-r from-chef-yellow to-chef-orange text-white shadow-xl shadow-orange-100 dark:shadow-none' 
                        : 'bg-white dark:bg-slate-800 shadow-xl shadow-gray-100 dark:shadow-none text-chef-orange' 
                      : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <tab.icon size={22} /> {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="space-y-6">
            <div className="p-5 bg-white dark:bg-slate-800 rounded-[32px] border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-4">
                <img src={user?.avatarUrl || 'https://ui-avatars.com/api/?name=User'} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="Avatar" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-800 dark:text-white truncate">{user?.name || 'Guest User'}</p>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{user?.isPro ? 'Pro Active' : 'Basic Plan'}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => { onSignOut(); onClose(); }}
              className="flex items-center gap-3 text-red-500 hover:text-red-600 font-black text-xs uppercase tracking-[0.2em] w-full px-5 transition-all group active:scale-95"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> Sign Out
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-12 relative bg-white dark:bg-slate-900 overflow-y-auto scrollbar-hide">
          <button onClick={onClose} className="absolute top-10 right-10 p-4 rounded-3xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all text-gray-400 active:scale-90 z-10">
            <X size={28} />
          </button>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;