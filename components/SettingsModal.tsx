import React, { useState, useRef, useEffect } from 'react';
import { X, Activity, Palette, MessageSquare, CreditCard, Crown, LogOut, HelpCircle, ChevronRight, BookOpen, Shield, LifeBuoy, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { User, HistoryItem } from '../types';
import { getHelpContent, getSupportResponse } from '../services/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  history: HistoryItem[];
  onThemeChange: (theme: string) => void;
  initialTab?: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user, history, onThemeChange, initialTab = 'activity' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Help Section State
  const [activeHelpTopic, setActiveHelpTopic] = useState<'guide' | 'privacy' | 'faq' | 'chat' | null>(null);
  const [helpContent, setHelpContent] = useState<string>('');
  const [isHelpLoading, setIsHelpLoading] = useState(false);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setActiveHelpTopic(null);
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
      // Simulate network delay for realism
      const response = await getSupportResponse(chatMessages, userMsg);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I lost connection to the server." }]);
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'activity':
        return (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
            <h3 className="font-bold text-2xl mb-4 text-gray-800">Your Activity</h3>
            {history.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <Activity className="mx-auto text-gray-300 mb-2" size={48} />
                <p className="text-gray-500 font-medium">No recent culinary adventures yet.</p>
              </div>
            ) : (
              history.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-chef-orange/10 text-chef-orange rounded-2xl flex items-center justify-center shrink-0 text-xl">
                    {item.queryType === 'image' ? '📸' : item.queryType === 'audio' ? '🎤' : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{item.recipes[0]?.title || 'Unknown Recipe'}</p>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{new Date(item.timestamp).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
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
                 className="flex items-center gap-2 text-gray-500 hover:text-chef-orange mb-4 font-bold text-sm transition-colors self-start"
               >
                 <ArrowLeft size={16} /> Back to Help Centre
               </button>
               
               {activeHelpTopic === 'chat' ? (
                 <div className="flex-1 flex flex-col bg-gray-50 border border-gray-200 rounded-3xl overflow-hidden">
                   <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {chatMessages.map((msg, i) => (
                       <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-chef-orange text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none'}`}>
                           {msg.text}
                         </div>
                       </div>
                     ))}
                     <div ref={chatEndRef} />
                   </div>
                   <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
                     <input 
                       value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                       placeholder="Type your question..."
                       className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-chef-orange/50 outline-none text-sm"
                     />
                     <button 
                       onClick={handleSendMessage}
                       className="p-2 bg-chef-orange text-white rounded-xl hover:bg-red-500 transition-colors"
                     >
                       <Send size={18} />
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm h-full overflow-y-auto">
                   {isHelpLoading ? (
                     <div className="flex flex-col items-center justify-center h-40 gap-3">
                       <Loader2 className="animate-spin text-chef-orange" size={32} />
                       <span className="text-gray-400 text-sm">Fetching content from backend...</span>
                     </div>
                   ) : (
                     <div className="prose prose-orange max-w-none text-gray-600">
                       <h3 className="text-2xl font-bold text-gray-800 mb-4 capitalize">
                         {activeHelpTopic === 'faq' ? 'Frequently Asked Questions' : activeHelpTopic === 'guide' ? 'User Guide' : 'Privacy & Safety'}
                       </h3>
                       <div className="whitespace-pre-wrap leading-relaxed">
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
            <h3 className="font-bold text-2xl mb-4 text-gray-800">Help Centre</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => handleHelpClick('guide')}
                className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col gap-2 text-left hover:scale-[1.02] active:scale-95 transition-all group"
              >
                <BookOpen className="text-blue-500 group-hover:scale-110 transition-transform" size={24} />
                <h4 className="font-bold text-blue-900">User Guides</h4>
                <p className="text-xs text-blue-700/70">Learn how to make the most of our AI Chef and waste less food.</p>
                <span className="text-xs font-bold text-blue-600 mt-2 flex items-center gap-1 group-hover:underline">Read Guide <ChevronRight size={12}/></span>
              </button>
              
              <button 
                onClick={() => handleHelpClick('chat')}
                className="p-5 bg-green-50 rounded-2xl border border-green-100 flex flex-col gap-2 text-left hover:scale-[1.02] active:scale-95 transition-all group"
              >
                <LifeBuoy className="text-green-500 group-hover:scale-110 transition-transform" size={24} />
                <h4 className="font-bold text-green-900">Support Chat</h4>
                <p className="text-xs text-green-700/70">Connect with our culinary support team for technical help.</p>
                <span className="text-xs font-bold text-green-600 mt-2 flex items-center gap-1 group-hover:underline">Start Chat <ChevronRight size={12}/></span>
              </button>
              
              <button 
                onClick={() => handleHelpClick('privacy')}
                className="p-5 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col gap-2 text-left hover:scale-[1.02] active:scale-95 transition-all group"
              >
                <Shield className="text-purple-500 group-hover:scale-110 transition-transform" size={24} />
                <h4 className="font-bold text-purple-900">Privacy & Safety</h4>
                <p className="text-xs text-purple-700/70">Information on how we handle your data and ingredient safety.</p>
                <span className="text-xs font-bold text-purple-600 mt-2 flex items-center gap-1 group-hover:underline">Learn More <ChevronRight size={12}/></span>
              </button>
              
              <button 
                onClick={() => handleHelpClick('faq')}
                className="p-5 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col gap-2 text-left hover:scale-[1.02] active:scale-95 transition-all group"
              >
                <MessageSquare className="text-orange-500 group-hover:scale-110 transition-transform" size={24} />
                <h4 className="font-bold text-orange-900">FAQs</h4>
                <p className="text-xs text-orange-700/70">Quick answers to common questions about recipes and pro features.</p>
                <span className="text-xs font-bold text-orange-600 mt-2 flex items-center gap-1 group-hover:underline">See FAQs <ChevronRight size={12}/></span>
              </button>
            </div>
          </div>
        );
      case 'theme':
        return (
          <div className="space-y-6">
            <h3 className="font-bold text-2xl text-gray-800">Appearance</h3>
            <div className="grid grid-cols-2 gap-6">
              <button 
                onClick={() => onThemeChange('light')} 
                className="group p-2 bg-gray-50 rounded-3xl border-2 transition-all hover:scale-[1.02] active:scale-95 border-transparent focus:border-chef-orange"
              >
                <div className="w-full h-32 bg-white rounded-2xl border shadow-sm mb-3"></div>
                <span className="font-bold text-gray-700">Light Mode</span>
              </button>
              <button 
                onClick={() => onThemeChange('dark')} 
                className="group p-2 bg-gray-50 rounded-3xl border-2 transition-all hover:scale-[1.02] active:scale-95 border-transparent focus:border-chef-orange"
              >
                <div className="w-full h-32 bg-slate-800 rounded-2xl border-slate-700 shadow-sm mb-3"></div>
                <span className="font-bold text-gray-700">Dark Mode</span>
              </button>
            </div>
          </div>
        );
      case 'feedback':
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-2xl text-gray-800">Feedback</h3>
            <p className="text-gray-500 text-sm">Help us make Pantry Chef the ultimate kitchen companion.</p>
            <textarea 
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl h-40 resize-none focus:ring-2 focus:ring-chef-orange focus:border-transparent transition-all" 
              placeholder="What can we improve? Suggest features or report bugs..."
            ></textarea>
            <button className="bg-chef-orange text-white font-bold py-4 rounded-2xl hover:bg-red-500 w-full shadow-lg shadow-orange-100 transition-all active:scale-[0.98]">
              Send Feedback
            </button>
          </div>
        );
      case 'pro':
        return (
          <div className="bg-gradient-to-br from-chef-yellow/20 to-chef-orange/20 p-8 rounded-3xl border border-chef-yellow/30 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
               <Crown size={120} />
             </div>
             <Crown size={64} className="mx-auto text-chef-yellow mb-4 drop-shadow-sm" />
             <h3 className="font-bold text-3xl text-gray-800 mb-2">Upgrade to Chef Pro</h3>
             <p className="text-gray-600 mb-8 font-medium">Unlock the full power of AI cooking.</p>
             <ul className="text-left space-y-4 mb-8 mx-auto max-w-sm">
               {[
                 {icon: "✨", text: "Unlimited Recipe Generations"},
                 {icon: "🍎", text: "Advanced Nutrition Facts"},
                 {icon: "📅", text: "Meal Planning Calendar"},
                 {icon: "📸", text: "HD Food Photography"}
               ].map((item, i) => (
                 <li key={i} className="flex items-center gap-3 bg-white/50 p-3 rounded-2xl border border-white">
                   <span className="text-xl">{item.icon}</span> 
                   <span className="font-bold text-gray-700 text-sm">{item.text}</span>
                 </li>
               ))}
             </ul>
             <button className="w-full bg-gradient-to-r from-chef-yellow to-chef-orange text-white py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95">
               Get Pro for $4.99/mo
             </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl h-[700px] rounded-[40px] shadow-2xl flex overflow-hidden border border-white/40">
        {/* Sidebar */}
        <div className="w-72 bg-gray-50 border-r border-gray-100 p-8 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-2 mb-10">
              <div className="bg-chef-orange p-1.5 rounded-xl text-white">
                <span className="text-xl">🧑‍🍳</span>
              </div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">Settings</h2>
            </div>
            <nav className="space-y-2">
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
                      if (tab.id !== 'help') setActiveHelpTopic(null); // Reset help sub-view if changing main tab
                  }} 
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm ${
                    activeTab === tab.id 
                      ? tab.special 
                        ? 'bg-gradient-to-r from-chef-yellow to-chef-orange text-white shadow-lg' 
                        : 'bg-white shadow-md text-chef-orange' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={20} /> {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div>
            <div className="p-4 bg-white rounded-2xl border border-gray-100 mb-6">
              <div className="flex items-center gap-3">
                <img src={user?.avatarUrl || 'https://ui-avatars.com/api/?name=User'} className="w-10 h-10 rounded-full border shadow-sm" alt="Avatar" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{user?.name || 'Guest User'}</p>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{user?.isPro ? 'Pro Member' : 'Free Plan'}</p>
                </div>
              </div>
            </div>
            <button className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold text-sm transition-colors w-full px-4">
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-10 relative bg-white overflow-y-auto scrollbar-hide">
          <button onClick={onClose} className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-gray-50 transition-all text-gray-400 active:scale-90 z-10">
            <X size={24} />
          </button>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;