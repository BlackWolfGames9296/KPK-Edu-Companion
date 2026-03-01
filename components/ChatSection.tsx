
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Message, GroundingSource } from '../types';

const ChatSection: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: input,
        config: {
          systemInstruction: "You are the 'KPK Textbook Board Expert'. Your goal is to answer questions based on the Khyber Pakhtunkhwa (KPK) Board curriculum for classes 1-12. Be precise, academic, and supportive. Use Search Grounding to find specific book chapters, recent curriculum changes, or exam patterns if needed. If a question is outside the KPK curriculum, clarify that first, then provide a general answer. Format your responses in clean Markdown.",
          tools: [{ googleSearch: {} }]
        }
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: GroundingSource[] = groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'External Resource',
        uri: chunk.web?.uri || '#'
      })).filter((s: GroundingSource) => s.uri !== '#') || [];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "I couldn't find a specific answer in the KPK curriculum right now. Please try rephrasing.",
        timestamp: Date.now(),
        sources: sources
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full py-4">
      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 pb-20 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">KPK Board Assistant</h2>
            <p className="text-slate-500 max-w-sm mt-2">Ask anything about Physics, Math, Biology, or History from your KPK textbook.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-lg">
              {['9th Class Biology Chapter 1 summary', 'Explain the Second Law of Motion', 'KPK Board 10th Math paper pattern', 'Define photosynthesis in simple terms'].map(q => (
                <button 
                  key={q} 
                  onClick={() => setInput(q)}
                  className="text-sm p-4 text-left border border-slate-200 rounded-2xl hover:bg-emerald-50 hover:border-emerald-200 transition-all text-slate-600"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-3xl px-5 py-4 ${
              m.role === 'user' 
                ? 'bg-emerald-600 text-white shadow-md rounded-tr-none' 
                : 'bg-white border border-slate-100 shadow-sm rounded-tl-none'
            }`}>
              <div className="prose prose-sm max-w-none">
                {m.content.split('\n').map((line, i) => (
                  <p key={i} className={`mb-1 ${m.role === 'user' ? 'text-white' : 'text-slate-700'}`}>{line}</p>
                ))}
              </div>
              
              {m.sources && m.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Verified Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {m.sources.map((s, i) => (
                      <a 
                        key={i} 
                        href={s.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded-full hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-100 transition-all flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                        {s.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 px-5 py-4 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-75"></div>
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-150"></div>
              <span className="text-xs text-slate-400 ml-2 font-medium">Reading textbook...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="glass fixed bottom-16 left-0 right-0 max-w-5xl mx-auto px-4 py-3 z-40">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question from KPK Board books..."
            className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm text-slate-800"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-emerald-600 text-white w-14 rounded-2xl flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatSection;
