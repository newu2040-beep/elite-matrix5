import React, { createContext, useContext, useState, useEffect } from 'react';

interface DesktopModeContextType {
  isDesktopMode: boolean;
  toggleDesktopMode: () => void;
}

const DesktopModeContext = createContext<DesktopModeContextType>({
  isDesktopMode: false,
  toggleDesktopMode: () => {},
});

export const DesktopModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDesktopMode, setIsDesktopMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('elitematrix_desktop_mode');
      if (saved !== null) return JSON.parse(saved);
      return window.innerWidth >= 1024;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('elitematrix_desktop_mode', JSON.stringify(isDesktopMode));
  }, [isDesktopMode]);

  const toggleDesktopMode = () => {
    setIsDesktopMode((prev) => !prev);
  };

  return (
    <DesktopModeContext.Provider value={{ isDesktopMode, toggleDesktopMode }}>
      {children}
    </DesktopModeContext.Provider>
  );
};

export const useDesktopMode = () => useContext(DesktopModeContext);
