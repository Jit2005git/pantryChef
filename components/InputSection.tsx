import React, { useState, useRef } from 'react';
import { Camera, Mic, Send, Image as ImageIcon, StopCircle, Loader2 } from 'lucide-react';

interface InputSectionProps {
  onSearch: (input: { text?: string; imageBase64?: string; mimeType?: string; audioBase64?: string }) => void;
  isLoading: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ onSearch, isLoading }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          onSearch({ audioBase64: base64Audio });
          setIsRecording(false);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSubmit = () => {
    if (!text && !selectedImage) return;

    if (selectedImage) {
      const [prefix, data] = selectedImage.split(',');
      const mimeType = prefix.match(/:(.*?);/)?.[1] || 'image/jpeg';
      onSearch({ text, imageBase64: data, mimeType });
    } else {
      onSearch({ text });
    }
    
    setText('');
    setSelectedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-2">
      <div className="relative glass-panel rounded-2xl shadow-xl p-1 sm:p-2 border border-white/40">
        
        {selectedImage && (
          <div className="relative w-full h-24 sm:h-32 mb-2 rounded-lg overflow-hidden bg-gray-100 group">
             <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
             <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
             >
                <span className="sr-only">Remove</span>
                &times;
             </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-3 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title="Upload fridge photo"
          >
            <Camera size={20} className="sm:w-6 sm:h-6" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />

          <div className="flex-1 min-w-[120px]">
             <textarea
               value={text}
               onChange={(e) => setText(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder={isRecording ? "Listening..." : "Add ingredients..."}
               className="w-full bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none py-2 sm:py-3 text-sm sm:text-base"
               rows={1}
               disabled={isRecording}
             />
          </div>

          <div className="flex items-center gap-1">
            <button 
               onClick={isRecording ? stopRecording : startRecording}
               className={`p-2 sm:p-3 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-50 text-red-500 animate-pulse' : 'hover:bg-gray-100 text-gray-500'}`}
               title="Speak ingredients"
            >
              {isRecording ? <StopCircle size={20} className="sm:w-6 sm:h-6" /> : <Mic size={20} className="sm:w-6 sm:h-6" />}
            </button>

            <button 
              onClick={handleSubmit}
              disabled={isLoading || (!text && !selectedImage && !isRecording)}
              className={`p-2 sm:p-3 rounded-full transition-all duration-300 ${
                  (text || selectedImage) && !isLoading
                  ? 'bg-chef-orange text-white shadow-lg hover:bg-red-500 hover:scale-105' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? <Loader2 size={20} className="sm:w-6 sm:h-6 animate-spin" /> : <Send size={20} className="sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputSection;