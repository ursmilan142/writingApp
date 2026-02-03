
export enum AppStep {
  KEYWORD_INPUT,
  TITLE_SELECTION,
  GENERATING_CONTENT,
  FINAL_OUTPUT
}

export type HumanizationMode = 'auto' | 'manual';

export interface BlogTitles {
  isValid: boolean;
  reason?: string;
  questions?: string[];
  topics?: string[];
}

export interface FinalArticle {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  articleHtml: string;
}

export interface GenerationProgress {
  chunk: number;
  totalChunks: number;
  status: 'drafting' | 'humanizing' | 'completed';
}
