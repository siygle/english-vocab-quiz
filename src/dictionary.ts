import { normalizeEnglish, type VocabItem } from './quizEngine';

export type LookupResult = VocabItem & {
  source: string;
};

type MyMemoryResponse = {
  responseData?: {
    translatedText?: string;
  };
  matches?: Array<{
    translation?: string;
  }>;
};

export async function lookupWords(words: string[]): Promise<LookupResult[]> {
  const uniqueWords = Array.from(new Set(words.map(normalizeEnglish).filter(Boolean)));
  return Promise.all(uniqueWords.map(lookupWord));
}

async function lookupWord(word: string): Promise<LookupResult> {
  const translated = await translateWithMyMemory(word).catch(() => '');
  if (translated) return { word, zh: cleanupTranslation(translated), source: 'MyMemory Translate' };

  const exists = await checkDictionaryWord(word).catch(() => false);
  return { word, zh: exists ? '請補上中文意思' : '請確認拼字並補上中文意思', source: 'Dictionary fallback' };
}

async function translateWithMyMemory(word: string): Promise<string> {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', word);
  url.searchParams.set('langpair', 'en|zh-TW');

  const response = await fetch(url);
  if (!response.ok) throw new Error('Translation failed');

  const data = (await response.json()) as MyMemoryResponse;
  const candidates = [data.responseData?.translatedText, ...(data.matches?.map((match) => match.translation) ?? [])]
    .map((value) => cleanupTranslation(value ?? ''))
    .filter(Boolean)
    .filter((value) => normalizeEnglish(value) !== word);

  return candidates[0] ?? '';
}

async function checkDictionaryWord(word: string): Promise<boolean> {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  return response.ok;
}

function cleanupTranslation(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/^[\s,，.;；、]+|[\s,，.;；、]+$/g, '')
    .trim();
}
