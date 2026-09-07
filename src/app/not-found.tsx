import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-400 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-serif font-extrabold text-white mb-2">404 - Page Not Found</h1>
      <p className="text-xs text-slate-400 max-w-sm mb-6">
        The requested digital menu or dashboard page could not be located.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 gold-btn rounded-xl text-xs font-bold flex items-center space-x-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Home</span>
      </Link>
    </div>
  );
}
