// The languages a handbook can be read in. Every handbook is written in English first; any other
// language is a translation of that English book, made once and shared like any book.
// Imported by the interface too (for the picker), so keep it free of server-only code.

export const ENGLISH = "English";

export type LanguageInfo = {
  name: string;      // stored on books and handbooks, and given to the model
  code: string;      // BCP 47, for the page's lang attribute
  label: string;     // how the picker shows it, in its own script
  indian: boolean;   // translated by Sarvam (Indian languages), else by Gemini
};

// Indian: the eight most-spoken Indian languages Sarvam is strongest in, by speakers. International:
// English and four of the most-spoken left-to-right languages (right-to-left ones wait until the layout can mirror).
export const LANGUAGES: LanguageInfo[] = [
  { name: "English", code: "en", label: "English", indian: false },
  { name: "Hindi", code: "hi", label: "हिन्दी", indian: true },
  { name: "Bengali", code: "bn", label: "বাংলা", indian: true },
  { name: "Marathi", code: "mr", label: "मराठी", indian: true },
  { name: "Telugu", code: "te", label: "తెలుగు", indian: true },
  { name: "Tamil", code: "ta", label: "தமிழ்", indian: true },
  { name: "Gujarati", code: "gu", label: "ગુજરાતી", indian: true },
  { name: "Kannada", code: "kn", label: "ಕನ್ನಡ", indian: true },
  { name: "Malayalam", code: "ml", label: "മലയാളം", indian: true },
  { name: "Spanish", code: "es", label: "Español", indian: false },
  { name: "French", code: "fr", label: "Français", indian: false },
  { name: "Portuguese", code: "pt", label: "Português", indian: false },
  { name: "German", code: "de", label: "Deutsch", indian: false },
];

export function languageInfo(name: string): LanguageInfo | undefined {
  return LANGUAGES.find((l) => l.name === name);
}
