
import { GoogleGenAI, Type } from "@google/genai";
import { BlogTitles, FinalArticle } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateTitles = async (keyword: string): Promise<BlogTitles> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze keyword: "${keyword}" for Australian high-CPM potential.
    Provide 5 questions and 5 topics optimized for Blogger. Return JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN },
          reason: { type: Type.STRING },
          questions: { type: Type.ARRAY, items: { type: Type.STRING } },
          topics: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["isValid"]
      }
    }
  });

  return JSON.parse(response.text.trim());
};

export const generateContentChunk = async (
  title: string,
  chunkIndex: number,
  totalChunks: number,
  previousContext: string = ""
): Promise<string> => {
  const ai = getAI();
  const sections = [
    "Introduction and core Australian perspective.",
    "First expert analysis section with local data.",
    "Middle section covering technical details and AU regulations.",
    "Detailed case study or expert comparison for Australians.",
    "Final authority section, conclusion, and detailed AU FAQ."
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Write segment ${chunkIndex + 1}/${totalChunks} for blog "${title}".
    Goal: ${sections[chunkIndex]}.
    Previous: ${previousContext.slice(-500)}
    
    CONSTRAINTS:
    - AU English spelling.
    - Word count: ~250 words per chunk.
    - Expert practitioner tone.
    - Use "INSIGHT:" for key tips.`,
    config: {
      temperature: 0.8,
      thinkingConfig: { thinkingBudget: 4000 }
    }
  });

  return response.text.trim();
};

export const humanizeWithHumanizeAI = async (text: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Act as a senior Australian editor specializing in high-end business blogging. 
    Rewrite this blog segment to be 100% human-sounding and indistinguishable from an AU expert writer.
    
    STRATEGY:
    - Use "Burstiness": Varied sentence lengths (short punches followed by complex professional thoughts).
    - Use "Natural Flow": Avoid predictable AI transitions.
    - Locale: Strictly use Australian professional tone.
    - Keep all "INSIGHT:" labels.
    
    Text: ${text}`,
    config: { 
        temperature: 0.95,
        thinkingConfig: { thinkingBudget: 4000 }
    }
  });

  return response.text.trim();
};

export const formatToHTML = async (title: string, fullContent: string): Promise<FinalArticle> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Convert the blog content into a JSON object formatted specifically for a Blogger post.
    
    REQUIRED STRUCTURE:
    1. A <style> block containing professional typography and .insight-box, .image-placeholder styles.
    2. A <body> block containing semantic content (h2, h3, p, ul).
    
    PLACEHOLDERS:
    - Insert 3-4 <div class="image-placeholder"> blocks.
    - Inside each, include a clear <!-- HTML COMMENT --> describing the ideal Australian context image.
    
    No <html> or <!DOCTYPE>. Return JSON only.

    Title: ${title}
    Content: ${fullContent}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          metaTitle: { type: Type.STRING },
          metaDescription: { type: Type.STRING },
          h1: { type: Type.STRING },
          articleHtml: { type: Type.STRING }
        },
        required: ["metaTitle", "metaDescription", "h1", "articleHtml"]
      }
    }
  });

  let raw = response.text.trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```json/, '').replace(/```$/, '').trim();
  }
  return JSON.parse(raw);
};
