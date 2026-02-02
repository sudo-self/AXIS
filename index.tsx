import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { ChevronDown, Github, Star } from 'lucide-react';

// --- Data ---
const LANGUAGES = [
  'Natural Language',
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'Go',
  'Rust',
  'Swift',
  'Kotlin',
  'PHP',
  'Ruby',
  'SQL',
  'HTML',
  'CSS',
  'Bash',
  'JSON',
  'YAML'
];

// --- Helper Components ---

const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-[slideUp_0.3s_ease-out]">
      <div className="bg-neutral-900/90 border border-gray-700 text-white px-4 py-2 rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-2 text-sm font-mono">
        <span className="text-cyan-400">●</span> {message}
      </div>
    </div>
  );
};

const LanguageSelect = ({ language, onChange }: { language: string; onChange: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-black/40 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 px-4 py-3 rounded-lg backdrop-blur-sm transition-all text-sm font-mono"
      >
        <span>{language}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-neutral-900 border border-gray-800 rounded-lg shadow-xl z-50 custom-scrollbar">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                onChange(lang);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm font-mono transition-colors ${
                language === lang ? 'bg-cyan-900/30 text-cyan-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CodeEditor = ({ 
  code, 
  onChange, 
  readOnly = false, 
  placeholder 
}: { 
  code: string; 
  onChange?: (val: string) => void; 
  readOnly?: boolean;
  placeholder?: string;
}) => {
  return (
    <textarea
      value={code}
      onChange={(e) => onChange && onChange(e.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`
        absolute inset-0 w-full h-full bg-transparent text-gray-300 p-4 font-mono text-sm resize-none focus:outline-none 
        placeholder-gray-700 leading-relaxed overflow-auto custom-scrollbar
        ${readOnly ? 'cursor-text' : 'cursor-text'}
      `}
      spellCheck={false}
    />
  );
};

// --- Main Application ---

const App = () => {
  const [inputLanguage, setInputLanguage] = useState('JavaScript');
  const [outputLanguage, setOutputLanguage] = useState('Python');
  const [inputCode, setInputCode] = useState('');
  const [outputCode, setOutputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  
  // Confetti ref
  const titleRef = useRef<HTMLDivElement>(null);

  // GitHub buttons re-render
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://buttons.github.io/buttons.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const triggerConfetti = () => {
    if (titleRef.current) {
      const rect = titleRef.current.getBoundingClientRect();
      for (let i = 0; i < 40; i++) {
        const el = document.createElement('div');
        el.className = 'confetti';
        
        // Random angle and distance
        const angle = Math.random() * Math.PI * 2;
        const velocity = 50 + Math.random() * 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        el.style.left = '50%';
        el.style.top = '50%';
        el.style.backgroundColor = ['#22d3ee', '#ec4899', '#9333ea', '#ffffff'][Math.floor(Math.random() * 4)];
        
        titleRef.current.appendChild(el);
        setTimeout(() => el.remove(), 1000);
      }
    }
  };

  const handleTranslate = async () => {
    if (!inputCode.trim()) {
      setToast('Please enter code to translate.');
      return;
    }
    if (inputLanguage === outputLanguage && inputLanguage !== 'Natural Language') {
      setToast('Input and output languages must be different.');
      return;
    }

    setLoading(true);
    setOutputCode('');

    try {
      // Initialize AI with API key from environment
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      let prompt = '';
      if (inputLanguage === 'Natural Language') {
        prompt = `Generate ${outputLanguage} code that performs the following task:\n\n${inputCode}`;
      } else if (outputLanguage === 'Natural Language') {
        prompt = `Explain the following ${inputLanguage} code in clear, concise natural language:\n\n${inputCode}`;
      } else {
        prompt = `Translate the following ${inputLanguage} code to ${outputLanguage}.\n\n${inputCode}`;
      }

      // Configure system instructions based on output type
      const systemInstruction = outputLanguage === 'Natural Language' 
        ? "You are a helpful coding assistant. Explain code clearly and concisely."
        : "You are a coding expert. Output ONLY the raw code. Do not use markdown code blocks (```). Do not add explanations or conversational text.";

      // Using gemini-3-flash-preview for lower latency and better responsiveness
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      let fullText = '';
      for await (const chunk of responseStream) {
        const text = chunk.text || '';
        fullText += text;
        
        // Basic cleanup if model ignores system instruction slightly, 
        // but streaming raw text is preferred for "hacker" feel.
        // We remove markdown blocks if they start appearing at the edges.
        let displayCode = fullText;
        if (displayCode.startsWith('```')) {
            displayCode = displayCode.replace(/^```\w*\n?/, '');
        }
        // Don't remove trailing ``` yet as it might be incomplete, 
        // but we can remove it if it's the very end of the stream.
        // For real-time feel, we just display as is, or do a light cleanup.
        setOutputCode(displayCode.replace(/```$/g, ''));
      }
      
      triggerConfetti();

    } catch (error) {
      console.error(error);
      setToast('Translation failed. Check API key or network.');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputCode(text);
      setToast('Clipboard content inserted.');
    } catch (err) {
      setToast('Failed to read clipboard.');
    }
  };

  const handleDispatch = () => {
    if (!outputCode) {
      setToast('Nothing to export.');
      return;
    }
    const blob = new Blob([outputCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axis_export.${outputLanguage.toLowerCase().replace(/\s/g, '_')}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast('File dispatched successfully.');
  };

  return (
    <div className="relative min-h-screen flex flex-col z-10">
      <div className="grid-bg" />
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />

      {/* Header */}
      <div className="mt-10 flex flex-col items-center justify-center relative z-20">
        {/* GitHub Icon - Top Left */}
        <a 
          href="https://github.com/sudo-self/AXIS" 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute top-0 left-4 sm:left-8 p-2 rounded-lg bg-black/20 border border-gray-700/50 hover:border-gray-500 transition-colors group"
        >
          <Github className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
        </a>
        
        {/* GitHub Star Button */}
        <a 
          href="https://github.com/sudo-self/AXIS" 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute top-0 right-4 sm:right-8 p-2 rounded-lg bg-black/20 border border-gray-700/50 hover:border-gray-500 transition-colors group"
        >
          <Star className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
        </a>
        
        <div ref={titleRef} className="relative">
            <h1 className="title-glow bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-600 bg-clip-text text-6xl font-black text-transparent sm:text-7xl tracking-tighter cursor-default select-none">
            AXIS
            </h1>
        </div>
        <div className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-neutral-400">
          aligned. integrated. syntax.
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6 px-4 z-20">
        <button className="glass-button w-full sm:w-32" onClick={handleInsert} disabled={loading}>
          Insert
        </button>
        <button className="glass-button apply-button w-full sm:w-40" onClick={handleTranslate} disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-100"></span>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-200"></span>
            </span>
          ) : 'Apply'}
        </button>
        <button className="glass-button w-full sm:w-32" onClick={handleDispatch} disabled={!outputCode || loading}>
          Dispatch
        </button>
      </div>

      {/* Main Grid */}
      <div className="flex-1 mt-8 w-full max-w-[1400px] mx-auto px-4 pb-10 flex flex-col lg:flex-row gap-6 lg:gap-10 z-20">
        
        {/* Input Column */}
        <div className="flex-1 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-bold tracking-wide">INPUT SOURCE</span>
                <span className="text-xs font-mono text-gray-500">{inputCode.length} CHARS</span>
            </div>
            <LanguageSelect language={inputLanguage} onChange={setInputLanguage} />
            <div className="flex-1 min-h-[300px] lg:min-h-[500px] rounded-xl border-2 border-cyan-500/30 bg-black/80 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.1)] relative group focus-within:border-cyan-500 transition-colors">
                <CodeEditor 
                    code={inputCode} 
                    onChange={setInputCode} 
                    placeholder="// Paste your code here..."
                    readOnly={loading}
                />
            </div>
        </div>

        {/* Output Column */}
        <div className="flex-1 flex flex-col space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-pink-500 font-bold tracking-wide">TARGET OUTPUT</span>
                <span className={`text-xs font-mono transition-colors duration-300 ${loading ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}`}>
                    {loading ? 'PROCESSING STREAM...' : 'STABLE BUILD'}
                </span>
            </div>
            <LanguageSelect language={outputLanguage} onChange={setOutputLanguage} />
            <div className="flex-1 min-h-[300px] lg:min-h-[500px] rounded-xl border-2 border-pink-500/30 bg-black/80 overflow-hidden shadow-[0_0_30px_rgba(236,72,153,0.1)] relative group transition-colors">
                 <CodeEditor 
                    code={outputCode} 
                    readOnly={true} 
                    placeholder="// Translation will appear here..."
                />
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center pb-6 z-20">
         <a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer" className="inline-block">
           <img src="./logogemini.svg" alt="Logo Gemini" className="w-20 h-20 mx-auto" />
         </a>
      </footer>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);