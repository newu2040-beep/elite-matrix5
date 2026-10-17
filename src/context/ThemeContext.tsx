import React, { createContext, useContext, useEffect, useState } from 'react';

export type PastelPalette = 'titanium' | 'blush' | 'sage' | 'lavender' | 'sky' | 'dune';
export type ColorMode = 'dark' | 'light';

export interface ThemeConfig {
  id: PastelPalette;
  name: string;
  subtitle: string;
  accentColor: string;
  previewBg: string;
  previewAccent: string;
}

export const PASTEL_THEMES: ThemeConfig[] = [
  {
    id: 'titanium',
    name: 'Space Titanium',
    subtitle: 'Classic Apple Studio Noir',
    accentColor: '#C7F464',
    previewBg: '#1C1C1E',
    previewAccent: '#C7F464',
  },
  {
    id: 'blush',
    name: 'Blush Rose',
    subtitle: 'Soft Rose Quartz & Luminous Tint',
    accentColor: '#FB7185',
    previewBg: '#241A1E',
    previewAccent: '#FB7185',
  },
  {
    id: 'sage',
    name: 'Sage Mint',
    subtitle: 'Calming Eucalyptus & Matcha Glow',
    accentColor: '#34D399',
    previewBg: '#19221C',
    previewAccent: '#34D399',
  },
  {
    id: 'lavender',
    name: 'Lavender Mist',
    subtitle: 'Soothing Wisteria & Lilac Frost',
    accentColor: '#A78BFA',
    previewBg: '#1F1B2A',
    previewAccent: '#A78BFA',
  },
  {
    id: 'sky',
    name: 'Powder Sky',
    subtitle: 'Glacial Blue & Frozen Horizon',
    accentColor: '#38BDF8',
    previewBg: '#18212C',
    previewAccent: '#38BDF8',
  },
  {
    id: 'dune',
    name: 'Dune Almond',
    subtitle: 'Warm Travertine & Desert Gold',
    accentColor: '#FBBF24',
    previewBg: '#26201B',
    previewAccent: '#FBBF24',
  },
];

interface ThemeContextType {
  theme: ColorMode; // 'dark' | 'light'
  palette: PastelPalette;
  activeThemeConfig: ThemeConfig;
  toggleTheme: () => void;
  setColorMode: (m: ColorMode) => void;
  setPalette: (p: PastelPalette) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_MODE_KEY = 'elitematrix_mode_v2';
const THEME_PALETTE_KEY = 'elitematrix_palette_v2';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ColorMode>(() => {
    const saved = localStorage.getItem(THEME_MODE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  const [palette, setPaletteState] = useState<PastelPalette>(() => {
    const saved = localStorage.getItem(THEME_PALETTE_KEY) as PastelPalette;
    return PASTEL_THEMES.some((t) => t.id === saved) ? saved : 'titanium';
  });

  useEffect(() => {
    localStorage.setItem(THEME_MODE_KEY, theme);
    localStorage.setItem(THEME_PALETTE_KEY, palette);

    const root = document.documentElement;

    // Remove all previous theme classes
    root.classList.remove('dark', 'theme-light');
    PASTEL_THEMES.forEach((t) => root.classList.remove(`palette-${t.id}`));

    // Apply color mode
    if (theme === 'light') {
      root.classList.add('theme-light');
    } else {
      root.classList.add('dark');
    }

    // Apply palette class
    root.classList.add(`palette-${palette}`);
    root.setAttribute('data-palette', palette);
    root.setAttribute('data-theme', theme);
  }, [theme, palette]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setColorMode = (m: ColorMode) => setThemeState(m);
  const setPalette = (p: PastelPalette) => setPaletteState(p);

  const activeThemeConfig = PASTEL_THEMES.find((t) => t.id === palette) || PASTEL_THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        palette,
        activeThemeConfig,
        toggleTheme,
        setColorMode,
        setPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
