import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "mng-homepage-language";
const SUPPORTED = new Set(["ko", "en"]);

const LanguageContext = createContext(null);

function getInitialLanguage() {
  if (typeof window === "undefined") {
    return "en";
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.has(saved)) {
    return saved;
  }

  const browserLanguage = (window.navigator.language || "").toLowerCase();
  return browserLanguage.startsWith("ko") ? "ko" : "en";
}

function resolveLocalizedValue(language, value) {
  if (value && typeof value === "object" && !Array.isArray(value) && ("ko" in value || "en" in value)) {
    if (language === "ko") {
      return value.ko ?? value.en ?? "";
    }
    return value.en ?? value.ko ?? "";
  }
  return value ?? "";
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore storage failures and keep in-memory state.
    }
  }, [language]);

  const setLanguageSafe = useCallback((nextLanguage) => {
    if (SUPPORTED.has(nextLanguage)) {
      setLanguage(nextLanguage);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "ko" ? "en" : "ko"));
  }, []);

  const t = useCallback((value) => resolveLocalizedValue(language, value), [language]);

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage: setLanguageSafe,
      toggleLanguage,
      t,
      isKorean: language === "ko",
    }),
    [language, setLanguageSafe, t, toggleLanguage]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
