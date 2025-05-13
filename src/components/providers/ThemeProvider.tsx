import {
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  createContext,
  memo,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';

import { themeScript } from '@/lib/themeScript';

type ValueObject = Record<string, string>;

type UseThemeProps = {
  themes: string[];
  forcedTheme?: string | undefined;
  setTheme: Dispatch<SetStateAction<string>>;
  theme?: string | undefined;
  resolvedTheme?: string | undefined;
  systemTheme?: 'dark' | 'light' | undefined;
};

type Attribute = `data-${string}` | 'class';

type ThemeProviderProps = {
  themes?: string[] | undefined;
  forcedTheme?: string | undefined;
  enableSystem?: boolean | undefined;
  disableTransitionOnChange?: boolean | undefined;
  enableColorScheme?: boolean | undefined;
  storageKey?: string | undefined;
  defaultTheme?: string | undefined;
  attribute?: Attribute | Attribute[] | undefined;
  value?: ValueObject | undefined;
  nonce?: string | undefined;
} & PropsWithChildren;

const colorSchemes = ['light', 'dark'];
const MEDIA = '(prefers-color-scheme: dark)';

const ThemeContext = createContext<UseThemeProps | undefined>(undefined);
const defaultContext: UseThemeProps = {
  setTheme: (_: SetStateAction<string>) => undefined,
  themes: [],
};

function useTheme() {
  return use(ThemeContext) ?? defaultContext;
}

function ThemeProvider(props: ThemeProviderProps) {
  const context = use(ThemeContext);

  if (context) return <>{props.children}</>;
  return <Theme {...props} />;
}

const defaultThemes = ['light', 'dark'];

function Theme({
  forcedTheme,
  disableTransitionOnChange = false,
  enableSystem = true,
  enableColorScheme = true,
  storageKey = 'theme',
  themes = defaultThemes,
  defaultTheme = enableSystem ? 'system' : 'light',
  attribute = 'data-theme',
  value,
  children,
  nonce,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState(() =>
    getTheme(storageKey, defaultTheme),
  );
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    getTheme(storageKey),
  );
  const attrs = !value ? themes : Object.values(value);

  const applyTheme = useCallback(
    (theme: string | undefined) => {
      let resolved = theme;
      if (!resolved) return;

      // If theme is system, resolve it before setting theme
      if (theme === 'system' && enableSystem) {
        resolved = getSystemTheme();
      }

      const name = value ? value[resolved] : resolved;
      const enable = disableTransitionOnChange ? disableAnimation() : null;
      const d = document.documentElement;

      const handleAttribute = (attr: Attribute) => {
        if (attr === 'class') {
          d.classList.remove(...attrs);
          if (name) d.classList.add(name);
        } else if (attr.startsWith('data-')) {
          if (name) {
            d.setAttribute(attr, name);
          } else {
            d.removeAttribute(attr);
          }
        }
      };

      if (Array.isArray(attribute)) attribute.forEach(handleAttribute);
      else handleAttribute(attribute);

      if (enableColorScheme) {
        const fallback = colorSchemes.includes(defaultTheme)
          ? defaultTheme
          : null;
        const colorScheme = colorSchemes.includes(resolved)
          ? resolved
          : fallback;
        // @ts-expect-error - colorScheme is a valid CSS property but missing in TS types
        d.style.colorScheme = colorScheme;
      }

      enable?.();
    },
    [
      attribute,
      attrs,
      defaultTheme,
      disableTransitionOnChange,
      enableColorScheme,
      enableSystem,
      value,
    ],
  );

  const setTheme = useCallback(
    (theme: string | ((prev: string) => string)) => {
      const newTheme = typeof theme === 'function' ? theme(theme) : theme;
      setThemeState(newTheme);

      // Save to storage
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // Unsupported
      }
    },
    [storageKey],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_unused, startTransition] = useTransition();

  const handleMediaQuery = useCallback(
    (e: MediaQueryListEvent | MediaQueryList) => {
      const resolved = getSystemTheme(e);
      requestAnimationFrame(() => {
        setResolvedTheme(resolved);
      });

      if (theme === 'system' && enableSystem && !forcedTheme) {
        applyTheme('system');
      }
    },
    [theme, forcedTheme, enableSystem, applyTheme],
  );

  useEffect(() => {
    const media = window.matchMedia(MEDIA);

    // Intentionally use deprecated listener methods to support iOS & old browsers
    media.addListener(handleMediaQuery);
    handleMediaQuery(media);

    return () => media.removeListener(handleMediaQuery);
  }, [handleMediaQuery]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) {
        return;
      }

      const theme = e.newValue ?? defaultTheme;
      setTheme(theme);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [setTheme, storageKey, defaultTheme]);

  useEffect(() => {
    applyTheme(forcedTheme ?? theme);
  }, [forcedTheme, theme, applyTheme]);

  const providerValue = useMemo(
    () => ({
      theme,
      setTheme,
      forcedTheme,
      resolvedTheme: theme === 'system' ? resolvedTheme : theme,
      themes: enableSystem ? [...themes, 'system'] : themes,
      systemTheme: (enableSystem ? resolvedTheme : undefined) as
        | 'light'
        | 'dark'
        | undefined,
    }),
    [theme, setTheme, forcedTheme, resolvedTheme, enableSystem, themes],
  );

  return (
    <ThemeContext value={providerValue}>
      <ThemeScript
        {...{
          forcedTheme,
          storageKey,
          attribute,
          enableSystem,
          enableColorScheme,
          defaultTheme,
          value,
          themes,
          nonce,
        }}
      />
      {children}
    </ThemeContext>
  );
}

const ThemeScript = memo(
  ({
    forcedTheme,
    storageKey,
    attribute,
    enableSystem,
    enableColorScheme,
    defaultTheme,
    value,
    themes,
    nonce,
  }: Omit<ThemeProviderProps, 'children'> & { defaultTheme: string }) => {
    const scriptArgs = JSON.stringify([
      attribute,
      storageKey,
      defaultTheme,
      forcedTheme,
      themes,
      value,
      enableSystem,
      enableColorScheme,
    ]).slice(1, -1);

    return (
      <script
        suppressHydrationWarning
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `(${themeScript.toString()})(${scriptArgs})`,
        }}
      />
    );
  },
);

function getTheme(key: string, fallback?: string) {
  let theme: string | undefined;
  try {
    theme = localStorage.getItem(key) ?? undefined;
  } catch {
    // Unsupported
  }
  return theme ?? fallback;
}

function disableAnimation() {
  const css = document.createElement('style');
  css.appendChild(
    document.createTextNode(
      '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}',
    ),
  );
  document.head.appendChild(css);

  return () => {
    (() => window.getComputedStyle(document.body))();

    setTimeout(() => {
      document.head.removeChild(css);
    }, 1);
  };
}

function getSystemTheme(e?: MediaQueryList | MediaQueryListEvent) {
  const event = e ?? window.matchMedia(MEDIA);
  const isDark = event.matches;
  const systemTheme = isDark ? 'dark' : 'light';
  return systemTheme;
}

export { ThemeProvider, useTheme };
