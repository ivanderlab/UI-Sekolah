import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI application:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-body">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl border border-slate-100 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined notranslate text-3xl">refresh</span>
            </div>
            <h2 className="text-slate-800 font-headline font-bold text-lg mb-2">Memuat Ulang Sistem</h2>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              Terjadi penyegaran sesi otomatis. Klik tombol di bawah untuk kembali ke aplikasi utama.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/25 active:scale-95 transition-all"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
