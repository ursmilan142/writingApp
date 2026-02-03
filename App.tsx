
import React, { useState, useRef } from 'react';
import { AppStep, BlogTitles, GenerationProgress, HumanizationMode, FinalArticle } from './types';
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
  const [humanMode, setHumanMode] = useState<HumanizationMode>('auto');
  
  const [currentRawText, setCurrentRawText] = useState('');
  const [manualInput, setManualInput] = useState('');
  const fullArticleRef = useRef<string>('');
  const chunkIndexRef = useRef<number>(0);
  const totalChunks = 3;

  const countWords = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleKeywordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setIsLoading(true);
    setRejectionReason(null);
    try {
      const generated = await gemini.generateTitles(keyword);
      if (!generated.isValid) {
        setRejectionReason(generated.reason || "Keyword doesn't meet the Australian CPM threshold for high revenue.");
      } else {
        setTitles(generated);
        setStep(AppStep.TITLE_SELECTION);
      }
    } catch (err) {
      alert("Validation process failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startGeneration = async (title: string) => {
    setSelectedTitle(title);
    fullArticleRef.current = "";
    chunkIndexRef.current = 0;
    processNextChunk(title);
  };

  const processNextChunk = async (title: string) => {
    setIsLoading(true);
    setStep(AppStep.GENERATING_CONTENT);
    const idx = chunkIndexRef.current;
    try {
      setProgress({ chunk: idx + 1, totalChunks, status: 'writing' });
      const rawChunk = await gemini.generateContentChunk(title, idx, totalChunks, fullArticleRef.current);
      if (humanMode === 'auto') {
        setProgress({ chunk: idx + 1, totalChunks, status: 'humanizing' });
        const humanized = await gemini.humanizeText(rawChunk);
        finalizeChunk(humanized);
      } else {
        setCurrentRawText(rawChunk);
        setManualInput('');
        setStep(AppStep.HUMANIZATION_BRIDGE);
      }
    } catch (err) {
      alert("Content generation failed at this stage.");
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
      setStep(AppStep.GENERATING_CONTENT);
      const article = await gemini.formatToHTML(selectedTitle, fullArticleRef.current);
      setFinalArticle(article);
      setStep(AppStep.FINAL_OUTPUT);
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
    fullArticleRef.current = '';
    chunkIndexRef.current = 0;
  };

  const renderStep = () => {
    switch (step) {
      case AppStep.KEYWORD_INPUT:
        return (
          <form onSubmit={handleKeywordSubmit} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800">AU High-CPM Keyword Validator</h2>
              <p className="text-slate-500 text-sm mt-1">Check if your niche is profitable in the Australian market.</p>
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter trending niche (e.g. Sydney SMSF Advice...)"
              className="w-full px-6 py-4 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
            />
            {rejectionReason && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                <p className="text-sm text-red-700 font-semibold">{rejectionReason}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-xl">
              <button type="button" onClick={() => setHumanMode('auto')} className={`py-2 rounded-lg text-xs font-bold transition-all ${humanMode === 'auto' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>AUTO-HUMANIZE</button>
              <button type="button" onClick={() => setHumanMode('manual')} className={`py-2 rounded-lg text-xs font-bold transition-all ${humanMode === 'manual' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>MANUAL BRIDGE</button>
            </div>
            <button type="submit" disabled={isLoading || !keyword.trim()} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-200">
              {isLoading ? "Validating AU Niche..." : "Analyze & Generate Titles"}
            </button>
          </form>
        );

      case AppStep.TITLE_SELECTION:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-center text-slate-800">Choose a High-Revenue Angle</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informational Questions</span>
                {titles?.questions?.map((q, i) => (
                  <button key={i} onClick={() => startGeneration(q)} className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 transition-all text-sm font-medium hover:shadow-md">{q}</button>
                ))}
              </div>
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commercial Topics</span>
                {titles?.topics?.map((t, i) => (
                  <button key={i} onClick={() => startGeneration(t)} className="w-full text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 transition-all text-sm font-medium hover:shadow-md">{t}</button>
                ))}
              </div>
            </div>
          </div>
        );

      case AppStep.GENERATING_CONTENT:
        return (
          <div className="flex flex-col items-center py-16 space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-600">
                {Math.round(((progress?.chunk || 0) / (progress?.totalChunks || 3)) * 100)}%
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-800">Developing Section {progress?.chunk} of 3</p>
              <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">{progress?.status} in progress</p>
            </div>
          </div>
        );

      case AppStep.HUMANIZATION_BRIDGE:
        return (
          <div className="space-y-5">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div>
                <h3 className="font-bold text-blue-900 text-sm">Step {chunkIndexRef.current + 1}: Humanization Bridge</h3>
                <p className="text-[10px] text-blue-600 font-bold uppercase">Manual quality control active</p>
              </div>
              <button onClick={() => window.open('https://humanizeaitext.ai/', '_blank')} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shadow-sm">Open External Humanizer</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Copy this AI Draft</label>
                <textarea readOnly value={currentRawText} className="w-full p-4 h-56 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-serif resize-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Paste Humanized Text</label>
                <textarea value={manualInput} onChange={(e) => setManualInput(e.target.value)} placeholder="Paste the fully human output here..." className="w-full p-4 h-56 border-2 border-dashed border-blue-200 rounded-xl text-xs outline-none resize-none focus:border-blue-500 transition-colors" />
              </div>
            </div>
            <button onClick={() => finalizeChunk(manualInput)} disabled={!manualInput.trim()} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-all">Confirm Humanized Section</button>
          </div>
        );

      case AppStep.FINAL_OUTPUT:
        return (
          <div className="space-y-8">
            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z"/></svg>
              </div>
              
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                Blogger Content Ready
              </h3>
              
              <div className="space-y-5">
                <div className="group">
                  <label className="text-[10px] uppercase text-slate-400 font-black block mb-1 tracking-tight">Post Title (H1)</label>
                  <div className="flex gap-2">
                    <input readOnly value={finalArticle?.h1} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none" />
                    <button onClick={() => copyToClipboard(finalArticle?.h1 || "", "Post Title")} className="px-5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-black transition-all">COPY</button>
                  </div>
                </div>

                <div className="group">
                  <label className="text-[10px] uppercase text-slate-400 font-black block mb-1 tracking-tight">Search Description (Sidebar)</label>
                  <div className="flex gap-2">
                    <textarea readOnly value={finalArticle?.metaDescription} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white h-20 resize-none outline-none" />
                    <button onClick={() => copyToClipboard(finalArticle?.metaDescription || "", "Search Description")} className="px-5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-black transition-all self-stretch">COPY</button>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => copyToClipboard(finalArticle?.articleHtml || "", "Full Article HTML")}
                className="w-full bg-white text-slate-900 font-black py-4 rounded-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                COPY HTML FOR BLOGGER EDITOR
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visual Article Preview</span>
                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded">AU E-E-A-T Optimized</span>
              </div>
              <div className="p-8 max-h-[500px] overflow-y-auto">
                 <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: finalArticle?.articleHtml || "" }} />
              </div>
            </div>
            
            <div className="text-center pt-4">
              <button onClick={reset} className="text-slate-400 text-sm font-bold hover:text-slate-900 transition-colors underline decoration-slate-200 underline-offset-4">Start a New High-CPM Project</button>
            </div>
          </div>
        );
    }
  };

  return <Layout step={step === AppStep.FINAL_OUTPUT ? 'Review' : step === AppStep.GENERATING_CONTENT ? 'Write' : step === AppStep.TITLE_SELECTION ? 'Titles' : 'Keyword'}>{renderStep()}</Layout>;
};

export default App;
