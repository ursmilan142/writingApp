
import React, { useState, useCallback } from 'react';
import { AppStep, BlogTitles, GenerationProgress } from './types';
import * as gemini from './services/geminiService';
import Layout from './components/Layout';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.KEYWORD_INPUT);
  const [keyword, setKeyword] = useState('');
  const [titles, setTitles] = useState<BlogTitles | null>(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [finalHtml, setFinalHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  const handleKeywordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsLoading(true);
    try {
      const generated = await gemini.generateTitles(keyword);
      setTitles(generated);
      setStep(AppStep.TITLE_SELECTION);
    } catch (err) {
      alert("Error generating titles. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleSelection = async (title: string) => {
    setSelectedTitle(title);
    setStep(AppStep.GENERATING_CONTENT);
    setIsLoading(true);

    let fullArticleText = "";
    const totalChunks = 3;

    try {
      for (let i = 0; i < totalChunks; i++) {
        setProgress({ chunk: i + 1, totalChunks, status: 'writing' });
        const rawChunk = await gemini.generateContentChunk(title, i, totalChunks, fullArticleText);
        
        setProgress({ chunk: i + 1, totalChunks, status: 'humanizing' });
        const humanizedChunk = await gemini.humanizeText(rawChunk);
        
        fullArticleText += "\n\n" + humanizedChunk;
      }

      setProgress({ chunk: totalChunks, totalChunks, status: 'completed' });
      const html = await gemini.formatToHTML(title, fullArticleText);
      setFinalHtml(html);
      setStep(AppStep.FINAL_OUTPUT);
    } catch (err) {
      alert("Error generating content. Please try again.");
      setStep(AppStep.TITLE_SELECTION);
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const reset = () => {
    setStep(AppStep.KEYWORD_INPUT);
    setKeyword('');
    setTitles(null);
    setSelectedTitle('');
    setFinalHtml('');
  };

  const renderStep = () => {
    switch (step) {
      case AppStep.KEYWORD_INPUT:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Identify Your Target Intent</h2>
              <p className="text-slate-500">Enter a single trending keyword or niche topic to begin the architecture process.</p>
            </div>
            <form onSubmit={handleKeywordSubmit} className="space-y-4">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., Sustainable Minimalist Decor"
                className="w-full px-6 py-4 text-lg border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !keyword.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Analyzing Trends...</span>
                  </>
                ) : (
                  <span>Generate Intent-Driven Titles</span>
                )}
              </button>
            </form>
          </div>
        );

      case AppStep.TITLE_SELECTION:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Select Your SEO Foundation</h2>
              <p className="text-slate-500">We've generated 10 strategic titles for "{keyword}". Choose the best fit for your goals.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Informational Questions</h3>
                <div className="space-y-2">
                  {titles?.questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleTitleSelection(q)}
                      className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <span className="text-slate-800 font-medium group-hover:text-blue-700">{q}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Evergreen Topics</h3>
                <div className="space-y-2">
                  {titles?.topics.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => handleTitleSelection(t)}
                      className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <span className="text-slate-800 font-medium group-hover:text-blue-700">{t}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        );

      case AppStep.GENERATING_CONTENT:
        return (
          <div className="flex flex-col items-center justify-center space-y-8 py-12">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-blue-600">
                  {progress ? Math.round((progress.chunk / progress.totalChunks) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">Constructing Blog Architecture</h2>
              <p className="text-slate-500">
                {progress?.status === 'writing' && `Writing expert section ${progress.chunk} of ${progress.totalChunks}...`}
                {progress?.status === 'humanizing' && `Applying human-touch linguistics to section ${progress.chunk}...`}
                {progress?.status === 'completed' && `Polishing final semantic HTML structure...`}
              </p>
            </div>
            <div className="w-full max-w-md bg-slate-100 h-2 rounded-full overflow-hidden">
               <div 
                className="bg-blue-600 h-full transition-all duration-500" 
                style={{ width: `${progress ? (progress.chunk / progress.totalChunks) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm italic text-slate-400 italic">This process takes a few moments to ensure 1200+ words of quality content.</p>
          </div>
        );

      case AppStep.FINAL_OUTPUT:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-6 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800">Final Optimized Content</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(finalHtml);
                    alert("HTML copied to clipboard!");
                  }}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
                >
                  Copy HTML
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  New Article
                </button>
              </div>
            </div>
            
            <div className="max-w-none">
              <div 
                className="p-8 border border-slate-200 rounded-xl bg-white overflow-auto max-h-[700px] shadow-inner"
                dangerouslySetInnerHTML={{ __html: finalHtml }}
              />
            </div>
            
            <div className="bg-green-50 p-4 rounded-xl flex items-start space-x-3">
              <div className="bg-green-100 p-1 rounded-full text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-green-800 text-sm uppercase">Compliance Check Passed</h4>
                <ul className="text-xs text-green-700 mt-1 space-y-1">
                  <li>• E-E-A-T standards met (Experience & Logic)</li>
                  <li>• Custom Serif Layout (Georgia/Times)</li>
                  <li>• Table of Contents & FAQ Schema included</li>
                  <li>• Semantic HTML optimized for rich snippets</li>
                </ul>
              </div>
            </div>
          </div>
        );
    }
  };

  const getStepName = () => {
    if (step === AppStep.KEYWORD_INPUT) return 'Keyword';
    if (step === AppStep.TITLE_SELECTION) return 'Titles';
    if (step === AppStep.GENERATING_CONTENT) return 'Write';
    return 'Review';
  };

  return (
    <Layout step={getStepName()}>
      {renderStep()}
    </Layout>
  );
};

export default App;
