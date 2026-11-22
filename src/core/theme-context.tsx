import React, { createContext, useContext, useState, useEffect } from 'react';

export type OrganizationThemeId = 'apple-space-black' | 'apple-graphite' | 'apple-titanium';

export interface OrganizationTheme {
  id: OrganizationThemeId;
  name: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const ORGANIZATION_THEMES: Record<OrganizationThemeId, OrganizationTheme> = {
  'apple-space-black': {
    id: 'apple-space-black',
    name: 'Apple Pro Space Black',
    tagline: 'Pure Space Black · Frosted Graphite · System Blue',
    primaryColor: '#0071e3',
    accentColor: '#2997ff',
    surfaceColor: '#161618',
    badgeBg: 'rgba(10, 132, 255, 0.12)',
    badgeBorder: 'rgba(10, 132, 255, 0.32)',
    badgeText: '#2997ff',
  },
  'apple-graphite': {
    id: 'apple-graphite',
    name: 'macOS Studio Graphite',
    tagline: 'Anodized Graphite · Crisp Silver · System Blue',
    primaryColor: '#0a84ff',
    accentColor: '#64d2ff',
    surfaceColor: '#1c1c1e',
    badgeBg: 'rgba(255, 255, 255, 0.08)',
    badgeBorder: 'rgba(255, 255, 255, 0.16)',
    badgeText: '#f5f5f7',
  },
  'apple-titanium': {
    id: 'apple-titanium',
    name: 'Natural Titanium Dark',
    tagline: 'Brushed Titanium · Neutral Silver Monochrome',
    primaryColor: '#a1a1a6',
    accentColor: '#f5f5f7',
    surfaceColor: '#18181b',
    badgeBg: 'rgba(255, 255, 255, 0.08)',
    badgeBorder: 'rgba(255, 255, 255, 0.18)',
    badgeText: '#f5f5f7',
  },
};

interface ThemeContextType {
  theme: OrganizationThemeId;
  setTheme: (theme: OrganizationThemeId) => void;
  currentTheme: OrganizationTheme;
  allThemes: OrganizationTheme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<OrganizationThemeId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hf_cdf_org_theme') as OrganizationThemeId;
      if (saved && ORGANIZATION_THEMES[saved]) return saved;
    }
    return 'apple-space-black';
  });

  const setTheme = (newTheme: OrganizationThemeId) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hf_cdf_org_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const currentTheme = ORGANIZATION_THEMES[theme] || ORGANIZATION_THEMES['apple-space-black'];
  const allThemes = Object.values(ORGANIZATION_THEMES);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme, allThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'apple-space-black' as OrganizationThemeId,
      setTheme: () => {},
      currentTheme: ORGANIZATION_THEMES['apple-space-black'],
      allThemes: Object.values(ORGANIZATION_THEMES),
    };
  }
  return ctx;
};
