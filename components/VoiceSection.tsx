
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { decode, decodeAudioData, createPcmBlob } from '../utils/audioUtils';
import { TranscriptionItem } from '../types';

const VoiceSection: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const currentTranscriptionRef = useRef({ user: '', model: '' });

  const cleanup = () => {
    if (sessionRef.current) {
      sessionRef.current.close?.();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    setIsSessionActive(false);
    setStatus('idle');
  };

  const startSession = async () => {
    try {
      setStatus('connecting');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Voice session opened');
            setIsSessionActive(true);
            setStatus('listening');
            
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentTranscriptionRef.current.user += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              currentTranscriptionRef.current.model += message.serverContent.outputTranscription.text;
            }
            
            if (message.serverContent?.turnComplete) {
              const userT = currentTranscriptionRef.current.user;
              const modelT = currentTranscriptionRef.current.model;
              setTranscriptions(prev => [
                ...prev, 
                { role: 'user', text: userT }, 
                { role: 'model', text: modelT }
              ]);
              currentTranscriptionRef.current = { user: '', model: '' };
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              setStatus('speaking');
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setStatus('listening');
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setStatus('listening');
            }
          },
          onerror: (e) => {
            console.error('Live API Error:', e);
            cleanup();
          },
          onclose: () => {
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: "You are a friendly KPK Board Voice Tutor. You speak to students in a helpful, encouraging tone. Help them understand concepts from their KPK textbook curriculum. Be concise since this is a voice conversation. You can explain diagrams, solve math problems step-by-step, or quiz them for exam prep."
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start session:', err);
      setStatus('idle');
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <div className="h-full flex flex-col p-6 items-center justify-center">
      {!isSessionActive ? (
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Voice Tutor</h2>
          <p className="text-slate-500 mt-4 mb-8">
            Speak naturally to your AI tutor. Ask about difficult concepts, practice for viva exams, or just discuss your KPK Board curriculum.
          </p>
          <button
            onClick={startSession}
            disabled={status === 'connecting'}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            {status === 'connecting' ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Connecting...
              </>
            ) : (
              'Start Conversation'
            )}
          </button>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col max-w-2xl mx-auto">
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {transcriptions.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  t.role === 'user' 
                    ? 'bg-emerald-50 text-emerald-800 font-medium' 
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  <p className="text-sm">{t.text}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-8 flex flex-col items-center">
            <div className="relative mb-8">
              <div className={`absolute -inset-4 bg-emerald-400/20 rounded-full animate-ping ${status === 'listening' ? 'opacity-100' : 'opacity-0'}`}></div>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                status === 'speaking' ? 'bg-emerald-600 scale-110 shadow-emerald-300' : 'bg-emerald-500'
              } text-white shadow-xl`}>
                {status === 'speaking' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15l-3-3m0 0l3-3m-3 3h12.728" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </div>
            </div>
            
            <p className="font-bold text-slate-700 animate-pulse capitalize">
              {status}...
            </p>
            
            <button
              onClick={cleanup}
              className="mt-12 text-slate-400 font-bold hover:text-red-500 transition-colors uppercase tracking-widest text-xs"
            >
              End Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceSection;
