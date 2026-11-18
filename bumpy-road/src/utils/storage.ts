import { AudioSettings, CarSettings, ClassRoom, GameMode } from '../types/game';
import { createDefaultClasses, getDefaultQuizzesForClass } from './illustrations';

const DB_NAME = 'word-drive-classroom-db';
const DB_VERSION = 1;
const STORE_CLASSES = 'classes';
const STORE_META = 'meta';

const LS_CLASSES_KEY = 'word_drive_classes_v1';
const LS_ACTIVE_CLASS_KEY = 'word_drive_active_class_v1';
const LS_AUDIO_KEY = 'word_drive_audio_v1';
const LS_MODE_KEY = 'word_drive_game_mode_v1';
const LS_SEEDED_KEY = 'word_drive_seeded_v1';
const LS_CAR_KEY = 'word_drive_car_settings_v1';
const LS_BG_KEY = 'word_drive_playground_bg_v1';

export const DEFAULT_CAR_SETTINGS: CarSettings = {
  customCarDataUrl: null,
  rawCarDataUrl: null,
  removeBg: true,
  bgTolerance: 42,
  scale: 1,
  flipX: false,
  customBoomCarDataUrl: null,
  rawBoomCarDataUrl: null,
  boomRemoveBg: true,
  boomBgTolerance: 42,
  boomScale: 1,
  boomFlipX: false,
};

