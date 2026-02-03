
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
    - Titles must appeal specifically to the Australian audience (e.g., mentioning "superannuation", "ATO", "GST", "AU" contexts where relevant).
    
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
    
    STRICT CONSTRAINTS:
    - LOCALE: Use Australian English spelling exclusively (e.g., "optimisation", "realise").
    - WORD COUNT: Strictly between 400 and 450 words. Do NOT exceed 480 words.
    - E-E-A-T: Demonstrate deep Australian market expertise. Use specific AU examples (e.g., Commonwealth Bank, realestate.com.au, local regulations).
    - NO AI-isms: Avoid generic transitions like "moreover" or "in today's world".
    - Include one specific "Expert Quote" paragraph starting with "QUOTE:".
    - If this is the last chunk, include a 4-question FAQ tailored to AU search intent.`,
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
    4. PRESERVE: Keep all "QUOTE:" markers and Australian spellings.
    
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
    
    REQUIRED CSS:
    .blog-post-body { font-family: 'Georgia', serif; font-size: 18px; line-height: 1.7; color: #333; }
    .blog-post-body h2 { font-family: 'Arial', sans-serif; color: #202124; margin-top: 40px; margin-bottom: 15px; font-weight: 700; font-size: 26px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .blog-post-body h3 { font-family: 'Arial', sans-serif; color: #444; margin-top: 30px; margin-bottom: 10px; font-size: 22px; }
    .highlight-box { background-color: #f1f8ff; border-left: 5px solid #0056b3; padding: 20px; margin: 30px 0; font-style: italic; }
    .toc-box { background-color: #f9f9f9; border: 1px solid #e0e0e0; padding: 20px; margin-bottom: 30px; border-radius: 8px; }
    .faq-section { background-color: #fffaf0; padding: 25px; border: 1px solid #ffeeba; border-radius: 8px; margin-top: 40px; }

    OUTPUT:
    - Proper Semantic HTML with Australian context markers.
    - TOC with anchor links.
    - Body with <h2>, <h3>.
    - Quotes in .highlight-box.
    - FAQ section.

    Title: ${title}
    Content: ${fullContent}`,
  });

  return response.text.trim();
};
