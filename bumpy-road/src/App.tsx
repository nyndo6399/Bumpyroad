import React, { useCallback, useEffect, useState } from 'react';
import {
  AppScreen,
  AudioSettings,
  CarSettings,
  ClassRoom,
  GameMode,
  QuizItem,
  WordItem,
} from './types/game';
import {
  DEFAULT_CAR_SETTINGS,
  loadInitialData,
  saveActiveClassId,
  saveAudioSettings,
  saveCarSettings,
  saveClasses,
  saveGameMode,
  savePlaygroundBg,
} from './utils/storage';
import { soundEngine } from './utils/audio';
import { TopBar } from './components/TopBar';
import { HomeScreen } from './components/HomeScreen';
import { TeacherSetup } from './components/TeacherSetup';
import { GameplayScreen } from './components/GameplayScreen';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch() {
    // Error handled cleanly by fallback UI
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-sky-50 p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border-2 border-amber-200 p-8 text-center shadow-xs flex flex-col items-center gap-4">
            <h2 className="font-display font-bold text-2xl text-slate-900">
              Oops! Something went wrong
            </h2>
            <p className="text-slate-600 text-sm">
              Please reload to continue playing Word Drive!
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-b-4 border-emerald-700 cursor-pointer"
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [screen, setScreen] = useState<AppScreen>('home');
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    sfxEnabled: true,
    musicEnabled: false,
  });
  const [hasActivePath, setHasActivePath] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('spell');
  const [carSettings, setCarSettings] = useState<CarSettings>(DEFAULT_CAR_SETTINGS);
  const [playgroundBgDataUrl, setPlaygroundBgDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadInitialData()
      .then((data) => {
        if (!mounted) return;
        setClasses(data.classes);
        setActiveClassId(data.activeClassId);
        setAudioSettings(data.audioSettings);
        setGameMode(data.gameMode);
        setCarSettings(data.carSettings);
        setPlaygroundBgDataUrl(data.playgroundBgDataUrl);
        soundEngine.setSfxEnabled(data.audioSettings.sfxEnabled);
        soundEngine.setMusicEnabled(data.audioSettings.musicEnabled);
        setIsLoaded(true);
      })
      .catch(() => {
        if (!mounted) return;
        setIsLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const persistClasses = useCallback((next: ClassRoom[]) => {
    setClasses(next);
    void saveClasses(next);
  }, []);

  const handleSelectClass = useCallback((classId: string) => {
    setActiveClassId(classId);
    void saveActiveClassId(classId);
  }, []);

  const handleCreateClass = useCallback(
    (name: string) => {
      const now = Date.now();
      const newClass: ClassRoom = {
        id: `class-${now}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        createdAt: now,
        updatedAt: now,
        words: [],
        quizzes: [],
      };
      const next = [...classes, newClass];
      persistClasses(next);
      handleSelectClass(newClass.id);
    },
    [classes, persistClasses, handleSelectClass]
  );

  const handleRenameClass = useCallback(
    (id: string, newName: string) => {
      const next = classes.map((c) =>
        c.id === id ? { ...c, name: newName, updatedAt: Date.now() } : c
      );
      persistClasses(next);
    },
    [classes, persistClasses]
  );

  const handleDeleteClass = useCallback(
    (id: string) => {
      const next = classes.filter((c) => c.id !== id);
      persistClasses(next);
      if (activeClassId === id) {
        handleSelectClass(next[0]?.id ?? '');
      }
    },
    [classes, activeClassId, persistClasses, handleSelectClass]
  );

  const handleAddWord = useCallback(
    (classId: string, item: Omit<WordItem, 'id'>) => {
      const newWord: WordItem = {
        ...item,
        id: `word-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      const next = classes.map((c) =>
        c.id === classId
          ? { ...c, words: [...(c.words ?? []), newWord], updatedAt: Date.now() }
          : c
      );
      persistClasses(next);
    },
    [classes, persistClasses]
  );

  const handleUpdateWord = useCallback(
    (classId: string, wordId: string, updates: Partial<WordItem>) => {
      const next = classes.map((c) =>
        c.id === classId
          ? {
              ...c,
              words: (c.words ?? []).map((w) => (w.id === wordId ? { ...w, ...updates } : w)),
              updatedAt: Date.now(),
            }
          : c
      );
      persistClasses(next);
    },
    [classes, persistClasses]
  );

  const handleDeleteWord = useCallback(
    (classId: string, wordId: string) => {
      const next = classes.map((c) =>
        c.id === classId
          ? {
              ...c,
              words: (c.words ?? []).filter((w) => w.id !== wordId),
              updatedAt: Date.now(),
            }
          : c
      );
      persistClasses(next);
    },
    [classes, persistClasses]
  );

  const handleMoveWord = useCallback(
    (classId: string, index: number, direction: 'up' | 'down') => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const next = classes.map((c) => {
        if (c.id !== classId) return c;
        const copy = [...(c.words ?? [])];
        if (targetIndex < 0 || targetIndex >= copy.length) return c;
        const [moved] = copy.splice(index, 1);
        copy.splice(targetIndex, 0, moved);
        return { ...c, words: copy, updatedAt: Date.now() };
      });
      persistClasses(next);
    },
    [classes, persistClasses]
  );

  const handleAddQuiz = useCallback(
    (classId: string, item: Omit<QuizItem, 'id'>) => {
      const newQuiz: QuizItem = {
        ...item,
        id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      const next = classes.map((c) =>
        c.id === classId
          ? { ...c, quizzes: [...(c.quizzes ?? []), newQuiz], updatedAt: Date.now() }
          : c
      );
      persistClasses(next);
    },
    [classes, persistClasses]
  );

  const handleAddQuizzesBulk = useCallback(
    (classId: string, items: Omit<QuizItem, 'id'>[]) => {
      if (!items.length) return;
      const now = Date.now();
      const newQuizzes: QuizItem[] = items.map((item, idx) => ({
        ...item,
        id: `quiz-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      }));
      const next = classes.map((c) =>
        c.id === classId
          ? { ...c, quizzes: [...(c.quizzes ?? []), ...newQuizzes], updatedAt: now }
          : c
      );
      persistClasses(next);
    },
    [classes, persistClasses]
  );

  const handleUpdateQuiz = useCallback(
    (classId: string, quizId: string, updates: Partial<QuizItem>) => {
      const next = classes.map((c) =>
        c.id === classId
          ? {
              ...c,
              quizzes: (c.quizzes ?? []).map((q) =>
                q.id === quizId ? { ...q, ...updates } : q
              ),
              updatedAt: Date.now(),
            }
          : c
      );
      persistClasses(next);
    },
    [classes, persistClasses]
  );

  const handleDeleteQuiz = useCallback(
    (classId: string, quizId: string) => {
      const next = classes.map((c) =>
        c.id === classId
          ? {
              ...c,
              quizzes: (c.quizzes ?? []).filter((q) => q.id !== quizId),
              updatedAt: Date.now(),
            }
          : c
      );
      persistClasses(next);
    },
    [classes, persistClasses]
  );

  const handleMoveQuiz = useCallback(
    (classId: string, index: number, direction: 'up' | 'down') => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const next = classes.map((c) => {
        if (c.id !== classId) return c;
        const copy = [...(c.quizzes ?? [])];
        if (targetIndex < 0 || targetIndex >= copy.length) return c;
        const [moved] = copy.splice(index, 1);
        copy.splice(targetIndex, 0, moved);
        return { ...c, quizzes: copy, updatedAt: Date.now() };
      });
      persistClasses(next);
    },
    [classes, persistClasses]
  );

  const handleSelectGameMode = useCallback((mode: GameMode) => {
    soundEngine.unlock();
    soundEngine.stopEngine();
    setGameMode(mode);
    setHasActivePath(false);
    void saveGameMode(mode);
  }, []);

  const handleToggleSfx = useCallback(() => {
    soundEngine.unlock();
    setAudioSettings((prev) => {
      const next = { ...prev, sfxEnabled: !prev.sfxEnabled };
      soundEngine.setSfxEnabled(next.sfxEnabled);
      void saveAudioSettings(next);
      return next;
    });
  }, []);

  const handleToggleMusic = useCallback(() => {
    soundEngine.unlock();
    setAudioSettings((prev) => {
      const next = { ...prev, musicEnabled: !prev.musicEnabled };
      soundEngine.setMusicEnabled(next.musicEnabled);
      void saveAudioSettings(next);
      return next;
    });
  }, []);

  const handleResetPath = useCallback(() => {
    if (screen === 'play') {
      setResetSignal((s) => s + 1);
    }
  }, [screen]);

  const handleUpdateCarSettings = useCallback((next: CarSettings) => {
    setCarSettings(next);
    void saveCarSettings(next);
  }, []);

  const handleResetCarSettings = useCallback(() => {
    const reset = { ...DEFAULT_CAR_SETTINGS };
    setCarSettings(reset);
    void saveCarSettings(reset);
  }, []);

  const handleUpdatePlaygroundBg = useCallback((dataUrl: string | null) => {
    setPlaygroundBgDataUrl(dataUrl);
    void savePlaygroundBg(dataUrl);
  }, []);

  const activeClass = classes.find((c) => c.id === activeClassId) ?? classes[0];

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50 text-sky-800 font-display text-xl font-bold">
        Loading Word Drive...
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#f4f9ff] text-slate-900">
        <TopBar
          screen={screen}
          classes={classes}
          activeClassId={activeClass?.id ?? ''}
          gameMode={gameMode}
          audioSettings={audioSettings}
          canResetPath={screen === 'play' && hasActivePath}
          onNavigate={(nextScreen) => {
            soundEngine.unlock();
            if (nextScreen !== 'play') {
              soundEngine.stopEngine();
              setHasActivePath(false);
            }
            setScreen(nextScreen);
          }}
          onSelectClass={(id) => {
            handleSelectClass(id);
            setHasActivePath(false);
          }}
          onSelectGameMode={handleSelectGameMode}
          onToggleSfx={handleToggleSfx}
          onToggleMusic={handleToggleMusic}
          onResetPath={handleResetPath}
        />

        {screen === 'home' && (
          <HomeScreen
            classes={classes}
            activeClass={activeClass}
            gameMode={gameMode}
            onSelectGameMode={handleSelectGameMode}
            onSelectClassAndPlay={(id) => {
              soundEngine.unlock();
              handleSelectClass(id);
              setScreen('play');
            }}
            onStartActiveGame={() => {
              soundEngine.unlock();
              setScreen('play');
            }}
            onOpenSetup={() => setScreen('setup')}
          />
        )}

        {screen === 'setup' && (
          <TeacherSetup
            classes={classes}
            activeClassId={activeClass?.id ?? ''}
            gameMode={gameMode}
            carSettings={carSettings}
            playgroundBgDataUrl={playgroundBgDataUrl}
            onSelectClass={handleSelectClass}
            onCreateClass={handleCreateClass}
            onRenameClass={handleRenameClass}
            onDeleteClass={handleDeleteClass}
            onAddWord={handleAddWord}
            onUpdateWord={handleUpdateWord}
            onDeleteWord={handleDeleteWord}
            onMoveWord={handleMoveWord}
            onAddQuiz={handleAddQuiz}
            onAddQuizzesBulk={handleAddQuizzesBulk}
            onUpdateQuiz={handleUpdateQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            onMoveQuiz={handleMoveQuiz}
            onSelectGameMode={handleSelectGameMode}
            onUpdateCarSettings={handleUpdateCarSettings}
            onResetCarSettings={handleResetCarSettings}
            onUpdatePlaygroundBg={handleUpdatePlaygroundBg}
            onStartGame={() => {
              soundEngine.unlock();
              setScreen('play');
            }}
          />
        )}

        {screen === 'play' && (
          <GameplayScreen
            activeClass={activeClass}
            gameMode={gameMode}
            carSettings={carSettings}
            playgroundBgDataUrl={playgroundBgDataUrl}
            onUpdatePlaygroundBg={handleUpdatePlaygroundBg}
            resetSignal={resetSignal}
            onOpenSetup={() => setScreen('setup')}
            onPathPresenceChange={setHasActivePath}
          />
        )}
      </div>
    </AppErrorBoundary>
  );
}
