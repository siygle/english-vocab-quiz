import { normalizeEnglish } from './quizEngine';

const audioCache = new Map<string, string>();

export async function speakWord(word: string, repeat: number, rate: number): Promise<void> {
  const played = await playDictionaryAudio(word, repeat).catch(() => false);
  if (played) return;
  await speakWithBrowserTts(word, repeat, rate);
}

async function playDictionaryAudio(word: string, repeat: number): Promise<boolean> {
  const key = normalizeEnglish(word);
  if (!key) return false;

  if (!audioCache.has(key)) {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`);
    if (!response.ok) throw new Error('Dictionary audio not found');
    const data = (await response.json()) as Array<{ phonetics?: Array<{ audio?: string }> }>;
    const urls = data
      .flatMap((entry) => entry.phonetics ?? [])
      .map((phonetic) => phonetic.audio)
      .filter((url): url is string => Boolean(url))
      .filter((url) => /\.mp3($|\?)/i.test(url));
    audioCache.set(key, urls[0] ?? '');
  }

  const url = audioCache.get(key);
  if (!url) return false;

  for (let i = 0; i < repeat; i += 1) {
    await playAudioOnce(url);
    if (i < repeat - 1) await wait(450);
  }

  return true;
}

function playAudioOnce(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Audio playback failed'));
    void audio.play().catch(reject);
  });
}

async function speakWithBrowserTts(text: string, repeat: number, rate: number): Promise<void> {
  if (!('speechSynthesis' in window)) {
    alert('此瀏覽器不支援語音播放。');
    return;
  }

  speechSynthesis.cancel();
  for (let i = 0; i < repeat; i += 1) {
    await speakOnce(text, rate);
    if (i < repeat - 1) await wait(350);
  }
}

function speakOnce(text: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1;

    const voice = pickEnglishVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    speechSynthesis.speak(utterance);
  });
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices?.() ?? [];
  return (
    voices.find((voice) => /en[-_]US/i.test(voice.lang) && /Google|Microsoft|Samantha|Alex|Daniel/i.test(voice.name)) ??
    voices.find((voice) => /^en[-_]/i.test(voice.lang)) ??
    null
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