function normalizeCarSettings(raw: unknown): CarSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CAR_SETTINGS };
  const obj = raw as Partial<CarSettings>;
  const scale =
    typeof obj.scale === 'number' && Number.isFinite(obj.scale)
      ? Math.max(0.5, Math.min(1.8, obj.scale))
      : 1;
  const bgTolerance =
    typeof obj.bgTolerance === 'number' && Number.isFinite(obj.bgTolerance)
      ? Math.max(10, Math.min(110, Math.round(obj.bgTolerance)))
      : 42;
  const boomScale =
    typeof obj.boomScale === 'number' && Number.isFinite(obj.boomScale)
      ? Math.max(0.5, Math.min(1.8, obj.boomScale))
      : 1;
  const boomBgTolerance =
    typeof obj.boomBgTolerance === 'number' && Number.isFinite(obj.boomBgTolerance)
      ? Math.max(10, Math.min(110, Math.round(obj.boomBgTolerance)))
      : 42;
  return {
    customCarDataUrl:
      typeof obj.customCarDataUrl === 'string' && obj.customCarDataUrl.trim()
        ? obj.customCarDataUrl
        : null,
    rawCarDataUrl:
      typeof obj.rawCarDataUrl === 'string' && obj.rawCarDataUrl.trim()
        ? obj.rawCarDataUrl
        : null,
    removeBg: typeof obj.removeBg === 'boolean' ? obj.removeBg : true,
    bgTolerance,
    scale,
    flipX: Boolean(obj.flipX),
    customBoomCarDataUrl:
      typeof obj.customBoomCarDataUrl === 'string' && obj.customBoomCarDataUrl.trim()
        ? obj.customBoomCarDataUrl
        : null,
    rawBoomCarDataUrl:
      typeof obj.rawBoomCarDataUrl === 'string' && obj.rawBoomCarDataUrl.trim()
        ? obj.rawBoomCarDataUrl
        : null,
    boomRemoveBg: typeof obj.boomRemoveBg === 'boolean' ? obj.boomRemoveBg : true,
    boomBgTolerance,
    boomScale,
    boomFlipX: Boolean(obj.boomFlipX),
  };
}

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_CLASSES)) {
            db.createObjectStore(STORE_CLASSES, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_META)) {
            db.createObjectStore(STORE_META, { keyPath: 'key' });
          }
        } catch {
          // Ignore upgrade errors and fall back to localStorage
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGetAllClasses(db: IDBDatabase): Promise<ClassRoom[]> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_CLASSES, 'readonly');
      const store = tx.objectStore(STORE_CLASSES);
      const req = store.getAll();
      req.onsuccess = () => {
        const rawItems = Array.isArray(req.result) ? (req.result as ClassRoom[]) : [];
        const items = [...rawItems];
        items.sort((a, b) => (a?.createdAt ?? 0) - (b?.createdAt ?? 0));
        resolve(items);
      };
      req.onerror = () => resolve([]);
      tx.onabort = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function idbSaveAllClasses(db: IDBDatabase, classes: ClassRoom[]): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_CLASSES, 'readwrite');
      const store = tx.objectStore(STORE_CLASSES);
      store.clear();
      for (const cls of classes) {
        store.put(cls);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbGetMeta<T>(db: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? (req.result.value as T) : null);
      req.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSetMeta<T>(db: IDBDatabase, key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_META, 'readwrite');
      const store = tx.objectStore(STORE_META);
      store.put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadInitialData(): Promise<{
  classes: ClassRoom[];
  activeClassId: string;
  audioSettings: AudioSettings;
  gameMode: GameMode;
  carSettings: CarSettings;
  playgroundBgDataUrl: string | null;
}> {
  const db = await openDatabase();
  let classes: ClassRoom[] = [];
  let activeClassId: string | null = null;
  let audioSettings: AudioSettings | null = null;
  let gameMode: GameMode | null = null;
  let carSettingsRaw: unknown = null;
  let playgroundBgDataUrl: string | null = null;
  let seeded: boolean = false;

  if (db) {
    classes = await idbGetAllClasses(db);
    activeClassId = await idbGetMeta<string>(db, 'activeClassId');
    audioSettings = await idbGetMeta<AudioSettings>(db, 'audioSettings');
    gameMode = await idbGetMeta<GameMode>(db, 'gameMode');
    carSettingsRaw = await idbGetMeta<CarSettings>(db, 'carSettings');
    const bgVal = await idbGetMeta<string | null>(db, 'playgroundBg');
    playgroundBgDataUrl = typeof bgVal === 'string' && bgVal.trim() ? bgVal : null;
    seeded = Boolean(await idbGetMeta<boolean>(db, 'seeded'));
  }

  if (!carSettingsRaw) {
    try {
      const rawCar = localStorage.getItem(LS_CAR_KEY);
      if (rawCar) {
        carSettingsRaw = JSON.parse(rawCar);
      }
    } catch {
      // Ignore storage parsing errors
    }
  }

  if (!playgroundBgDataUrl) {
    try {
      const rawBg = localStorage.getItem(LS_BG_KEY);
      if (rawBg && rawBg.trim()) {
        playgroundBgDataUrl = rawBg;
      }
    } catch {
      // Ignore storage parsing errors
    }
  }

  if (classes.length === 0) {
    try {
      const raw = localStorage.getItem(LS_CLASSES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          classes = parsed as ClassRoom[];
        }
      }
      if (!activeClassId) {
        activeClassId = localStorage.getItem(LS_ACTIVE_CLASS_KEY);
      }
      if (!audioSettings) {
        const rawAudio = localStorage.getItem(LS_AUDIO_KEY);
        if (rawAudio) {
          const parsedAudio = JSON.parse(rawAudio);
          if (parsedAudio && typeof parsedAudio === 'object') {
            audioSettings = parsedAudio as AudioSettings;
          }
        }
      }
      if (!gameMode) {
        const rawMode = localStorage.getItem(LS_MODE_KEY);
        if (rawMode === 'spell' || rawMode === 'quiz') {
          gameMode = rawMode;
        }
      }
      if (!seeded) {
        seeded = localStorage.getItem(LS_SEEDED_KEY) === 'true';
      }
    } catch {
      // Ignore storage parsing errors
    }
  }

  if (!seeded && classes.length === 0) {
    classes = createDefaultClasses();
    activeClassId = classes[0]?.id ?? '';
    await saveClasses(classes);
    await saveActiveClassId(activeClassId);
    if (db) {
      await idbSetMeta(db, 'seeded', true);
    }
    try {
      localStorage.setItem(LS_SEEDED_KEY, 'true');
    } catch {
      // Ignore quota errors
    }
  } else if (classes.length > 0) {
    let migrated = false;
    classes = classes
      .filter((cls): cls is ClassRoom => Boolean(cls && typeof cls === 'object' && cls.id))
      .map((cls) => {
        const safeWords = Array.isArray(cls.words)
          ? cls.words
              .filter((w) => Boolean(w && typeof w === 'object' && typeof w.word === 'string' && w.word.trim()))
              .map((w, idx) => ({
                ...w,
                id: typeof w.id === 'string' && w.id ? w.id : `word-${cls.id}-${idx}`,
                word: w.word.trim().toUpperCase(),
                imageDataUrl: typeof w.imageDataUrl === 'string' ? w.imageDataUrl : '',
              }))
          : [];
        const safeQuizzes = Array.isArray(cls.quizzes)
          ? cls.quizzes
              .filter((q) => Boolean(q && typeof q === 'object' && q.id))
              .map((q) => ({
                ...q,
                questionType: q.questionType === 'image-question' ? ('image-question' as const) : q.questionType === 'text-question' ? ('text-question' as const) : undefined,
                answerType: q.answerType === 'image' ? ('image' as const) : q.answerType === 'text' ? ('text' as const) : undefined,
                question: typeof q.question === 'string' ? q.question : '',
                correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : '',
                wrongAnswers: Array.isArray(q.wrongAnswers)
                  ? q.wrongAnswers.filter((x): x is string => typeof x === 'string')
                  : [],
                correctAnswerImage:
                  typeof q.correctAnswerImage === 'string' ? q.correctAnswerImage : undefined,
                wrongAnswerImages: Array.isArray(q.wrongAnswerImages)
                  ? q.wrongAnswerImages.filter((x): x is string => typeof x === 'string')
                  : undefined,
                imageDataUrl: typeof q.imageDataUrl === 'string' ? q.imageDataUrl : undefined,
              }))
          : undefined;

        if (safeQuizzes === undefined) {
          migrated = true;
          return {
            ...cls,
            name: typeof cls.name === 'string' && cls.name ? cls.name : 'My Class',
            words: safeWords,
            quizzes: getDefaultQuizzesForClass(cls.id),
          };
        }
        if (
          (cls.id === 'class-grade1-fruits' || cls.id === 'class-grade2-animals') &&
          safeQuizzes.length === 5 &&
          safeQuizzes.every(
            (q) => !q.questionType && (q.id.startsWith('q-fruit-') || q.id.startsWith('q-animal-'))
          )
        ) {
          migrated = true;
          return {
            ...cls,
            name: typeof cls.name === 'string' && cls.name ? cls.name : 'My Class',
            words: safeWords,
            quizzes: getDefaultQuizzesForClass(cls.id),
          };
        }
        if (safeWords.length !== (Array.isArray(cls.words) ? cls.words.length : 0)) {
          migrated = true;
        }
        return {
          ...cls,
          name: typeof cls.name === 'string' && cls.name ? cls.name : 'My Class',
          words: safeWords,
          quizzes: safeQuizzes,
        };
      });
    if (migrated) {
      await saveClasses(classes);
    }
  }

  if (classes.length > 0 && !classes.some((c) => c.id === activeClassId)) {
    activeClassId = classes[0].id;
  }

  const safeAudioSettings: AudioSettings = {
    sfxEnabled: audioSettings && typeof audioSettings.sfxEnabled === 'boolean' ? audioSettings.sfxEnabled : true,
    musicEnabled: audioSettings && typeof audioSettings.musicEnabled === 'boolean' ? audioSettings.musicEnabled : false,
  };

  return {
    classes,
    activeClassId: activeClassId ?? '',
    audioSettings: safeAudioSettings,
    gameMode: gameMode === 'quiz' ? 'quiz' : 'spell',
    carSettings: normalizeCarSettings(carSettingsRaw),
    playgroundBgDataUrl,
  };
}

