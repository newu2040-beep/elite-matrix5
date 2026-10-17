import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Sparkles, Film, Settings } from 'lucide-react';
import { useDesktopMode } from '../context/DesktopModeContext';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { isDesktopMode } = useDesktopMode();

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/enhance', label: 'Studio', icon: Sparkles },
    { to: '/projects', label: 'Projects', icon: Film },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-primary,#171717)]/90 backdrop-blur-xl border-t border-[var(--border-subtle,#2a2a2a)] pb-safe transition-colors">
      <div className={`grid grid-cols-4 h-14 mx-auto relative px-2 ${isDesktopMode ? 'max-w-4xl' : 'max-w-lg'}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  try { navigator.vibrate?.(8); } catch {}
                }
              }}
              className="relative flex flex-col items-center justify-center min-h-[44px] transition-colors select-none"
            >
              {/* Fluid active background pill */}
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute inset-x-2 inset-y-1 bg-[var(--bg-surface-elevated,#242424)] rounded-xl -z-10 border border-[var(--border-strong,#333333)]"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}

              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'text-[var(--accent,#C7F464)] scale-105 stroke-[2.2]' : 'text-[var(--text-muted,#888888)] stroke-[1.8]'
                }`}
              />
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                  isActive ? 'font-semibold text-[var(--text-primary,#F5F4F0)]' : 'text-[var(--text-muted,#888888)]'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
