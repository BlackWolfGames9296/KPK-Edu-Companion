
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const VisualSection: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleEditImage = async () => {
    if (!file || !prompt) return;
    setIsProcessing(true);
    setStatusMessage('Editing image with Gemini 2.5 Flash...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = await convertToBase64(file);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: `As a tutor, help me improve this learning material. Follow this instruction: ${prompt}. Return only the modified image.` }
          ]
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setResultImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Error editing image. Check your API key.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!file || !prompt) return;
    
    // Veo requires user-selected key
    if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (!selected) {
        setStatusMessage('Please select a paid API key in settings for Veo generation.');
        await window.aistudio.openSelectKey();
      }
    }

    setIsProcessing(true);
    setStatusMessage('Animating diagram with Veo 3.1 Fast...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = await convertToBase64(file);
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
          imageBytes: base64Data,
          mimeType: file.type
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        setStatusMessage('Rendering video... this may take 1-2 minutes.');
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await videoResponse.blob();
        setResultVideo(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Error generating video. Make sure you have a paid project API key.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResultImage(null);
    setResultVideo(null);
    setPrompt('');
    setStatusMessage('');
  };

  return (
    <div className="h-full overflow-y-auto pt-6 pb-24 space-y-8">
      <div className="bg-emerald-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-100">
        <h2 className="text-2xl font-bold">Visual Learning Lab</h2>
        <p className="opacity-90 mt-2">
          Upload a diagram from your textbook to label it, edit it, or animate it into a video for better understanding.
        </p>
      </div>

      {!preview ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-3xl p-12 bg-white">
          <input
            type="file"
            id="fileInput"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <label 
            htmlFor="fileInput"
            className="cursor-pointer flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <span className="font-bold text-slate-700">Upload textbook diagram</span>
            <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</span>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase">Original</p>
              <img src={preview} alt="Preview" className="w-full h-64 object-cover rounded-2xl border border-slate-200" />
            </div>
            
            {(resultImage || resultVideo) && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-emerald-600 uppercase">Generated Visual</p>
                {resultImage && <img src={resultImage} alt="Result" className="w-full h-64 object-cover rounded-2xl border-4 border-emerald-100 shadow-lg" />}
                {resultVideo && <video src={resultVideo} controls className="w-full h-64 object-cover rounded-2xl border-4 border-emerald-100 shadow-lg" />}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Instructions</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'Add colorful labels to this digestive system diagram' or 'Animate the flow of water in this plant cell diagram'"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm h-24"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleEditImage}
                disabled={isProcessing || !prompt}
                className="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                AI Image Edit
              </button>
              <button
                onClick={handleGenerateVideo}
                disabled={isProcessing || !prompt}
                className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Veo Animation
              </button>
            </div>
            
            {statusMessage && (
              <p className="text-center text-xs font-medium text-emerald-600 animate-pulse">{statusMessage}</p>
            )}
            
            <button 
              onClick={reset}
              className="w-full text-slate-400 text-xs font-bold py-2 hover:text-slate-600"
            >
              Clear and Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualSection;
