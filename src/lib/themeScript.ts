type ThemeValue = Record<string, string>;

function themeScript(
  attribute: string,
  storageKey: string,
  defaultTheme: string,
  forcedTheme: string | null,
  themes: string[],
  value: ThemeValue | null,
  enableSystem: boolean,
  enableColorScheme: boolean,
) {
  const el = document.documentElement;
  const systemThemes = ['light', 'dark'] as const;
  const isClass = attribute === 'class';
  const classes =
    isClass && value ? themes.map((t: string) => value[t] ?? t) : themes;

  function updateDOM(theme: string): void {
    if (isClass) {
      el.classList.remove(...classes);
      el.classList.add(theme);
    } else {
      el.setAttribute(attribute, theme);
    }

    setColorScheme(theme);
  }

  function setColorScheme(theme: string): void {
    if (enableColorScheme && systemThemes.includes(theme as 'light' | 'dark')) {
      el.style.colorScheme = theme;
    }
  }

  function getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  if (forcedTheme) {
    updateDOM(forcedTheme);
  } else {
    try {
      const themeName = localStorage.getItem(storageKey) ?? defaultTheme;
      const isSystem = enableSystem && themeName === 'system';
      const theme = isSystem ? getSystemTheme() : themeName;
      updateDOM(theme);
    } catch {
      // Handle localStorage access error silently
    }
  }
}

export { themeScript };
