
import { GoogleGenAI, Type } from "@google/genai";
import { BlogTitles } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateTitles = async (keyword: string): Promise<BlogTitles> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Act as a senior SEO content strategist and Australian market expert. 
    Analyze the keyword: "${keyword}".
    
    TASK:
    1. Check if this keyword has HIGH CPM potential in the Australian market (e.g., Insurance, Real Estate, Law, Finance, B2B SaaS, Luxury Goods).
    2. If it is low-value, generic, or has no high-revenue search intent in Australia, set isValid to false and provide a helpful reason.
    3. If it is high-value, generate 10 blog post titles (5 questions, 5 topics) that are highly sought after by Australians and optimized for high-revenue ad placement.
    
    CONSTRAINTS:
    - Use Australian English spelling (e.g., "optimisation", "realise", "centre").
    - Titles must appeal specifically to the Australian audience.
    
    Return the result in valid JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN, description: "Whether the keyword has high CPM potential in Australia" },
          reason: { type: Type.STRING, description: "Reason for rejection if isValid is false" },
          questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "5 high-CPM Australian question titles"
          },
          topics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "5 evergreen Australian topic titles"
          }
        },
        required: ["isValid"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text.trim());
    return data;
  } catch (e) {
    console.error("Failed to parse titles JSON", e);
    throw new Error("Invalid titles format received from AI");
  }
};

export const generateContentChunk = async (
  title: string,
  chunkIndex: number,
  totalChunks: number,
  previousContext: string = ""
): Promise<string> => {
  const ai = getAI();
  const sectionPrompt = chunkIndex === 0 
    ? "an engaging introduction (no title) and the first 2 major expert sections with detailed analysis" 
    : chunkIndex === totalChunks - 1 
    ? "the final major analysis section, a powerful conclusion, and a 3-4 question FAQ section with concise answers" 
    : "deep-dive middle sections covering comparisons, use cases, and technical details";

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Write segment ${chunkIndex + 1} of a comprehensive 1200+ word blog post titled "${title}".
    Focus on: ${sectionPrompt}.
    Context from previous segments: ${previousContext.slice(-1000)}
    
    STRICT CONSTRAINTS (E-E-A-T Focus):
    - LOCALE: Use Australian English spelling exclusively.
    - WORD COUNT: Strictly between 400 and 450 words. Do NOT exceed 480 words.
    - EXPERIENCE: Use phrases like "During my time advising clients in Sydney...", "We've consistently seen in the AU market...", or "From a practitioner's standpoint...".
    - AUTHORITY: Mention specific Australian standards, bodies, or laws (e.g. ASIC, ATO, Fair Work, Australian Standards).
    - NO AI-isms: Avoid generic transitions.
    - Include one specific "Expert Insight" paragraph starting with "INSIGHT:".
    - If this is the last chunk, include a 4-question FAQ with high-value transactional answers.`,
    config: {
      temperature: 0.85,
      thinkingConfig: { thinkingBudget: 4000 }
    }
  });

  return response.text.trim();
};

export const humanizeText = async (text: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Act as a Professional Australian Human Editor. Rewrite the text to be indistinguishable from a human writer.
    
    STRATEGY:
    1. LOCALE: Ensure Australian idioms and "down-to-earth" professional tone.
    2. BURSTINESS: Vary sentence lengths aggressively.
    3. PERPLEXITY: Use nuanced, rare industry-specific vocabulary.
    4. PRESERVE: Keep all "INSIGHT:" markers and Australian spellings.
    
    Text:
    ${text}`,
    config: {
      temperature: 0.95,
      thinkingConfig: { thinkingBudget: 3000 }
    }
  });

  return response.text.trim();
};

export const formatToHTML = async (title: string, fullContent: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Convert the following content into a high-end, SEO-optimized HTML post for an Australian audience.
    
    REQUIRED STRUCTURE & STYLING:
    - Include a <style> block.
    - Create a "SEO Metadata Dashboard" at the top (styled div) containing:
        - Suggested Meta Title (60 chars max, high CTR for AU)
        - Suggested Meta Description (155 chars max, AU context)
        - Suggested H1 Tag
    - Main <h1> tag for the page.
    - Explicit "Author & Credentials" block at the start or end to boost E-E-A-T (placeholder for bio, photo, LinkedIn).
    - Table of Contents with internal anchor links.
    - Body content using semantic <h2> and <h3> tags.
    - "INSIGHT:" paragraphs must be converted to a styled blockquote or highlight box.
    - "Authority References" section at the end listing suggested Australian authoritative sources to cite.
    - FAQ section with appropriate schema markup.

    STYLE GUIDE:
    .blog-post-body { font-family: 'Georgia', serif; font-size: 18px; line-height: 1.7; color: #333; max-width: 800px; margin: auto; }
    .seo-dashboard { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-bottom: 40px; font-family: sans-serif; }
    .author-profile { display: flex; align-items: center; background: #fff; border: 1px solid #eee; padding: 15px; border-radius: 12px; margin: 20px 0; }
    .author-image { width: 60px; height: 60px; border-radius: 50%; background: #ddd; margin-right: 15px; }
    .insight-box { background-color: #f1f8ff; border-left: 5px solid #0056b3; padding: 20px; margin: 30px 0; font-style: italic; font-weight: 500; }
    .authority-list { font-size: 14px; color: #666; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }

    Title: ${title}
    Content: ${fullContent}`,
  });

  return response.text.trim();
};
