
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  step: string;
}

const Layout: React.FC<LayoutProps> = ({ children, step }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-12 text-center">
        <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-blue-600 uppercase bg-blue-100 rounded-full">
          AI Product Architect
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">E-E-A-T Content Engine</h1>
        <p className="text-slate-500 text-lg">High-intent, humanized blogging at scale.</p>
        
        <div className="mt-8 flex items-center justify-center space-x-2">
          {['Keyword', 'Titles', 'Write', 'Review'].map((s, idx) => (
            <React.Fragment key={s}>
              <div className={`text-sm font-medium ${step === s ? 'text-blue-600' : 'text-slate-400'}`}>
                {s}
              </div>
              {idx < 3 && <div className="w-8 h-px bg-slate-200" />}
            </React.Fragment>
          ))}
        </div>
      </header>
      <main className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 min-h-[400px]">
        {children}
      </main>
    </div>
  );
};

export default Layout;