export async function saveClasses(classes: ClassRoom[]): Promise<void> {
  const db = await openDatabase();
  if (db) {
    await idbSaveAllClasses(db, classes);
  }
  try {
    localStorage.setItem(LS_CLASSES_KEY, JSON.stringify(classes));
  } catch {
    // Ignore localStorage quota exceeded when large images are stored in IndexedDB
  }
}

export async function saveActiveClassId(activeClassId: string): Promise<void> {
  const db = await openDatabase();
  if (db) {
    await idbSetMeta(db, 'activeClassId', activeClassId);
  }
  try {
    localStorage.setItem(LS_ACTIVE_CLASS_KEY, activeClassId);
  } catch {
    // Ignore
  }
}

export async function saveAudioSettings(settings: AudioSettings): Promise<void> {
  const db = await openDatabase();
  if (db) {
    await idbSetMeta(db, 'audioSettings', settings);
  }
  try {
    localStorage.setItem(LS_AUDIO_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export async function saveGameMode(mode: GameMode): Promise<void> {
  const db = await openDatabase();
  if (db) {
    await idbSetMeta(db, 'gameMode', mode);
  }
  try {
    localStorage.setItem(LS_MODE_KEY, mode);
  } catch {
    // Ignore
  }
}

export async function saveCarSettings(settings: CarSettings): Promise<void> {
  const normalized = normalizeCarSettings(settings);
  const db = await openDatabase();
  if (db) {
    await idbSetMeta(db, 'carSettings', normalized);
  }
  try {
    localStorage.setItem(LS_CAR_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore quota exceeded if large data URL is stored in IndexedDB
  }
}

export async function savePlaygroundBg(dataUrl: string | null): Promise<void> {
  const clean = typeof dataUrl === 'string' && dataUrl.trim() ? dataUrl : null;
  const db = await openDatabase();
  if (db) {
    await idbSetMeta(db, 'playgroundBg', clean);
  }
  try {
    if (clean) {
      localStorage.setItem(LS_BG_KEY, clean);
    } else {
      localStorage.removeItem(LS_BG_KEY);
    }
  } catch {
    // Ignore quota exceeded if large data URL is stored in IndexedDB
  }
}
