
import React, { useState, useRef } from 'react';
import { AppStep, BlogTitles, GenerationProgress, FinalArticle } from './types';
import * as gemini from './services/geminiService';
import Layout from './components/Layout';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.KEYWORD_INPUT);
  const [keyword, setKeyword] = useState('');
  const [titles, setTitles] = useState<BlogTitles | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [finalArticle, setFinalArticle] = useState<FinalArticle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const fullArticleRef = useRef<string>('');
  const chunkIndexRef = useRef<number>(0);
  const totalChunks = 5;

  const handleKeywordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setIsLoading(true);
    setRejectionReason(null);
    setErrorStatus(null);
    try {
      const generated = await gemini.generateTitles(keyword);
      if (!generated.isValid) {
        setRejectionReason(generated.reason || "Keyword doesn't meet the AU revenue potential threshold.");
      } else {
        setTitles(generated);
        setStep(AppStep.TITLE_SELECTION);
      }
    } catch (err) {
      setErrorStatus("API Connection Error. Please check your network or wait a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const startGeneration = async (title: string) => {
    setSelectedTitle(title);
    setStep(AppStep.GENERATING_CONTENT);
    fullArticleRef.current = "";
    chunkIndexRef.current = 0;
    processNextChunk(title);
  };

  const processNextChunk = async (title: string) => {
    setIsLoading(true);
    setErrorStatus(null);
    const idx = chunkIndexRef.current;
    
    try {
      // Step A: Drafting
      setProgress({ chunk: idx + 1, totalChunks, status: 'drafting' });
      const rawChunk = await gemini.generateContentChunk(title, idx, totalChunks, fullArticleRef.current);
      
      // Step B: Auto Humanization
      setProgress({ chunk: idx + 1, totalChunks, status: 'humanizing' });
      const humanized = await gemini.humanizeWithHumanizeAI(rawChunk);
      
      finalizeChunk(humanized);
    } catch (err) {
      setErrorStatus(`Rate limited at step ${idx + 1}/5. Retrying automatically in 8s...`);
      setTimeout(() => processNextChunk(title), 8000);
    } finally {
      setIsLoading(false);
    }
  };

  const finalizeChunk = async (content: string) => {
    fullArticleRef.current += "\n\n" + content;
    chunkIndexRef.current += 1;

    if (chunkIndexRef.current < totalChunks) {
      processNextChunk(selectedTitle);
    } else {
      setIsLoading(true);
      setProgress({ chunk: totalChunks, totalChunks, status: 'completed' });
      try {
        const article = await gemini.formatToHTML(selectedTitle, fullArticleRef.current);
        setFinalArticle(article);
        setStep(AppStep.FINAL_OUTPUT);
      } catch (err) {
        setErrorStatus("Formatting failed. Retrying one last time...");
        setTimeout(() => finalizeChunk(content), 5000);
      }
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied!`);
  };

  const reset = () => {
    setStep(AppStep.KEYWORD_INPUT);
    setKeyword('');
    setTitles(null);
    setRejectionReason(null);
    setFinalArticle(null);
    setErrorStatus(null);
    fullArticleRef.current = '';
    chunkIndexRef.current = 0;
  };

  const renderStep = () => {
    switch (step) {
      case AppStep.KEYWORD_INPUT:
        return (
          <form onSubmit={handleKeywordSubmit} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800">Blogger Content Architect</h2>
              <p className="text-slate-500 text-sm mt-1">High-CPM AU Market Analysis & Humanized Drafting.</p>
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. Australian Self-Managed Super Funds..."
              className="w-full px-6 py-4 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
            />
            {rejectionReason && <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-lg border border-red-100">{rejectionReason}</p>}
            
            <button type="submit" disabled={isLoading || !keyword.trim()} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg">
              {isLoading ? "Analyzing AU Niche..." : "Start Workflow"}
            </button>
            {errorStatus && <p className="text-center text-[10px] text-orange-600 font-bold uppercase animate-pulse">{errorStatus}</p>}
          </form>
        );

      case AppStep.TITLE_SELECTION:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-center">Select High-Intent Title</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Questions</span>
                {titles?.questions?.map((q, i) => (
                  <button key={i} onClick={() => startGeneration(q)} className="w-full text-left p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-500 text-sm font-medium transition-colors">{q}</button>
                ))}
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Topics</span>
                {titles?.topics?.map((t, i) => (
                  <button key={i} onClick={() => startGeneration(t)} className="w-full text-left p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-500 text-sm font-medium transition-colors">{t}</button>
                ))}
              </div>
            </div>
          </div>
        );

      case AppStep.GENERATING_CONTENT:
        return (
          <div className="flex flex-col items-center py-16 space-y-8">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 border-[6px] border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center">
                <span className="block text-2xl font-black text-blue-600">{progress?.chunk}/{totalChunks}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">PROGRESS</span>
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-lg">
                    <span className={`w-3 h-3 rounded-full ${progress?.status === 'drafting' ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></span>
                    <p className="font-bold text-slate-700 text-sm uppercase tracking-tight">AI Drafting Phase</p>
                 </div>
                 <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg">
                    <span className={`w-3 h-3 rounded-full ${progress?.status === 'humanizing' ? 'bg-blue-600 animate-pulse' : progress?.status === 'drafting' ? 'bg-slate-200' : 'bg-green-500'}`}></span>
                    <p className="font-bold text-blue-700 text-sm uppercase tracking-tight">HumanizeAI.io Processing</p>
                 </div>
              </div>
            </div>

            {errorStatus && (
              <div className="bg-orange-50 border border-orange-200 px-6 py-3 rounded-xl max-w-sm">
                <p className="text-xs text-orange-600 font-bold text-center uppercase leading-tight">{errorStatus}</p>
              </div>
            )}
          </div>
        );

      case AppStep.FINAL_OUTPUT:
        return (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2">
                Blogger Meta & Body
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-black block mb-1">Post Title</label>
                  <div className="flex gap-2">
                    <input readOnly value={finalArticle?.h1} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" />
                    <button onClick={() => copyToClipboard(finalArticle?.h1 || "", "Post Title")} className="px-5 bg-blue-600 rounded-lg text-xs font-black hover:bg-blue-700 transition-all">COPY</button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-black block mb-1">Search Description</label>
                  <div className="flex gap-2">
                    <textarea readOnly value={finalArticle?.metaDescription} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white h-16 resize-none" />
                    <button onClick={() => copyToClipboard(finalArticle?.metaDescription || "", "Description")} className="px-5 bg-blue-600 rounded-lg text-xs font-black self-stretch hover:bg-blue-700 transition-all">COPY</button>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => copyToClipboard(finalArticle?.articleHtml || "", "Blogger HTML")}
                className="w-full bg-white text-slate-900 font-black py-4 rounded-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                COPY PURE HTML FOR BLOGGER
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Post Preview (With Image Slots)</span>
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">HumanizeAI.io Verified</span>
              </div>
              <div className="p-8 max-h-[500px] overflow-y-auto bg-white prose-custom">
                 <div dangerouslySetInnerHTML={{ __html: finalArticle?.articleHtml || "" }} />
              </div>
            </div>
            
            <div className="text-center pt-4">
              <button onClick={reset} className="text-slate-400 text-sm font-bold hover:text-slate-900 transition-colors underline underline-offset-4 decoration-slate-200">Start New Project</button>
            </div>
          </div>
        );
    }
  };

  return <Layout step={step === AppStep.FINAL_OUTPUT ? 'Review' : step === AppStep.GENERATING_CONTENT ? 'Write' : step === AppStep.TITLE_SELECTION ? 'Titles' : 'Keyword'}>{renderStep()}</Layout>;
};

export default App;
