import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Shield, Cpu, Film, CheckCircle2, ArrowRight } from 'lucide-react';

export const AuthLanding: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, signInAsGuest } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogle = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } finally {
      setSigningIn(false);
    }
  };

  const handleGuest = () => {
    signInAsGuest();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col justify-between p-4 max-w-lg mx-auto">
      {/* Wordmark and Header */}
      <header className="py-6 flex items-center justify-between">
        <span className="font-bold tracking-tight text-lg text-[var(--text-primary,#F5F4F0)]">ELITE MATRIX</span>
        <span className="text-[11px] text-[var(--accent,#C7F464)] font-medium font-tabular">Studio Edition</span>
      </header>

      {/* Main concise presentation */}
      <main className="space-y-6 my-auto">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary,#F5F4F0)] leading-tight">
            Mobile-First Neural Video Studio.
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted,#888888)] leading-relaxed">
            Upscale footage up to 4K UHD, target 60/90/120 FPS high refresh interpolation, grade with real-time cinematic LUTs, and export ProRes masters.
          </p>
        </div>

        {/* Feature Capabilities Matrix */}
        <div className="space-y-2.5 p-4 bg-[var(--bg-surface,#222222)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl text-xs">
          <div className="flex items-center gap-2.5 text-[var(--text-primary,#F5F4F0)]">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent,#C7F464)] shrink-0" />
            <span>4K UHD Super-Resolution with Lanczos neural scaling</span>
          </div>
          <div className="flex items-center gap-2.5 text-[var(--text-primary,#F5F4F0)]">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent,#C7F464)] shrink-0" />
            <span>Up to 120 FPS Apple ProMotion frame synthesis</span>
          </div>
          <div className="flex items-center gap-2.5 text-[var(--text-primary,#F5F4F0)]">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent,#C7F464)] shrink-0" />
            <span>Real-time color grading adjustments & 10 cinematic film LUTs</span>
          </div>
          <div className="flex items-center gap-2.5 text-[var(--text-primary,#F5F4F0)]">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent,#C7F464)] shrink-0" />
            <span>Aspect ratios for TikTok, Instagram Reels, Cinema Scope</span>
          </div>
          <div className="flex items-center gap-2.5 text-[var(--text-primary,#F5F4F0)]">
            <CheckCircle2 className="w-4 h-4 text-[var(--accent,#C7F464)] shrink-0" />
            <span>Apple ProRes 422 HQ 10-bit broadcast mastering</span>
          </div>
        </div>

        {/* Auth CTAs */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleGoogle}
            disabled={signingIn}
            className="w-full h-12 rounded-xl bg-[var(--text-primary,#F5F4F0)] hover:bg-white text-[var(--bg-primary,#171717)] font-bold text-sm flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            {signingIn ? (
              <div className="w-4 h-4 border-2 border-[var(--bg-primary,#171717)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <button
            onClick={handleGuest}
            className="w-full h-11 rounded-xl bg-[var(--bg-surface,#222222)] border border-[var(--border-subtle,#2f2f2f)] hover:border-[var(--border-strong,#3f3f3f)] text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Continue as Studio Creator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-[var(--text-muted,#666666)]">
        <span>ELITE MATRIX Video Remastering & Color Grading Engine</span>
      </footer>
    </div>
  );
};
