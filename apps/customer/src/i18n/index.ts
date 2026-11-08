import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

export const defaultNS = 'translation';
export const resources = {
  en: { translation: en },
} as const;

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
  lng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes XSS
  },
});

export default i18n;
