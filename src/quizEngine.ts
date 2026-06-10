export type QuizMode = 'card' | 'audio';

export type VocabItem = {
  word: string;
  zh: string;
};

export type Question = VocabItem & {
  mode: QuizMode;
};

export type Answer = Question & {
  en: string;
  zhAnswer: string;
  enOk: boolean;
  zhOk: boolean;
  ok: boolean;
};

export function parseBank(text: string): VocabItem[] {
  const source = text.trim();
  if (!source) return [];

  if (source.startsWith('[')) {
    const parsed = JSON.parse(source) as Array<Record<string, string>>;
    return parsed
      .map((item) => ({ word: item.english || item.word, zh: item.chinese || item.zh || item.meaning }))
      .filter((item): item is VocabItem => Boolean(item.word && item.zh));
  }

  return source
    .split(/\r?\n/)
    .map((line) => {
      const [word, ...rest] = line.split(',');
      return { word: word?.trim() ?? '', zh: rest.join(',').trim() };
    })
    .filter((item) => item.word && item.zh);
}

export function buildQuestions(bank: VocabItem[], modes: QuizMode[], count: number): Question[] {
  const expanded = bank.flatMap((item) => modes.map((mode) => ({ ...item, mode })));
  const shuffled = shuffle(expanded);
  return count > 0 ? shuffled.slice(0, count) : shuffled;
}

export function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function normalizeEnglish(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

export function maskWord(word: string, ratio: number): string {
  const chars = [...word];
  const letterIndexes = chars.map((char, index) => (/[a-z]/i.test(char) ? index : -1)).filter((index) => index >= 0);
  const keep = new Set([letterIndexes[0], letterIndexes.at(-1)]);
  const hideCount = Math.max(1, Math.floor(letterIndexes.length * ratio));

  shuffle(letterIndexes.filter((index) => !keep.has(index)))
    .slice(0, hideCount)
    .forEach((index) => {
      chars[index] = '_';
    });

  return chars.join(' ');
}

export function isChineseClose(answer: string, expected: string): boolean {
  const normalizedAnswer = normalizeChinese(answer);
  const normalizedExpected = normalizeChinese(expected);
  if (!normalizedAnswer || !normalizedExpected) return false;

  const meanings = expected.split(/[;；、/｜|,，]/).map(normalizeChinese).filter(Boolean);
  if (meanings.some((meaning) => normalizedAnswer.includes(meaning) || meaning.includes(normalizedAnswer))) return true;

  return meanings.some((meaning) => similarity(normalizedAnswer, meaning) >= 0.62);
}

export function gradeAnswer(question: Question, en: string, zhAnswer: string): Answer {
  const enOk = normalizeEnglish(en) === normalizeEnglish(question.word);
  const zhOk = isChineseClose(zhAnswer, question.zh);
  return { ...question, en, zhAnswer, enOk, zhOk, ok: enOk && zhOk };
}

function normalizeChinese(value: string): string {
  return value.replace(/[\s，,。.;；、的了]/g, '').trim();
}

function similarity(a: string, b: string): number {
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length, 1);
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }

  return dp[a.length][b.length];
}
