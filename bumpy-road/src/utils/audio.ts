/**
 * 100% Native Web Audio API synthesizer + SpeechSynthesis helper.
 * Zero external audio assets required.
 */

const ENGINE_AUDIO_SRC = '/assets/aistudio/5c84b61463ea4_41bacbf2.mp3';
const BGM_AUDIO_SRC = '/assets/aistudio/kulishov-cute-cute-music-629142_16070e83.mp3';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private musicEnabled = false;
  private engineAudio: HTMLAudioElement | null = null;
  private musicAudio: HTMLAudioElement | null = null;
  private musicAudioFailed = false;
  private engineNodes: {
    osc: OscillatorNode;
    subOsc: OscillatorNode;
    lfo: OscillatorNode;
    noise: AudioBufferSourceNode;
    gain: GainNode;
  } | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;

  private getMusicAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || this.musicAudioFailed) return null;
    if (!this.musicAudio) {
      try {
        const audio = new Audio(BGM_AUDIO_SRC);
        audio.loop = true;
        audio.volume = 0.35;
        audio.preload = 'auto';
        audio.onerror = () => {
          this.musicAudioFailed = true;
          this.musicAudio = null;
          if (this.musicEnabled) {
            this.startSynthMusicFallback();
          }
        };
        this.musicAudio = audio;
      } catch {
        this.musicAudioFailed = true;
        return null;
      }
    }
    return this.musicAudio;
  }

  private getEngineAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.engineAudio) {
      try {
        const audio = new Audio(ENGINE_AUDIO_SRC);
        audio.loop = true;
        audio.volume = 0.7;
        audio.preload = 'auto';
        audio.onerror = () => {
          this.engineAudio = null;
        };
        this.engineAudio = audio;
      } catch {
        return null;
      }
    }
    return this.engineAudio;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {
          // Ignore autoplay restriction errors before user gesture
        });
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public unlock() {
    this.ensureContext();
    if (this.musicEnabled && (!this.musicAudio || this.musicAudio.paused)) {
      this.startMusicLoop();
    }
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    if (!enabled) {
      this.stopEngine();
    }
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startMusicLoop();
    } else {
      this.stopMusicLoop();
    }
  }

  public playConnect(stepIndex: number) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const scale = [392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 783.99, 880.0];
      const freq = scale[stepIndex % scale.length];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Ignore Web Audio errors in restricted contexts
    }
  }

  public playUndo() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.1);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playCollect(letterIndex: number) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
      const base = notes[letterIndex % notes.length];

      // Cheerful coin / bubble pop harmonic pair
      [base, base * 1.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        const t = now + i * 0.045;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.04, t + 0.12);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(i === 0 ? 0.18 : 0.12, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playBump() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Gentle cartoon boing + soft thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(210, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(125, now + 0.34);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playBoom() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Deep punchy sub-bass boom drop
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(155, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.46);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.55, now + 0.015);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.54);

      // 2. Warm triangle thump layer
      const bodyOsc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(110, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(26, now + 0.34);

      bodyGain.gain.setValueAtTime(0.001, now);
      bodyGain.gain.linearRampToValueAtTime(0.38, now + 0.01);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.38);

      // 3. Explosive noise blast with sweeping low-pass filter
      const sampleRate = ctx.sampleRate > 0 ? ctx.sampleRate : 44100;
      const duration = 0.85;
      const bufferLen = Math.max(1, Math.floor(sampleRate * duration));
      const noiseBuffer = ctx.createBuffer(1, bufferLen, sampleRate);
      const channelData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferLen; i++) {
        channelData[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(1.4, now);
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.72);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.52, now + 0.012);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.82);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playVictory() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const melody = [
        { f: 523.25, t: 0.0, d: 0.14 },
        { f: 659.25, t: 0.11, d: 0.14 },
        { f: 783.99, t: 0.22, d: 0.14 },
        { f: 1046.5, t: 0.34, d: 0.38 },
        { f: 783.99, t: 0.52, d: 0.14 },
        { f: 1046.5, t: 0.65, d: 0.45 },
      ];

      for (const note of melody) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + note.t;
        osc.frequency.setValueAtTime(note.f, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + note.d + 0.02);
      }
    } catch {
      // Ignore Web Audio errors
    }
  }

  public startEngine() {
    if (!this.sfxEnabled) return;
    const audio = this.getEngineAudio();
    if (audio) {
      try {
        if (audio.readyState > 0) {
          audio.currentTime = 0;
        }
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            this.startSynthEngineFallback();
          });
        }
        return;
      } catch {
        // Fallback below if HTMLAudio playback fails
      }
    }
    this.startSynthEngineFallback();
  }

  private startSynthEngineFallback() {
    if (!this.sfxEnabled || this.engineNodes) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(72, now);
      osc.frequency.exponentialRampToValueAtTime(145, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(108, now + 0.38);

      const subOsc = ctx.createOscillator();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(36, now);
      subOsc.frequency.exponentialRampToValueAtTime(72.5, now + 0.18);
      subOsc.frequency.exponentialRampToValueAtTime(54, now + 0.38);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(2.4, now);
      filter.frequency.setValueAtTime(260, now);
      filter.frequency.exponentialRampToValueAtTime(580, now + 0.18);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.38);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(16, now);
      lfoGain.gain.setValueAtTime(16, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const sampleRate = ctx.sampleRate > 0 ? ctx.sampleRate : 44100;
      const bufferLen = Math.max(1, Math.floor(sampleRate * 1.0));
      const noiseBuffer = ctx.createBuffer(1, bufferLen, sampleRate);
      const channelData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferLen; i++) {
        channelData[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(650, now);
      noiseFilter.Q.setValueAtTime(1.2, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.028, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.08);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(gain);

      gain.connect(ctx.destination);

      osc.start(now);
      subOsc.start(now);
      lfo.start(now);
      noise.start(now);

      this.engineNodes = { osc, subOsc, lfo, noise, gain };
    } catch {
      this.engineNodes = null;
    }
  }

  public stopEngine() {
    if (this.engineAudio) {
      try {
        this.engineAudio.pause();
        if (this.engineAudio.readyState > 0) {
          this.engineAudio.currentTime = 0;
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    if (!this.engineNodes || !this.ctx) return;
    const { osc, subOsc, lfo, noise, gain } = this.engineNodes;
    this.engineNodes = null;
    try {
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      osc.stop(now + 0.11);
      subOsc.stop(now + 0.11);
      lfo.stop(now + 0.11);
      noise.stop(now + 0.11);
    } catch {
      // Ignore cleanup errors
    }
  }

  private startMusicLoop() {
    if (!this.musicEnabled) return;
    const audio = this.getMusicAudio();
    if (audio) {
      if (this.musicTimer !== null) {
        window.clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
      try {
        if (!audio.paused) return;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err: unknown) => {
            const name = err && typeof err === 'object' && 'name' in err ? String((err as { name?: unknown }).name) : '';
            if (name !== 'NotAllowedError' && this.musicEnabled) {
              this.startSynthMusicFallback();
            }
          });
        }
        return;
      } catch {
        // Fallback below if HTMLAudio playback throws synchronously
      }
    }
    this.startSynthMusicFallback();
  }

  private startSynthMusicFallback() {
    if (!this.musicEnabled || this.musicTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Gentle marimba-like C major pentatonic melody fallback
    const pattern = [
      523.25, 659.25, 783.99, 659.25,
      587.33, 659.25, 523.25, 0,
      523.25, 659.25, 880.0, 783.99,
      659.25, 587.33, 523.25, 0,
    ];

    const playStep = () => {
      if (!this.musicEnabled) return;
      const audioCtx = this.ensureContext();
      if (!audioCtx) return;

      try {
        const freq = pattern[this.musicStep % pattern.length];
        this.musicStep++;

        if (freq > 0) {
          const now = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.045, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.34);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.36);
        }
      } catch {
        // Ignore music step errors
      }
    };

    playStep();
    this.musicTimer = window.setInterval(playStep, 360);
  }

  private stopMusicLoop() {
    if (this.musicAudio) {
      try {
        this.musicAudio.pause();
      } catch {
        // Ignore pause errors
      }
    }
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();

const PRONUNCIATION_AUDIO_MAX_CACHE = 40;
const wordAudioCache = new Map<string, HTMLAudioElement>();
let activeWordAudio: HTMLAudioElement | null = null;
let activeSpeakCancel: (() => void) | null = null;
let activeSpeakSafetyTimer: number | null = null;
let activeSpeakToken = 0;
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    const list = window.speechSynthesis.getVoices();
    if (list.length > 0) {
      cachedVoices = list;
    }
    return cachedVoices;
  } catch {
    return [];
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  try {
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
  } catch {
    // Ignore listener attachment errors in restricted environments
  }
}

function getPronunciationAudioUrl(cleanWord: string): string {
  // Standard American English (type=2) studio word pronunciation
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanWord)}&type=2`;
}

function scoreEnglishVoice(voice: SpeechSynthesisVoice): number {
  const lang = (voice.lang || '').toLowerCase();
  if (!lang.startsWith('en')) return -999;

  const name = voice.name || '';
  let score = 0;

  if (lang === 'en-us' || lang === 'en_us') score += 45;
  else if (lang === 'en-gb' || lang === 'en_gb') score += 28;
  else score += 10;

  // Strongly prefer natural / neural / studio / enhanced voices
  if (/(natural|neural|online|wavenet|studio|enhanced|premium|siri)/i.test(name)) {
    score += 120;
  }
  if (/google us english/i.test(name)) score += 90;
  else if (/google uk english/i.test(name)) score += 75;
  else if (/google/i.test(name)) score += 60;

  if (/(aria|jenny|guy|ava|allison|samantha|daniel|karen|serena|alex|andrew|emma)/i.test(name)) {
    score += 45;
  }

  // Strongly penalize old robotic SAPI / Linux eSpeak voices
  if (/(zira|david|mark|hazel|george|susan|heera|ravi|espeak|festival|mbrola|flite)/i.test(name)) {
    score -= 120;
  }

  if (!voice.localService) {
    score += 8;
  }

  return score;
}

function getBestEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = refreshVoices();
  if (voices.length === 0) return null;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const voice of voices) {
    const s = scoreEnglishVoice(voice);
    if (s > bestScore) {
      bestScore = s;
      best = voice;
    }
  }
  return bestScore > -500 ? best : null;
}

function speakWithWebSpeech(cleanWord: string, token: number, onDone: () => void) {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    onDone();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(cleanWord);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const preferred = getBestEnglishVoice();
    if (preferred) {
      utterance.voice = preferred;
      if (preferred.lang) {
        utterance.lang = preferred.lang;
      }
    }

    if (activeSpeakSafetyTimer !== null) {
      window.clearTimeout(activeSpeakSafetyTimer);
      activeSpeakSafetyTimer = null;
    }
    const safetyTimer = window.setTimeout(() => {
      if (activeSpeakSafetyTimer === safetyTimer) {
        activeSpeakSafetyTimer = null;
      }
      if (token === activeSpeakToken) onDone();
    }, 3500);
    activeSpeakSafetyTimer = safetyTimer;

    const finish = () => {
      window.clearTimeout(safetyTimer);
      if (activeSpeakSafetyTimer === safetyTimer) {
        activeSpeakSafetyTimer = null;
      }
      onDone();
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  } catch {
    onDone();
  }
}

function isSingleDictionaryWord(text: string): boolean {
  return /^[a-zA-Z]+(?:-[a-zA-Z]+)?$/.test(text);
}

export function preloadWordAudio(word: string): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const clean = (word ?? '').trim().toLowerCase();
  if (!clean || !isSingleDictionaryWord(clean) || wordAudioCache.has(clean)) return;

  try {
    if (wordAudioCache.size >= PRONUNCIATION_AUDIO_MAX_CACHE) {
      const oldestKey = wordAudioCache.keys().next().value;
      if (oldestKey !== undefined) {
        wordAudioCache.delete(oldestKey);
      }
    }
    const audio = new Audio(getPronunciationAudioUrl(clean));
    audio.preload = 'auto';
    audio.onerror = () => {
      wordAudioCache.delete(clean);
    };
    wordAudioCache.set(clean, audio);
  } catch {
    // Ignore preload failures (e.g., offline)
  }
}

export function speakWord(word: string, onEnd?: () => void): void {
  const clean = word.trim().toLowerCase();
  if (typeof window === 'undefined' || !clean) {
    onEnd?.();
    return;
  }

  // Cancel any prior active playback & settle its callback cleanly
  if (activeSpeakSafetyTimer !== null) {
    window.clearTimeout(activeSpeakSafetyTimer);
    activeSpeakSafetyTimer = null;
  }
  if (activeSpeakCancel) {
    activeSpeakCancel();
    activeSpeakCancel = null;
  }
  if (activeWordAudio) {
    try {
      activeWordAudio.onplaying = null;
      activeWordAudio.onended = null;
      activeWordAudio.onerror = null;
      activeWordAudio.pause();
      if (activeWordAudio.readyState > 0) {
        activeWordAudio.currentTime = 0;
      }
    } catch {
      // Ignore cleanup errors
    }
    activeWordAudio = null;
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancel errors
    }
  }

  const token = ++activeSpeakToken;
  let settled = false;
  const finishOnce = () => {
    if (settled) return;
    settled = true;
    if (activeSpeakToken === token) {
      activeSpeakCancel = null;
    }
    try {
      onEnd?.();
    } catch {
      // Ignore callback errors
    }
  };
  activeSpeakCancel = finishOnce;

  if (!isSingleDictionaryWord(clean)) {
    speakWithWebSpeech(word.trim(), token, finishOnce);
    return;
  }

  try {
    let audio = wordAudioCache.get(clean);
    if (!audio) {
      audio = new Audio(getPronunciationAudioUrl(clean));
      audio.preload = 'auto';
      if (wordAudioCache.size < PRONUNCIATION_AUDIO_MAX_CACHE) {
        wordAudioCache.set(clean, audio);
      }
    }

    if (audio.readyState > 0) {
      audio.currentTime = 0;
    }
    audio.volume = 1;
    activeWordAudio = audio;

    let fellBack = false;
    let loadTimer: number | null = window.setTimeout(() => {
      if (token !== activeSpeakToken || settled || fellBack) return;
      fellBack = true;
      try {
        audio?.pause();
      } catch {
        // Ignore
      }
      wordAudioCache.delete(clean);
      speakWithWebSpeech(clean, token, finishOnce);
    }, 1800);

    const clearLoadTimer = () => {
      if (loadTimer !== null) {
        window.clearTimeout(loadTimer);
        loadTimer = null;
      }
    };

    audio.onplaying = () => {
      clearLoadTimer();
    };

    audio.onended = () => {
      clearLoadTimer();
      if (activeWordAudio === audio) {
        activeWordAudio = null;
      }
      finishOnce();
    };

    audio.onerror = () => {
      clearLoadTimer();
      wordAudioCache.delete(clean);
      if (activeWordAudio === audio) {
        activeWordAudio = null;
      }
      if (token !== activeSpeakToken || settled || fellBack) return;
      fellBack = true;
      speakWithWebSpeech(clean, token, finishOnce);
    };

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        clearLoadTimer();
        if (activeWordAudio === audio) {
          activeWordAudio = null;
        }
        if (token !== activeSpeakToken || settled || fellBack) return;
        fellBack = true;
        speakWithWebSpeech(clean, token, finishOnce);
      });
    }
  } catch {
    speakWithWebSpeech(clean, token, finishOnce);
  }
}
