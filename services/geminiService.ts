
import { GoogleGenAI } from "@google/genai";

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Common utility to handle large responses or stream processing could go here
