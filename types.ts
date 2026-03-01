
export type AppTab = 'chat' | 'voice' | 'visuals' | 'settings';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface TranscriptionItem {
  role: 'user' | 'model';
  text: string;
}
