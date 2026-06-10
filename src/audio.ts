import { normalizeEnglish } from './quizEngine';

const audioCache = new Map<string, string>();

let playbackToken = 0;
let activeAudio: HTMLAudioElement | null = null;

export function stopSpeech(): void {
  playbackToken += 1;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = '';
    activeAudio.load();
    activeAudio = null;
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

export async function speakWord(word: string, repeat: number, rate: number): Promise<void> {
  stopSpeech();
  const token = playbackToken;
  const played = await playDictionaryAudio(word, repeat, token).catch(() => false);
  if (played || token !== playbackToken) return;
  await speakWithBrowserTts(word, repeat, rate, token);
}

async function playDictionaryAudio(word: string, repeat: number, token: number): Promise<boolean> {
  const key = normalizeEnglish(word);
  if (!key || token !== playbackToken) return false;

  if (!audioCache.has(key)) {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`);
    if (!response.ok) throw new Error('Dictionary audio not found');
    if (token !== playbackToken) return false;

    const data = (await response.json()) as Array<{ phonetics?: Array<{ audio?: string }> }>;
    const urls = data
      .flatMap((entry) => entry.phonetics ?? [])
      .map((phonetic) => phonetic.audio)
      .filter((url): url is string => Boolean(url))
      .filter((url) => /\.mp3($|\?)/i.test(url));
    audioCache.set(key, urls[0] ?? '');
  }

  const url = audioCache.get(key);
  if (!url || token !== playbackToken) return false;

  for (let i = 0; i < repeat; i += 1) {
    if (token !== playbackToken) return false;
    await playAudioOnce(url, token);
    if (i < repeat - 1) await wait(450, token);
  }

  return token === playbackToken;
}

function playAudioOnce(url: string, token: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (token !== playbackToken) {
      resolve();
      return;
    }

    const audio = new Audio(url);
    activeAudio = audio;

    const cleanup = () => {
      if (activeAudio === audio) activeAudio = null;
    };

    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('Audio playback failed'));
    };

    void audio.play().catch((error: unknown) => {
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

async function speakWithBrowserTts(text: string, repeat: number, rate: number, token: number): Promise<void> {
  if (!('speechSynthesis' in window)) {
    alert('此瀏覽器不支援語音播放。');
    return;
  }

  speechSynthesis.cancel();
  for (let i = 0; i < repeat; i += 1) {
    if (token !== playbackToken) return;
    await speakOnce(text, rate, token);
    if (i < repeat - 1) await wait(350, token);
  }
}

function speakOnce(text: string, rate: number, token: number): Promise<void> {
  return new Promise((resolve) => {
    if (token !== playbackToken) {
      resolve();
      return;
    }

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

function wait(ms: number, token: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, token === playbackToken ? ms : 0);
  });
}
