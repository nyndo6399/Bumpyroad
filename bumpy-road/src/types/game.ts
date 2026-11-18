export type AppScreen = 'home' | 'setup' | 'play';

export type GameMode = 'spell' | 'quiz';

export interface WordItem {
  id: string;
  word: string;
  imageDataUrl: string;
  rawImageDataUrl?: string;
  bgRemoved?: boolean;
}

export type QuizQuestionType = 'text-question' | 'image-question';
export type QuizAnswerType = 'text' | 'image';

export interface QuizItem {
  id: string;
  questionType?: QuizQuestionType;
  answerType?: QuizAnswerType;
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  correctAnswerImage?: string;
  wrongAnswerImages?: string[];
  imageDataUrl?: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  words: WordItem[];
  quizzes?: QuizItem[];
}

export interface AudioSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
}

export interface CarSettings {
  customCarDataUrl: string | null;
  rawCarDataUrl?: string | null;
  removeBg: boolean;
  bgTolerance: number;
  scale: number;
  flipX?: boolean;
  customBoomCarDataUrl?: string | null;
  rawBoomCarDataUrl?: string | null;
  boomRemoveBg?: boolean;
  boomBgTolerance?: number;
  boomScale?: number;
  boomFlipX?: boolean;
}

export interface LetterNode {
  id: string;
  char: string;
  indexInWord: number;
  x: number;
  y: number;
  radius: number;
  fillColor: string;
  rimColor: string;
  textColor: string;
  collected: boolean;
}

export interface QuizNode {
  id: string;
  text: string;
  imageDataUrl?: string;
  isCorrect: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  rimColor: string;
  textColor: string;
  collected: boolean;
}

export interface FlyingLetter {
  id: string;
  char: string;
  targetSlotIndex: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  fillColor: string;
  rimColor: string;
  startTime: number;
  duration: number;
}

export type PlayPhase = 'drawing' | 'driving' | 'bumping' | 'won';
