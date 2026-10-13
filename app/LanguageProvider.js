"use client";

import { createContext, useContext } from "react";

const LanguageContext = createContext("tr");

export function LanguageProvider({ locale, children }) {
  return <LanguageContext.Provider value={locale}>{children}</LanguageContext.Provider>;
}

export function useLocale() {
  return useContext(LanguageContext);
}
