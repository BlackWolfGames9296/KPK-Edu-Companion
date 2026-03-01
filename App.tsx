
import React, { useState, useEffect } from 'react';
import { AppTab } from './types';
import ChatSection from './components/ChatSection';
import VoiceSection from './components/VoiceSection';
import VisualSection from './components/VisualSection';
import Navigation from './components/Navigation';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  useEffect(() => {
    const checkKey = async () => {
      // Check if user has selected their own API key (for Veo/Pro models)
      if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        // Fallback for environments where the wrapper isn't present
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (typeof window.aistudio?.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="glass sticky top-0 z-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800">KPK Edu-Companion</h1>
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-widest">Digital Learning Hub</p>
          </div>
        </div>

        {!hasApiKey && (
          <button 
            onClick={handleOpenKeySelector}
            className="text-sm bg-orange-100 text-orange-700 px-4 py-2 rounded-full font-semibold hover:bg-orange-200 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Unlock Pro Features
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6">
          {activeTab === 'chat' && <ChatSection />}
          {activeTab === 'voice' && <VoiceSection />}
          {activeTab === 'visuals' && <VisualSection />}
          {activeTab === 'settings' && (
            <div className="p-8 text-center mt-20">
              <h2 className="text-2xl font-bold mb-4">Settings</h2>
              <p className="text-slate-500">Configure your learning preferences and API access.</p>
              <div className="mt-8 flex flex-col items-center gap-4">
                 <button 
                  onClick={handleOpenKeySelector}
                  className="bg-slate-800 text-white px-6 py-3 rounded-xl font-medium"
                >
                  Manage API Keys
                </button>
                <p className="text-xs text-slate-400 max-w-sm">Note: Pro features (Veo Video & Pro Image) require a paid Google Cloud Project API key. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-emerald-600 underline">Learn more</a></p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
