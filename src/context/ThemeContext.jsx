import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import themeLight from '../theme/theme';
import themeDark from '../theme/darkTheme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [modoOscuro, setModoOscuro] = useState(() => {
    return localStorage.getItem('modoOscuro') === 'true';
  });

  const toggleTema = () => {
    setModoOscuro(prev => {
      const nuevo = !prev;
      localStorage.setItem('modoOscuro', nuevo);
      return nuevo;
    });
  };

  const theme = useMemo(() => (modoOscuro ? themeDark : themeLight), [modoOscuro]);

  return (
    <ThemeContext.Provider value={{ modoOscuro, toggleTema, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
