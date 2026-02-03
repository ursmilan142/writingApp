
export enum AppStep {
  KEYWORD_INPUT,
  TITLE_SELECTION,
  GENERATING_CONTENT,
  FINAL_OUTPUT
}

export interface BlogTitles {
  questions: string[];
  topics: string[];
}

export interface GenerationProgress {
  chunk: number;
  totalChunks: number;
  status: 'writing' | 'humanizing' | 'completed';
}
