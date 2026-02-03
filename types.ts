
export enum AppStep {
  KEYWORD_INPUT,
  TITLE_SELECTION,
  GENERATING_CONTENT,
  HUMANIZATION_BRIDGE,
  FINAL_OUTPUT
}

export type HumanizationMode = 'auto' | 'manual';

export interface BlogTitles {
  isValid: boolean;
  reason?: string;
  questions?: string[];
  topics?: string[];
}

export interface GenerationProgress {
  chunk: number;
  totalChunks: number;
  status: 'writing' | 'humanizing' | 'waiting' | 'completed';
}
