import React from 'react';
import { X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  const handleGoogleLogin = () => {
    // Simulate Google Login
    const mockUser = {
      id: '123',
      name: 'Chef User',
      email: 'user@example.com',
      isPro: false,
      avatarUrl: 'https://ui-avatars.com/api/?name=Chef+User&background=FF6B6B&color=fff'
    };
    onLogin(mockUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-[fadeIn_0.3s_ease-out]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <span className="text-3xl">👨‍🍳</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Pantry Chef</h2>
          <p className="text-gray-500 mb-8">Sign in to save your recipes and history.</p>

          <button 
            onClick={handleGoogleLogin}
            className="w-full border border-gray-300 rounded-xl py-3 px-4 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors mb-4"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span className="font-medium text-gray-700">Continue with Google</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleGoogleLogin(); }} className="space-y-4">
            <input type="email" placeholder="Email address" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-chef-orange focus:border-transparent outline-none" required />
            <input type="password" placeholder="Password" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-chef-orange focus:border-transparent outline-none" required />
            <button type="submit" className="w-full bg-chef-orange text-white font-bold py-3 rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-orange-200">
              Sign In
            </button>
          </form>
          
          <p className="mt-6 text-sm text-gray-500">
            Don't have an account? <a href="#" className="text-chef-orange font-medium hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
