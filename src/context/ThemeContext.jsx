import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext(null);

// Light theme only. The dark mode toggle was removed, so the app always
// renders in light mode (any previously saved 'dark' preference is cleared).
const STORAGE_KEY = 'growthkarts_theme';

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};