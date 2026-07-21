import type { SupportedLanguageCode, LanguageDetectionResult } from '../types/chatbot';

/**
 * languageDetector — Lightweight client-side language detection using Unicode script ranges.
 *
 * No external API required. Detects 10 Indian languages + English by analyzing
 * the Unicode code points of the input text. Returns the dominant script's language.
 *
 * For Devanagari script (shared by Hindi and Marathi), uses common word heuristics
 * to disambiguate.
 */

interface ScriptRange {
  start: number;
  end: number;
  language: SupportedLanguageCode;
  name: string;
}

/** Unicode ranges for each supported script */
const SCRIPT_RANGES: ScriptRange[] = [
  // Bengali
  { start: 0x0980, end: 0x09FF, language: 'bn', name: 'Bengali' },
  // Tamil
  { start: 0x0B80, end: 0x0BFF, language: 'ta', name: 'Tamil' },
  // Telugu
  { start: 0x0C00, end: 0x0C7F, language: 'te', name: 'Telugu' },
  // Gujarati
  { start: 0x0A80, end: 0x0AFF, language: 'gu', name: 'Gujarati' },
  // Kannada
  { start: 0x0C80, end: 0x0CFF, language: 'kn', name: 'Kannada' },
  // Malayalam
  { start: 0x0D00, end: 0x0D7F, language: 'ml', name: 'Malayalam' },
  // Gurmukhi (Punjabi)
  { start: 0x0A00, end: 0x0A7F, language: 'pa', name: 'Punjabi' },
  // Devanagari (Hindi / Marathi — disambiguated below)
  { start: 0x0900, end: 0x097F, language: 'hi', name: 'Hindi' },
];

/** Common Marathi-specific words for Devanagari disambiguation */
const MARATHI_MARKERS = [
  'आहे', 'नाही', 'मला', 'तुम्ही', 'काय', 'कसे', 'आणि', 'हे', 'त्या',
  'म्हणजे', 'पण', 'सांगा', 'करा', 'होतो', 'होती', 'माझे', 'तुमचे',
  'करणे', 'येतो', 'जातो', 'असतो', 'होते', 'केले',
];

/** Common Hindi-specific words */
const HINDI_MARKERS = [
  'है', 'हैं', 'था', 'नहीं', 'क्या', 'कैसे', 'मुझे', 'आप', 'यह', 'वह',
  'और', 'कर', 'बताओ', 'करो', 'हूं', 'हूँ', 'मेरा', 'तुम्हारा',
  'करना', 'आता', 'जाता', 'होता', 'किया', 'कहा',
];

const LANGUAGE_NAMES: Record<SupportedLanguageCode, string> = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
};

/**
 * Detect the dominant language of the input text.
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || text.trim().length === 0) {
    return { code: 'en', name: 'English', confidence: 'low' };
  }

  const cleaned = text.trim();

  // Count characters matching each script
  const scriptCounts = new Map<SupportedLanguageCode, number>();

  for (const char of cleaned) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;

    for (const range of SCRIPT_RANGES) {
      if (codePoint >= range.start && codePoint <= range.end) {
        scriptCounts.set(
          range.language,
          (scriptCounts.get(range.language) || 0) + 1
        );
        break;
      }
    }
  }

  // If no non-Latin script detected, default to English
  if (scriptCounts.size === 0) {
    return { code: 'en', name: 'English', confidence: 'medium' };
  }

  // Find the dominant script
  let maxCode: SupportedLanguageCode = 'en';
  let maxCount = 0;
  for (const [code, count] of scriptCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxCode = code;
    }
  }

  // Devanagari disambiguation: Hindi vs Marathi
  if (maxCode === 'hi') {
    const words = cleaned.split(/\s+/);
    let marathiScore = 0;
    let hindiScore = 0;

    for (const word of words) {
      if (MARATHI_MARKERS.includes(word)) marathiScore++;
      if (HINDI_MARKERS.includes(word)) hindiScore++;
    }

    if (marathiScore > hindiScore && marathiScore >= 2) {
      maxCode = 'mr';
    }
  }

  const totalChars = cleaned.replace(/\s/g, '').length;
  const ratio = totalChars > 0 ? maxCount / totalChars : 0;

  return {
    code: maxCode,
    name: LANGUAGE_NAMES[maxCode] || maxCode,
    confidence: ratio > 0.5 ? 'high' : ratio > 0.2 ? 'medium' : 'low',
  };
}

/**
 * Get the display name for a language code.
 */
export function getLanguageName(code: SupportedLanguageCode): string {
  return LANGUAGE_NAMES[code] || code;
}
