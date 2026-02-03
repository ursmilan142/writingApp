
import { GoogleGenAI, Type } from "@google/genai";
import { BlogTitles } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateTitles = async (keyword: string): Promise<BlogTitles> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Act as a senior SEO content strategist. Based on the trending keyword "${keyword}", generate 10 blog post titles. 
    Provide 5 titles as high-CTR questions (informational intent) and 5 as topics (evergreen/commercial).
    Return the result in valid JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "5 high-CTR question titles"
          },
          topics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "5 evergreen/commercial topic titles"
          }
        },
        required: ["questions", "topics"]
      }
    }
  });

  try {
    return JSON.parse(response.text.trim());
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
    Context from previous segments: ${previousContext.slice(-800)}
    
    Requirements:
    - Target 450-500 words for this specific segment.
    - Follow E-E-A-T principles: Cite hypothetical data/expert opinions, use high-level industry terminology, and address specific pain points.
    - IMPORTANT: Include at least one "Expert Quote" or "Key Statistic" written as a standalone paragraph starting with "QUOTE:" or "STAT:".
    - If this is the last chunk, ensure you provide a clear FAQ list at the end.
    - Avoid all AI-isms (e.g., "In the rapidly evolving world", "In conclusion").`,
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
    contents: `Act as a top-tier human editor. Rewrite the following text to bypass AI detection and sound like an industry veteran.
    
    Guidelines:
    - Inject "burstiness": mix short, punchy sentences with longer, descriptive ones.
    - Use "perplexity": employ nuanced vocabulary and non-linear thought patterns.
    - Preserve formatting cues like "QUOTE:" or "STAT:" markers.
    - Ensure the tone is authoritative yet relatable (first-person where appropriate).
    
    Text:
    ${text}`,
    config: {
      temperature: 0.9,
      thinkingConfig: { thinkingBudget: 2000 }
    }
  });

  return response.text.trim();
};

export const formatToHTML = async (title: string, fullContent: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Convert the following blog content into a high-end, SEO-optimized HTML post.
    
    EXACT CSS TO INCLUDE IN <style>:
    .blog-post-body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 18px; line-height: 1.7; color: #333; }
    .blog-post-body h2 { font-family: 'Arial', sans-serif; color: #202124; margin-top: 40px; margin-bottom: 15px; font-weight: 700; font-size: 26px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .blog-post-body h3 { font-family: 'Arial', sans-serif; color: #444; margin-top: 30px; margin-bottom: 10px; font-size: 22px; }
    .blog-post-body p { margin-bottom: 25px; }
    .highlight-box { background-color: #f1f8ff; border-left: 5px solid #0056b3; padding: 20px; margin: 30px 0; font-style: italic; color: #444; }
    .toc-box { background-color: #f9f9f9; border: 1px solid #e0e0e0; padding: 20px; margin-bottom: 30px; border-radius: 8px; }
    .toc-box ul { list-style-type: none; padding-left: 0; }
    .toc-box li { margin-bottom: 8px; }
    .toc-box a { text-decoration: none; color: #0056b3; font-weight: bold; }
    .toc-box a:hover { text-decoration: underline; }
    .faq-section { background-color: #fffaf0; padding: 25px; border: 1px solid #ffeeba; border-radius: 8px; margin-top: 40px; }

    OUTPUT STRUCTURE:
    1. <style> block with the CSS above.
    2. <div class="blog-post-body"> wrapper.
    3. The Introduction paragraph.
    4. A <div class="toc-box"> with a <ul> of anchor links to all <h2> headers.
    5. The main body. Use <h2> for major sections (with IDs matching the TOC). Use <h3> for sub-points.
    6. Convert any text marked "QUOTE:" or "STAT:" into <div class="highlight-box"> elements.
    7. A final <div id="faq" class="faq-section"> with <h2>FAQ: [Topic]</h2>, <h3>Questions</h3>, and <p>Answers</p>.
    8. A <script type="application/ld+json"> containing valid FAQPage schema matching the FAQ section.

    Title: ${title}
    Content: ${fullContent}`,
  });

  return response.text.trim();
};
