import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDesktopMode } from '../context/DesktopModeContext';
import { ArrowLeft, User as UserIcon, Monitor, Smartphone } from 'lucide-react';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ title, showBack = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDesktopMode, toggleDesktopMode } = useDesktopMode();

  const isHome = location.pathname === '/';

  return (
    <header className="sticky top-0 z-30 h-14 bg-[var(--bg-primary,#171717)]/90 backdrop-blur-xl border-b border-[var(--border-subtle,#2f2f2f)] px-4 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        {showBack && !isHome ? (
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] hover:bg-[var(--bg-surface,#222222)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : null}

        <button
          onClick={() => navigate('/')}
          className="text-left font-bold tracking-tight text-base sm:text-lg text-[var(--text-primary,#F5F4F0)] flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
        >
          <span>ELITE MATRIX</span>
          {title && (
            <>
              <span className="text-[var(--text-muted,#888888)] font-normal text-sm">/</span>
              <span className="text-sm font-medium text-[var(--text-muted,#888888)] truncate max-w-[140px] sm:max-w-[200px]">
                {title}
              </span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDesktopMode}
          aria-label="Toggle Desktop Mode"
          title={isDesktopMode ? "Switch to Mobile View" : "Switch to Desktop Workstation View"}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted,#888888)] hover:text-[var(--accent,#C7F464)] hover:bg-[var(--bg-surface,#222222)] transition-colors cursor-pointer"
        >
          {isDesktopMode ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
        </button>

        <button
          onClick={() => navigate('/settings')}
          aria-label="Settings and Profile"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] transition-colors rounded-xl cursor-pointer"
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full border border-[var(--border-strong,#3f3f3f)] object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[var(--bg-surface,#222222)] border border-[var(--border-strong,#3f3f3f)] flex items-center justify-center text-xs font-semibold text-[var(--accent,#C7F464)]">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
            </div>
          )}
        </button>
      </div>
    </header>
  );
};
