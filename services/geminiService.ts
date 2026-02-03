
import { GoogleGenAI, Type } from "@google/genai";
import { BlogTitles, FinalArticle } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateTitles = async (keyword: string): Promise<BlogTitles> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze keyword: "${keyword}" for Australian high-CPM potential.
    Return JSON with isValid, reason, questions (5), and topics (5). Use AU spelling.`,
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
  const sectionPrompt = chunkIndex === 0 
    ? "Introduction and initial expert analysis" 
    : chunkIndex === totalChunks - 1 
    ? "Technical deep dive, authoritative conclusion, and a detailed AU-specific FAQ" 
    : "Comprehensive middle sections with Australian use cases, comparisons, and technical expertise";

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Write segment ${chunkIndex + 1}/${totalChunks} for a 1200+ word blog titled "${title}".
    Focus: ${sectionPrompt}.
    Previous context: ${previousContext.slice(-800)}
    
    CONSTRAINTS:
    - LOCALE: Australian English spelling only.
    - WORD COUNT: 400-450 words for this chunk.
    - E-E-A-T: Use practitioner-led phrasing. Cite Australian bodies (e.g., ACCC, APRA, Fair Work) where relevant.
    - TONE: Fully human, professional, and helpful. No generic AI fluff.
    - START INSIGHTS: Use "INSIGHT:" for high-value expert tips.`,
    config: {
      temperature: 0.8,
      thinkingConfig: { thinkingBudget: 4000 }
    }
  });

  return response.text.trim();
};

export const humanizeText = async (text: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Act as a senior Australian editor. Rewrite this blog segment to be 100% human-sounding. 
    Vary sentence structure, use natural AU professional idioms, and ensure it flows like a thought-leader piece.
    Keep all "INSIGHT:" labels.
    
    Text: ${text}`,
    config: { temperature: 0.9 }
  });

  return response.text.trim();
};

export const formatToHTML = async (title: string, fullContent: string): Promise<FinalArticle> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Convert the blog content into a JSON object formatted specifically for a Blogger post.
    
    REQUIRED STRUCTURE for articleHtml:
    1. A <style> block containing:
       - .blog-post-body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #333; }
       - .insight-box { background: #f0f7ff; border-left: 5px solid #0056b3; padding: 25px; margin: 30px 0; border-radius: 0 8px 8px 0; font-style: italic; }
       - .image-placeholder { border: 2px dashed #d1d5db; padding: 50px 20px; text-align: center; margin: 35px 0; background: #f9fafb; color: #6b7280; font-size: 14px; font-weight: bold; border-radius: 8px; }
       - h2 { color: #111827; margin-top: 45px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
       - h3 { color: #374151; margin-top: 30px; }
    2. A <body> block containing the article content.
    
    CONTENT RULES:
    - Insert 3-4 <div class="image-placeholder"> tags at logical visual breaks. 
    - Inside each placeholder, include a clear HTML comment (<!-- ... -->) describing exactly what type of Australian-context image or infographic should be placed there.
    - Use semantic <h2> and <h3> tags.
    - Wrap "INSIGHT:" paragraphs in <div class="insight-box">.
    - Use <ul> and <ol> for readability.
    - DO NOT include <html>, <head>, or <!DOCTYPE> tags.
    - RETURN ONLY VALID JSON. No markdown code blocks.

    METADATA:
    - metaTitle: AU-focused SEO title (max 60 chars).
    - metaDescription: High-CPM Blogger search description (max 155 chars).
    - h1: The Blogger Post Title.

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

  let rawResponse = response.text.trim();
  // Strip potential markdown wrappers
  if (rawResponse.startsWith('```')) {
    rawResponse = rawResponse.replace(/^```json/, '').replace(/```$/, '').trim();
  }
  
  return JSON.parse(rawResponse);
};
