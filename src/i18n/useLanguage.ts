import * as React from "react"
import { type Language, type TranslationDictionary, translations } from "./translations"

const LANGUAGE_STORAGE_KEY = "geonexus.language"

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (saved === "en" || saved === "es") {
      return saved
    }
  } catch {}
  return "es" // Español por defecto
}

export function useLanguage() {
  const [language, setLangState] = React.useState<Language>(getInitialLanguage)

  React.useEffect(() => {
    const handleStorageChange = (e: CustomEvent<{ language: Language }>) => {
      if (e.detail?.language && (e.detail.language === "es" || e.detail.language === "en")) {
        setLangState(e.detail.language)
      }
    }

    window.addEventListener("geonexus:language-changed" as any, handleStorageChange)
    return () => {
      window.removeEventListener("geonexus:language-changed" as any, handleStorageChange)
    }
  }, [])

  const setLanguage = React.useCallback((newLang: Language) => {
    setLangState(newLang)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang)
    } catch {}
    window.dispatchEvent(
      new CustomEvent("geonexus:language-changed", { detail: { language: newLang } })
    )
  }, [])

  const t: TranslationDictionary = translations[language]

  return {
    language,
    setLanguage,
    t,
    isSpanish: language === "es",
    isEnglish: language === "en",
  }
}
