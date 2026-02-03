
import React, { useState, useRef } from 'react';
import { AppStep, BlogTitles, GenerationProgress, HumanizationMode } from './types';
import * as gemini from './services/geminiService';
import Layout from './components/Layout';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.KEYWORD_INPUT);
  const [keyword, setKeyword] = useState('');
  const [titles, setTitles] = useState<BlogTitles | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [finalHtml, setFinalHtml] = useState('');
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
        setRejectionReason(generated.reason || "This keyword does not have high CPM potential in the Australian market. Please try a different niche (e.g. Mortgages, B2B SaaS, Legal Services).");
      } else {
        setTitles(generated);
        setStep(AppStep.TITLE_SELECTION);
      }
    } catch (err) {
      alert("Error validating keyword.");
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
      alert("Generation error.");
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
      setProgress({ chunk: totalChunks, totalChunks, status: 'completed' });
      const html = await gemini.formatToHTML(selectedTitle, fullArticleRef.current);
      setFinalHtml(html);
      setStep(AppStep.FINAL_OUTPUT);
      setIsLoading(false);
    }
  };

  const handleOpenExternal = () => {
    navigator.clipboard.writeText(currentRawText);
    window.open('https://humanizeaitext.ai/', '_blank');
  };

  const reset = () => {
    setStep(AppStep.KEYWORD_INPUT);
    setKeyword('');
    setTitles(null);
    setRejectionReason(null);
    setSelectedTitle('');
    setFinalHtml('');
    fullArticleRef.current = '';
    chunkIndexRef.current = 0;
  };

  const renderStep = () => {
    switch (step) {
      case AppStep.KEYWORD_INPUT:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Australian CPM Validator</h2>
              <p className="text-slate-500">Enter a keyword to check Australian revenue potential.</p>
            </div>
            
            <form onSubmit={handleKeywordSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. Sydney Home Loans, B2B Payroll Australia..."
                  className="w-full px-6 py-4 text-lg border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                />
                {rejectionReason && (
                  <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                      <p className="text-sm text-red-700 font-medium leading-tight">{rejectionReason}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Linguistic Engine</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHumanMode('auto')}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${humanMode === 'auto' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
                  >
                    Auto-Humanize
                  </button>
                  <button
                    type="button"
                    onClick={() => setHumanMode('manual')}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${humanMode === 'manual' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
                  >
                    Manual Bridge
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !keyword.trim()}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all disabled:opacity-50"
              >
                {isLoading ? "Validating AU Market..." : "Check CPM & Generate Titles"}
              </button>
            </form>
          </div>
        );

      case AppStep.TITLE_SELECTION:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">High-CPM Australian Titles</h2>
              <p className="text-slate-500">Sought-after topics in the AU market for "{keyword}".</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">AU Questions (High CTR)</h3>
                {titles?.questions?.map((q, i) => (
                  <button key={i} onClick={() => startGeneration(q)} className="w-full text-left p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-sm font-medium">
                    {q}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">AU Topics (Evergreen)</h3>
                {titles?.topics?.map((t, i) => (
                  <button key={i} onClick={() => startGeneration(t)} className="w-full text-left p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-sm font-medium">
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case AppStep.GENERATING_CONTENT:
        return (
          <div className="flex flex-col items-center justify-center space-y-8 py-12">
            <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Section {progress?.chunk} of {totalChunks}</h2>
              <p className="text-slate-500 uppercase text-xs tracking-widest mt-2">{progress?.status} phase</p>
            </div>
          </div>
        );

      case AppStep.HUMANIZATION_BRIDGE:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-blue-900 leading-tight">Humanization Bridge</h3>
                <p className="text-xs text-blue-700">Chunk {chunkIndexRef.current + 1} of {totalChunks} ready.</p>
              </div>
              <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-bold uppercase">Manual Bridge Active</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Step 1: AI Raw Draft</label>
                  <span className={`text-[10px] font-bold ${countWords(currentRawText) > 480 ? 'text-red-500' : 'text-slate-400'}`}>
                    {countWords(currentRawText)} / 500 words
                  </span>
                </div>
                <div className="relative group">
                  <textarea
                    readOnly
                    value={currentRawText}
                    className="w-full p-4 h-64 bg-slate-50 border border-slate-200 rounded-xl text-sm font-serif outline-none resize-none"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-50 to-transparent flex justify-center">
                    <button 
                      onClick={handleOpenExternal}
                      className="bg-blue-600 text-white shadow-xl px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center space-x-2"
                    >
                      <span>Copy & Open Humanizer</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Step 2: Humanized Result</label>
                  <span className="text-[10px] font-bold text-slate-400">
                    {countWords(manualInput)} words
                  </span>
                </div>
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Paste processed text here..."
                  className="w-full p-4 h-64 border-2 border-dashed border-blue-200 rounded-xl text-sm focus:border-blue-500 focus:ring-0 transition-all outline-none resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => finalizeChunk(manualInput)}
              disabled={!manualInput.trim()}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
            >
              Confirm Humanized Section & Next
            </button>
          </div>
        );

      case AppStep.FINAL_OUTPUT:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b">
              <h2 className="text-2xl font-bold text-slate-800">Final AU Blog Post (E-E-A-T Optimized)</h2>
              <div className="flex space-x-2">
                <button onClick={() => { navigator.clipboard.writeText(finalHtml); alert("Copied!"); }} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-black">Copy HTML</button>
                <button onClick={reset} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">New Post</button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl p-8 bg-white shadow-inner overflow-auto max-h-[600px]">
              <div dangerouslySetInnerHTML={{ __html: finalHtml }} />
            </div>
          </div>
        );
    }
  };

  return <Layout step={step === AppStep.FINAL_OUTPUT ? 'Review' : step === AppStep.GENERATING_CONTENT ? 'Write' : 'Keyword'}>{renderStep()}</Layout>;
};

export default App;
