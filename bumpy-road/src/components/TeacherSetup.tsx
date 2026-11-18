import React, { useMemo, useRef, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Upload,
  Wand2,
  ArrowUp,
  ArrowDown,
  Play,
  Image as ImageIcon,
  FolderOpen,
  Link2,
  Type,
  HelpCircle,
  Car,
  RotateCcw,
  FlipHorizontal2,
  ListPlus,
  FileUp,
  Sparkles,
  ImagePlus,
} from 'lucide-react';
import {
  CarSettings,
  ClassRoom,
  GameMode,
  QuizAnswerType,
  QuizItem,
  QuizQuestionType,
  WordItem,
} from '../types/game';
import { STICKER_PRESETS, getStickerByWord } from '../utils/illustrations';
import {
  fileToDataUrl,
  processCarImage,
  removeWhiteBackground,
  resizeBackgroundDataUrl,
  resizeImageDataUrl,
} from '../utils/imageProcessor';
import { BULK_QUIZ_SAMPLE, parseBulkQuizText } from '../utils/quizBulkParser';
import { CartoonLetterTile } from './CartoonLetterTile';
import { QuizImagePicker } from './QuizImagePicker';

const DEFAULT_CAR_PREVIEW_SRC =
  '/assets/aistudio/1794577203694_8202540140519589570_8202540140519589570_9d096bc92fd8c2e57e2410821cdb135f_148b7084.jpg';

const DEFAULT_BOOM_CAR_PREVIEW_SRC =
  '/assets/aistudio/Capybara_with_soot-covered_face_5ca7f4ef_92126732.jpg';

const DEFAULT_BG_PREVIEW_SRC =
  '/assets/aistudio/Create_cartoon_grass_field_backg__51e75dca_526808d2.jpg';

interface TeacherSetupProps {
  classes: ClassRoom[];
  activeClassId: string;
  gameMode: GameMode;
  carSettings: CarSettings;
  playgroundBgDataUrl?: string | null;
  onSelectClass: (id: string) => void;
  onCreateClass: (name: string) => void;
  onRenameClass: (id: string, newName: string) => void;
  onDeleteClass: (id: string) => void;
  onAddWord: (classId: string, item: Omit<WordItem, 'id'>) => void;
  onUpdateWord: (classId: string, wordId: string, updates: Partial<WordItem>) => void;
  onDeleteWord: (classId: string, wordId: string) => void;
  onMoveWord: (classId: string, index: number, direction: 'up' | 'down') => void;
  onAddQuiz: (classId: string, item: Omit<QuizItem, 'id'>) => void;
  onAddQuizzesBulk?: (classId: string, items: Omit<QuizItem, 'id'>[]) => void;
  onUpdateQuiz: (classId: string, quizId: string, updates: Partial<QuizItem>) => void;
  onDeleteQuiz: (classId: string, quizId: string) => void;
  onMoveQuiz: (classId: string, index: number, direction: 'up' | 'down') => void;
  onSelectGameMode: (mode: GameMode) => void;
  onUpdateCarSettings: (settings: CarSettings) => void;
  onResetCarSettings: () => void;
  onUpdatePlaygroundBg?: (dataUrl: string | null) => void;
  onStartGame: () => void;
}

function sanitizeWord(input: string): string {
  return input.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 12);
}

export const TeacherSetup: React.FC<TeacherSetupProps> = ({
  classes,
  activeClassId,
  gameMode,
  carSettings,
  playgroundBgDataUrl,
  onSelectClass,
  onCreateClass,
  onRenameClass,
  onDeleteClass,
  onAddWord,
  onUpdateWord,
  onDeleteWord,
  onMoveWord,
  onAddQuiz,
  onAddQuizzesBulk,
  onUpdateQuiz,
  onDeleteQuiz,
  onMoveQuiz,
  onSelectGameMode,
  onUpdateCarSettings,
  onResetCarSettings,
  onUpdatePlaygroundBg,
  onStartGame,
}) => {
  const activeClass = classes.find((c) => c.id === activeClassId) ?? classes[0];
  const quizzes = activeClass?.quizzes ?? [];

  // Class Management State
  const [newClassName, setNewClassName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);

  // Add Word Form State
  const [newWordText, setNewWordText] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [rawUploadDataUrl, setRawUploadDataUrl] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>(STICKER_PRESETS[0].dataUrl);
  const [removeBgEnabled, setRemoveBgEnabled] = useState(true);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Word Inline State
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editWordText, setEditWordText] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editRawDataUrl, setEditRawDataUrl] = useState<string | null>(null);
  const [editPreviewDataUrl, setEditPreviewDataUrl] = useState<string>('');
  const [editRemoveBg, setEditRemoveBg] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Add Quiz Question Form State
  const [quizQuestionType, setQuizQuestionType] =
    useState<QuizQuestionType>('text-question');
  const [quizAnswerType, setQuizAnswerType] = useState<QuizAnswerType>('text');
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizCorrect, setQuizCorrect] = useState('');
  const [quizWrong1, setQuizWrong1] = useState('');
  const [quizWrong2, setQuizWrong2] = useState('');
  const [quizWrong3, setQuizWrong3] = useState('');
  const [quizCorrectImg, setQuizCorrectImg] = useState('');
  const [quizWrong1Img, setQuizWrong1Img] = useState('');
  const [quizWrong2Img, setQuizWrong2Img] = useState('');
  const [quizWrong3Img, setQuizWrong3Img] = useState('');
  const [quizImageUrl, setQuizImageUrl] = useState('');
  const [quizFormError, setQuizFormError] = useState<string | null>(null);

  // Edit Quiz Inline State
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [editQuizQuestionType, setEditQuizQuestionType] =
    useState<QuizQuestionType>('text-question');
  const [editQuizAnswerType, setEditQuizAnswerType] =
    useState<QuizAnswerType>('text');
  const [editQuizQuestion, setEditQuizQuestion] = useState('');
  const [editQuizCorrect, setEditQuizCorrect] = useState('');
  const [editQuizWrong1, setEditQuizWrong1] = useState('');
  const [editQuizWrong2, setEditQuizWrong2] = useState('');
  const [editQuizWrong3, setEditQuizWrong3] = useState('');
  const [editQuizCorrectImg, setEditQuizCorrectImg] = useState('');
  const [editQuizWrong1Img, setEditQuizWrong1Img] = useState('');
  const [editQuizWrong2Img, setEditQuizWrong2Img] = useState('');
  const [editQuizWrong3Img, setEditQuizWrong3Img] = useState('');
  const [editQuizImageUrl, setEditQuizImageUrl] = useState('');

  // Custom Car Upload & Resize State ('normal' = driving car, 'boom' = wrong-choice car)
  const [carSlot, setCarSlot] = useState<'normal' | 'boom'>('normal');
  const carFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingCar, setIsProcessingCar] = useState(false);
  const [carError, setCarError] = useState<string | null>(null);

  // Playground Background Upload State
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);

  const handlePlaygroundBgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdatePlaygroundBg) return;
    setIsProcessingBg(true);
    setBgError(null);
    try {
      const raw = await fileToDataUrl(file);
      const compressed = await resizeBackgroundDataUrl(raw, 1600);
      onUpdatePlaygroundBg(compressed);
    } catch {
      setBgError('Could not load that background image. Try PNG, JPG, or WEBP.');
    } finally {
      setIsProcessingBg(false);
      if (bgFileInputRef.current) bgFileInputRef.current.value = '';
    }
  };

  // Bulk Quiz Import State
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkQuizText, setBulkQuizText] = useState('');
  const [bulkImportNotice, setBulkImportNotice] = useState<string | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

  const parsedBulkQuiz = useMemo(() => parseBulkQuizText(bulkQuizText), [bulkQuizText]);

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setBulkQuizText((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
      setBulkImportNotice(null);
    } catch {
      setQuizFormError('Could not read that text/CSV file.');
    } finally {
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
    }
  };

  const handleConfirmBulkImport = () => {
    if (!activeClass || parsedBulkQuiz.items.length === 0) return;
    if (onAddQuizzesBulk) {
      onAddQuizzesBulk(activeClass.id, parsedBulkQuiz.items);
    } else {
      for (const item of parsedBulkQuiz.items) {
        onAddQuiz(activeClass.id, item);
      }
    }
    const count = parsedBulkQuiz.items.length;
    setBulkQuizText('');
    setShowBulkImport(false);
    setBulkImportNotice(`Imported ${count} ${count === 1 ? 'question' : 'questions'}!`);
  };

  const isBoomSlot = carSlot === 'boom';
  const activeCarUrl = isBoomSlot
    ? (carSettings.customBoomCarDataUrl ?? null)
    : carSettings.customCarDataUrl;
  const activeRawCarUrl = isBoomSlot
    ? (carSettings.rawBoomCarDataUrl ?? null)
    : (carSettings.rawCarDataUrl ?? null);
  const activeRemoveBg = isBoomSlot
    ? (carSettings.boomRemoveBg ?? true)
    : carSettings.removeBg;
  const activeTolerance = isBoomSlot
    ? (carSettings.boomBgTolerance ?? 42)
    : (carSettings.bgTolerance ?? 42);
  const activeCarScale = isBoomSlot
    ? (carSettings.boomScale ?? 1)
    : (carSettings.scale ?? 1);
  const activeCarFlipX = isBoomSlot
    ? Boolean(carSettings.boomFlipX)
    : Boolean(carSettings.flipX);

  const handleCarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingCar(true);
    setCarError(null);
    try {
      const raw = await fileToDataUrl(file);
      const resizedRaw = await resizeImageDataUrl(raw, 520);
      const processed = activeRemoveBg
        ? await processCarImage(resizedRaw, { removeBg: true, tolerance: activeTolerance })
        : resizedRaw;
      if (isBoomSlot) {
        onUpdateCarSettings({
          ...carSettings,
          rawBoomCarDataUrl: resizedRaw,
          customBoomCarDataUrl: processed,
        });
      } else {
        onUpdateCarSettings({
          ...carSettings,
          rawCarDataUrl: resizedRaw,
          customCarDataUrl: processed,
        });
      }
    } catch {
      setCarError('Could not read that car image. Please try another PNG, JPG, or WEBP.');
    } finally {
      setIsProcessingCar(false);
      if (carFileInputRef.current) carFileInputRef.current.value = '';
    }
  };

  const handleToggleCarRemoveBg = async (checked: boolean) => {
    if (!activeRawCarUrl) {
      onUpdateCarSettings(
        isBoomSlot
          ? { ...carSettings, boomRemoveBg: checked }
          : { ...carSettings, removeBg: checked }
      );
      return;
    }
    setIsProcessingCar(true);
    setCarError(null);
    try {
      const nextImg = checked
        ? await processCarImage(activeRawCarUrl, {
            removeBg: true,
            tolerance: activeTolerance,
          })
        : activeRawCarUrl;
      onUpdateCarSettings(
        isBoomSlot
          ? {
              ...carSettings,
              boomRemoveBg: checked,
              customBoomCarDataUrl: nextImg,
            }
          : {
              ...carSettings,
              removeBg: checked,
              customCarDataUrl: nextImg,
            }
      );
    } catch {
      onUpdateCarSettings(
        isBoomSlot
          ? {
              ...carSettings,
              boomRemoveBg: false,
              customBoomCarDataUrl: activeRawCarUrl,
            }
          : {
              ...carSettings,
              removeBg: false,
              customCarDataUrl: activeRawCarUrl,
            }
      );
    } finally {
      setIsProcessingCar(false);
    }
  };

  const handleCarToleranceChange = async (nextTolerance: number) => {
    if (!activeRawCarUrl || !activeRemoveBg) {
      onUpdateCarSettings(
        isBoomSlot
          ? { ...carSettings, boomBgTolerance: nextTolerance }
          : { ...carSettings, bgTolerance: nextTolerance }
      );
      return;
    }
    try {
      const processed = await processCarImage(activeRawCarUrl, {
        removeBg: true,
        tolerance: nextTolerance,
      });
      onUpdateCarSettings(
        isBoomSlot
          ? {
              ...carSettings,
              boomBgTolerance: nextTolerance,
              customBoomCarDataUrl: processed,
            }
          : {
              ...carSettings,
              bgTolerance: nextTolerance,
              customCarDataUrl: processed,
            }
      );
    } catch {
      onUpdateCarSettings(
        isBoomSlot
          ? { ...carSettings, boomBgTolerance: nextTolerance }
          : { ...carSettings, bgTolerance: nextTolerance }
      );
    }
  };

  const handleResetActiveCarSlot = () => {
    setCarError(null);
    if (isBoomSlot) {
      if (
        !carSettings.customCarDataUrl &&
        carSettings.scale === 1 &&
        !carSettings.flipX
      ) {
        onResetCarSettings();
      } else {
        onUpdateCarSettings({
          ...carSettings,
          customBoomCarDataUrl: null,
          rawBoomCarDataUrl: null,
          boomRemoveBg: true,
          boomBgTolerance: 42,
          boomScale: 1,
          boomFlipX: false,
        });
      }
    } else if (
      !carSettings.customBoomCarDataUrl &&
      (carSettings.boomScale ?? 1) === 1 &&
      !carSettings.boomFlipX
    ) {
      onResetCarSettings();
    } else {
      onUpdateCarSettings({
        ...carSettings,
        customCarDataUrl: null,
        rawCarDataUrl: null,
        removeBg: true,
        bgTolerance: 42,
        scale: 1,
        flipX: false,
      });
    }
  };

  const handleCreateClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClassName.trim();
    if (!trimmed) return;
    onCreateClass(trimmed);
    setNewClassName('');
  };

  const handleStartRename = (cls: ClassRoom) => {
    setRenamingId(cls.id);
    setRenameValue(cls.name);
    setConfirmDeleteClassId(null);
  };

  const handleConfirmRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      onRenameClass(id, trimmed);
    }
    setRenamingId(null);
  };

  const handleNewFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImg(true);
    setFormError(null);
    try {
      const raw = await fileToDataUrl(file);
      const resized = await resizeImageDataUrl(raw);
      setRawUploadDataUrl(resized);
      if (removeBgEnabled) {
        const cleaned = await removeWhiteBackground(resized);
        setPreviewDataUrl(cleaned);
      } else {
        setPreviewDataUrl(resized);
      }
      // If word input is empty, infer from filename
      if (!newWordText.trim()) {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const cleanedWord = sanitizeWord(baseName);
        if (cleanedWord.length >= 2) {
          setNewWordText(cleanedWord);
        }
      }
    } catch {
      setFormError('Could not read that image file. Please try another PNG or JPG.');
    } finally {
      setIsProcessingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleToggleNewRemoveBg = async (checked: boolean) => {
    setRemoveBgEnabled(checked);
    if (!rawUploadDataUrl) return;
    setIsProcessingImg(true);
    try {
      if (checked) {
        const cleaned = await removeWhiteBackground(rawUploadDataUrl);
        setPreviewDataUrl(cleaned);
      } else {
        setPreviewDataUrl(rawUploadDataUrl);
      }
    } catch {
      setRemoveBgEnabled(false);
      setPreviewDataUrl(rawUploadDataUrl);
    } finally {
      setIsProcessingImg(false);
    }
  };

  const handlePickSticker = (dataUrl: string, suggestedWord: string) => {
    setRawUploadDataUrl(null);
    setNewImageUrl('');
    setPreviewDataUrl(dataUrl);
    if (!newWordText.trim()) {
      setNewWordText(suggestedWord);
    }
    setShowStickerPicker(false);
    setFormError(null);
  };

  const handleApplyNewImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    if (!/^(https?:\/\/|data:image\/|\/)/i.test(trimmed)) {
      setFormError('Please enter a valid image URL starting with https://, http://, or /.');
      return;
    }
    setRawUploadDataUrl(null);
    setPreviewDataUrl(trimmed);
    setFormError(null);
  };

  const handleAddWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;
    const cleanWord = sanitizeWord(newWordText);
    if (cleanWord.length < 2) {
      setFormError('Please enter an English word with at least 2 letters (A-Z).');
      return;
    }

    const typedUrl = newImageUrl.trim();
    const finalImage =
      rawUploadDataUrl !== null
        ? previewDataUrl
        : typedUrl && /^(https?:\/\/|data:image\/|\/)/i.test(typedUrl)
          ? typedUrl
          : previewDataUrl || getStickerByWord(cleanWord);

    onAddWord(activeClass.id, {
      word: cleanWord,
      imageDataUrl: finalImage,
      rawImageDataUrl: rawUploadDataUrl ?? undefined,
      bgRemoved: rawUploadDataUrl ? removeBgEnabled : false,
    });

    setNewWordText('');
    setNewImageUrl('');
    setRawUploadDataUrl(null);
    setPreviewDataUrl(STICKER_PRESETS[0].dataUrl);
    setFormError(null);
  };

  const beginEditWord = (item: WordItem) => {
    const imgUrl = item.imageDataUrl ?? '';
    setEditingWordId(item.id);
    setEditWordText(item.word ?? '');
    setEditImageUrl(/^(https?:\/\/|\/)/i.test(imgUrl) ? imgUrl : '');
    setEditRawDataUrl(item.rawImageDataUrl ?? null);
    setEditPreviewDataUrl(imgUrl);
    setEditRemoveBg(Boolean(item.bgRemoved));
  };

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await fileToDataUrl(file);
      const resized = await resizeImageDataUrl(raw);
      setEditImageUrl('');
      setEditRawDataUrl(resized);
      if (editRemoveBg) {
        setEditPreviewDataUrl(await removeWhiteBackground(resized));
      } else {
        setEditPreviewDataUrl(resized);
      }
    } catch {
      setFormError('Could not read that image file. Please try another PNG or JPG.');
    } finally {
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  };

  const handleApplyEditImageUrl = () => {
    const trimmed = editImageUrl.trim();
    if (!trimmed || !/^(https?:\/\/|data:image\/|\/)/i.test(trimmed)) return;
    setEditRawDataUrl(null);
    setEditPreviewDataUrl(trimmed);
    setEditRemoveBg(false);
  };

  const handleToggleEditRemoveBg = async (checked: boolean) => {
    setEditRemoveBg(checked);
    const source = editRawDataUrl || editPreviewDataUrl;
    if (!source) return;
    try {
      if (checked) {
        if (!editRawDataUrl) setEditRawDataUrl(editPreviewDataUrl);
        setEditPreviewDataUrl(await removeWhiteBackground(source));
      } else if (editRawDataUrl) {
        setEditPreviewDataUrl(editRawDataUrl);
      }
    } catch {
      // External URLs without CORS headers cannot be pixel-edited via Canvas
      setEditRemoveBg(false);
    }
  };

  const saveEditWord = (wordId: string) => {
    if (!activeClass) return;
    const clean = sanitizeWord(editWordText);
    if (clean.length < 2) return;
    const typedUrl = editImageUrl.trim();
    const finalImg =
      typedUrl && /^(https?:\/\/|data:image\/|\/)/i.test(typedUrl) && !editRawDataUrl
        ? typedUrl
        : editPreviewDataUrl;
    onUpdateWord(activeClass.id, wordId, {
      word: clean,
      imageDataUrl: finalImg,
      rawImageDataUrl: editRawDataUrl ?? undefined,
      bgRemoved: editRemoveBg,
    });
    setEditingWordId(null);
  };

  const handleAddQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;

    if (quizQuestionType === 'image-question') {
      const qImg = quizImageUrl.trim();
      const correct = quizCorrect.trim();
      const wrongs = [quizWrong1, quizWrong2, quizWrong3]
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.toLowerCase() !== correct.toLowerCase());

      if (!qImg) {
        setQuizFormError('Please upload, pick a sticker, or paste an image for the question.');
        return;
      }
      if (!correct) {
        setQuizFormError('Please enter the correct answer.');
        return;
      }
      if (wrongs.length < 1) {
        setQuizFormError('Please enter at least 1 wrong answer option.');
        return;
      }

      onAddQuiz(activeClass.id, {
        questionType: 'image-question',
        answerType: 'text',
        question: '',
        correctAnswer: correct,
        wrongAnswers: wrongs,
        imageDataUrl: qImg,
      });
    } else if (quizAnswerType === 'image') {
      const q = quizQuestion.trim();
      const correctImg = quizCorrectImg.trim();
      const wrongImgs = [quizWrong1Img, quizWrong2Img, quizWrong3Img]
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s !== correctImg);

      if (q.length < 2) {
        setQuizFormError('Please enter a text question (at least 2 characters).');
        return;
      }
      if (!correctImg) {
        setQuizFormError('Please pick or upload an image for the Correct Answer.');
        return;
      }
      if (wrongImgs.length < 1) {
        setQuizFormError('Please pick or upload at least 1 Wrong Answer image.');
        return;
      }

      onAddQuiz(activeClass.id, {
        questionType: 'text-question',
        answerType: 'image',
        question: q,
        correctAnswer: quizCorrect.trim(),
        wrongAnswers: [],
        correctAnswerImage: correctImg,
        wrongAnswerImages: wrongImgs,
      });
    } else {
      const q = quizQuestion.trim();
      const correct = quizCorrect.trim();
      const wrongs = [quizWrong1, quizWrong2, quizWrong3]
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.toLowerCase() !== correct.toLowerCase());

      if (q.length < 2) {
        setQuizFormError('Please enter a text question (at least 2 characters).');
        return;
      }
      if (!correct) {
        setQuizFormError('Please enter the correct answer.');
        return;
      }
      if (wrongs.length < 1) {
        setQuizFormError('Please enter at least 1 wrong answer option.');
        return;
      }

      onAddQuiz(activeClass.id, {
        questionType: 'text-question',
        answerType: 'text',
        question: q,
        correctAnswer: correct,
        wrongAnswers: wrongs,
        imageDataUrl: quizImageUrl.trim() || undefined,
      });
    }

    setQuizQuestion('');
    setQuizCorrect('');
    setQuizWrong1('');
    setQuizWrong2('');
    setQuizWrong3('');
    setQuizCorrectImg('');
    setQuizWrong1Img('');
    setQuizWrong2Img('');
    setQuizWrong3Img('');
    setQuizImageUrl('');
    setQuizFormError(null);
  };

  const beginEditQuiz = (item: QuizItem) => {
    const qType: QuizQuestionType = item.questionType ?? 'text-question';
    const aType: QuizAnswerType = qType === 'image-question' ? 'text' : (item.answerType ?? 'text');
    setEditingQuizId(item.id);
    setEditQuizQuestionType(qType);
    setEditQuizAnswerType(aType);
    setEditQuizQuestion(item.question ?? '');
    setEditQuizCorrect(item.correctAnswer ?? '');
    setEditQuizWrong1(item.wrongAnswers?.[0] ?? '');
    setEditQuizWrong2(item.wrongAnswers?.[1] ?? '');
    setEditQuizWrong3(item.wrongAnswers?.[2] ?? '');
    setEditQuizCorrectImg(item.correctAnswerImage ?? '');
    setEditQuizWrong1Img(item.wrongAnswerImages?.[0] ?? '');
    setEditQuizWrong2Img(item.wrongAnswerImages?.[1] ?? '');
    setEditQuizWrong3Img(item.wrongAnswerImages?.[2] ?? '');
    setEditQuizImageUrl(item.imageDataUrl ?? '');
  };

  const saveEditQuiz = (quizId: string) => {
    if (!activeClass) return;

    if (editQuizQuestionType === 'image-question') {
      const qImg = editQuizImageUrl.trim();
      const correct = editQuizCorrect.trim();
      const wrongs = [editQuizWrong1, editQuizWrong2, editQuizWrong3]
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.toLowerCase() !== correct.toLowerCase());
      if (!qImg || !correct || wrongs.length < 1) return;

      onUpdateQuiz(activeClass.id, quizId, {
        questionType: 'image-question',
        answerType: 'text',
        question: '',
        correctAnswer: correct,
        wrongAnswers: wrongs,
        correctAnswerImage: undefined,
        wrongAnswerImages: undefined,
        imageDataUrl: qImg,
      });
    } else if (editQuizAnswerType === 'image') {
      const q = editQuizQuestion.trim();
      const correctImg = editQuizCorrectImg.trim();
      const wrongImgs = [editQuizWrong1Img, editQuizWrong2Img, editQuizWrong3Img]
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s !== correctImg);
      if (q.length < 2 || !correctImg || wrongImgs.length < 1) return;

      onUpdateQuiz(activeClass.id, quizId, {
        questionType: 'text-question',
        answerType: 'image',
        question: q,
        correctAnswer: editQuizCorrect.trim(),
        wrongAnswers: [],
        correctAnswerImage: correctImg,
        wrongAnswerImages: wrongImgs,
        imageDataUrl: undefined,
      });
    } else {
      const q = editQuizQuestion.trim();
      const correct = editQuizCorrect.trim();
      const wrongs = [editQuizWrong1, editQuizWrong2, editQuizWrong3]
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.toLowerCase() !== correct.toLowerCase());
      if (q.length < 2 || !correct || wrongs.length < 1) return;

      onUpdateQuiz(activeClass.id, quizId, {
        questionType: 'text-question',
        answerType: 'text',
        question: q,
        correctAnswer: correct,
        wrongAnswers: wrongs,
        correctAnswerImage: undefined,
        wrongAnswerImages: undefined,
        imageDataUrl: editQuizImageUrl.trim() || undefined,
      });
    }
    setEditingQuizId(null);
  };

  const canStartActiveMode = Boolean(
    activeClass &&
      (gameMode === 'spell'
        ? (activeClass.words ?? []).length > 0
        : quizzes.length > 0 || (activeClass.words ?? []).length >= 2)
  );

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border-2 border-amber-200 p-5 sm:p-6 shadow-xs">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
            Teacher Setup &amp; Multi-Class Manager
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Create classes, manage Spelling words &amp; Quiz questions, and auto-save locally in your
            browser.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartGame}
          disabled={!canStartActiveMode}
          className={`inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl font-display font-bold text-lg transition-all whitespace-nowrap shrink-0 ${
            canStartActiveMode
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-b-4 border-emerald-700 shadow-sm cursor-pointer active:translate-y-0.5'
              : 'bg-slate-200 text-slate-400 border-b-4 border-slate-300 cursor-not-allowed'
          }`}
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{gameMode === 'quiz' ? 'Start Quiz Game!' : 'Start Game!'}</span>
        </button>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Class / Room Management + Custom Car Editor */}
        <div className="lg:col-span-4 flex flex-col gap-6">
        <section className="bg-white rounded-3xl border-2 border-sky-100 p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-slate-900">
              Class Rooms / Units
            </h2>
            <span className="text-xs font-bold text-slate-500 tabular-nums">
              {classes.length} total
            </span>
          </div>

          {/* Create Class Form */}
          <form onSubmit={handleCreateClassSubmit} className="flex gap-2">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g., Grade 1 - Colors"
              maxLength={40}
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              disabled={!newClassName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm border-b-4 border-sky-700 disabled:border-slate-300 transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </form>

          {/* Class List */}
          <div className="flex flex-col gap-2">
            {classes.map((cls) => {
              const isActive = activeClass?.id === cls.id;
              const isRenaming = renamingId === cls.id;
              const isConfirmDelete = confirmDeleteClassId === cls.id;

              return (
                <div
                  key={cls.id}
                  className={`rounded-2xl p-3 border-2 transition-colors ${
                    isActive
                      ? 'bg-sky-50 border-sky-400'
                      : 'bg-slate-50/60 border-slate-200 hover:border-sky-200'
                  }`}
                >
                  {isRenaming ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename(cls.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        autoFocus
                        maxLength={40}
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white border-2 border-sky-400 text-sm font-bold text-slate-800 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleConfirmRename(cls.id)}
                        className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                        title="Save Name"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="p-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : isConfirmDelete ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-rose-700">
                        Delete &ldquo;{cls.name}&rdquo;?
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteClass(cls.id);
                            setConfirmDeleteClassId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteClassId(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectClass(cls.id)}
                        className="flex-1 min-w-0 text-left flex items-center gap-2.5 cursor-pointer"
                      >
                        <FolderOpen
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-sky-600' : 'text-slate-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">
                            {cls.name}
                          </div>
                          <div className="text-xs font-semibold text-slate-500 tabular-nums">
                            {(cls.words ?? []).length}{' '}
                            {(cls.words ?? []).length === 1 ? 'word' : 'words'}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartRename(cls)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-white cursor-pointer"
                          title="Rename Class"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteClassId(cls.id);
                            setRenamingId(null);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-white cursor-pointer"
                          title="Delete Class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {classes.length === 0 && (
              <div className="text-center py-6 text-sm text-slate-500">
                Create a class above to start adding words.
              </div>
            )}
          </div>
        </section>

        {/* Custom Car Appearance & Size Card */}
        <section className="bg-white rounded-3xl border-2 border-emerald-200 p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-emerald-600 shrink-0" />
              <h2 className="font-display font-bold text-xl text-slate-900">
                Car Skin &amp; Size
              </h2>
            </div>
            {(activeCarUrl || activeCarScale !== 1 || activeCarFlipX) && (
              <button
                type="button"
                onClick={handleResetActiveCarSlot}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold border border-slate-200 cursor-pointer"
                title={
                  isBoomSlot
                    ? 'Reset wrong-answer car to default'
                    : 'Reset driving car to default'
                }
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Car State Switcher: Driving Car vs Wrong Answer Car */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setCarSlot('normal');
                setCarError(null);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                !isBoomSlot
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Driving Car</span>
              {carSettings.customCarDataUrl && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setCarSlot('boom');
                setCarError(null);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isBoomSlot
                  ? 'bg-white text-rose-700 shadow-xs border border-rose-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Wrong Answer</span>
              {carSettings.customBoomCarDataUrl && (
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>
          </div>

          {/* Live Grass-Road Car Preview */}
          <div
            className={`relative w-full h-36 rounded-2xl border-2 overflow-hidden flex items-center justify-center ${
              isBoomSlot
                ? 'border-rose-200 bg-gradient-to-b from-amber-50 via-orange-50 to-rose-100'
                : 'border-emerald-200 bg-gradient-to-b from-sky-100 via-emerald-100 to-emerald-200'
            }`}
            style={{
              backgroundImage:
                'radial-gradient(rgba(148,163,184,0.22) 1px, transparent 1px)',
              backgroundSize: '12px 12px',
            }}
          >
            {isProcessingCar ? (
              <span className="text-xs font-bold text-sky-700 bg-white/90 px-3 py-1.5 rounded-xl">
                Removing background...
              </span>
            ) : (
              <img
                src={
                  activeCarUrl ||
                  (isBoomSlot ? DEFAULT_BOOM_CAR_PREVIEW_SRC : DEFAULT_CAR_PREVIEW_SRC)
                }
                alt={
                  isBoomSlot
                    ? 'Wrong-answer car preview'
                    : 'Selected driving car preview'
                }
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className={`max-h-24 max-w-[72%] object-contain select-none pointer-events-none transition-transform duration-150 drop-shadow-[0_6px_8px_rgba(15,23,42,0.22)] ${
                  !activeCarUrl ? 'mix-blend-multiply' : ''
                }`}
                style={{
                  transform: `scale(${activeCarScale}) scaleX(${activeCarFlipX ? -1 : 1})`,
                }}
              />
            )}
            <span
              className={`absolute top-2 left-2.5 px-2 py-0.5 rounded-full bg-white/90 border text-[11px] font-extrabold ${
                isBoomSlot
                  ? 'border-rose-200 text-rose-700'
                  : 'border-emerald-200 text-emerald-800'
              }`}
            >
              {isBoomSlot ? 'On Wrong Answer' : 'Normal Drive'}
            </span>
            <span
              className={`absolute bottom-2 right-2.5 px-2 py-0.5 rounded-full bg-white/85 border text-[11px] font-extrabold tabular-nums ${
                isBoomSlot
                  ? 'border-rose-200 text-rose-800'
                  : 'border-emerald-200 text-emerald-900'
              }`}
            >
              {Math.round(activeCarScale * 100)}%
            </span>
          </div>

          {/* Upload & Flip Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={carFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCarFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => carFileInputRef.current?.click()}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-white text-xs font-bold border-b-3 cursor-pointer ${
                isBoomSlot
                  ? 'bg-rose-500 hover:bg-rose-600 border-rose-700'
                  : 'bg-sky-500 hover:bg-sky-600 border-sky-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>
                {activeCarUrl
                  ? isBoomSlot
                    ? 'Change Wrong Car'
                    : 'Change Car Image'
                  : isBoomSlot
                    ? 'Upload Wrong Car'
                    : 'Upload Car Image'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateCarSettings(
                  isBoomSlot
                    ? { ...carSettings, boomFlipX: !activeCarFlipX }
                    : { ...carSettings, flipX: !activeCarFlipX }
                )
              }
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-colors cursor-pointer ${
                activeCarFlipX
                  ? 'bg-amber-100 border-amber-400 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Flip car direction left/right"
            >
              <FlipHorizontal2 className="w-4 h-4" />
              <span>Flip</span>
            </button>
          </div>

          {/* Auto White-Background Removal Controls */}
          <div className="flex flex-col gap-2 bg-slate-50 rounded-2xl border border-slate-200 p-3">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeRemoveBg}
                onChange={(e) => handleToggleCarRemoveBg(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
              <Wand2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Auto Remove White Background</span>
            </label>

            {activeRemoveBg && activeRawCarUrl && (
              <div className="flex items-center gap-2.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">
                  Edge Sensitivity
                </span>
                <input
                  type="range"
                  min={15}
                  max={95}
                  step={1}
                  value={activeTolerance}
                  onChange={(e) => handleCarToleranceChange(Number(e.target.value))}
                  aria-label="Background removal sensitivity"
                  className="flex-1 accent-emerald-500 cursor-pointer"
                />
                <span className="text-[11px] font-extrabold text-slate-700 w-7 text-right tabular-nums">
                  {activeTolerance}
                </span>
              </div>
            )}
          </div>

          {/* Car Size Slider */}
          <div className="flex flex-col gap-1.5 bg-amber-50/70 rounded-2xl border border-amber-200 p-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="car-size-slider"
                className="text-xs font-extrabold uppercase tracking-wide text-amber-950"
              >
                {isBoomSlot ? 'Wrong Car Size' : 'Car Size'}
              </label>
              <span className="text-xs font-extrabold text-amber-800 tabular-nums">
                {Math.round(activeCarScale * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextScale = Math.max(0.5, Number((activeCarScale - 0.1).toFixed(2)));
                  onUpdateCarSettings(
                    isBoomSlot
                      ? { ...carSettings, boomScale: nextScale }
                      : { ...carSettings, scale: nextScale }
                  );
                }}
                className="w-7 h-7 rounded-lg bg-white border border-amber-300 font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                aria-label="Decrease car size"
              >
                -
              </button>
              <input
                id="car-size-slider"
                type="range"
                min={0.5}
                max={1.8}
                step={0.05}
                value={activeCarScale}
                onChange={(e) => {
                  const nextScale = Number(e.target.value);
                  onUpdateCarSettings(
                    isBoomSlot
                      ? { ...carSettings, boomScale: nextScale }
                      : { ...carSettings, scale: nextScale }
                  );
                }}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  const nextScale = Math.min(1.8, Number((activeCarScale + 0.1).toFixed(2)));
                  onUpdateCarSettings(
                    isBoomSlot
                      ? { ...carSettings, boomScale: nextScale }
                      : { ...carSettings, scale: nextScale }
                  );
                }}
                className="w-7 h-7 rounded-lg bg-white border border-amber-300 font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                aria-label="Increase car size"
              >
                +
              </button>
            </div>
          </div>

          {carError && (
            <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {carError}
            </div>
          )}
        </section>

        {/* Playground Background Image Card */}
        {onUpdatePlaygroundBg && (
          <section className="bg-white rounded-3xl border-2 border-sky-100 p-5 flex flex-col gap-3.5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ImagePlus className="w-5 h-5 text-sky-600 shrink-0" />
                <h2 className="font-display font-bold text-xl text-slate-900">
                  Playground Background
                </h2>
              </div>
              {playgroundBgDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setBgError(null);
                    onUpdatePlaygroundBg(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold border border-slate-200 cursor-pointer"
                  title="Reset to default grass background"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="relative w-full h-28 rounded-2xl border-2 border-sky-200 overflow-hidden bg-emerald-50 flex items-center justify-center">
              {isProcessingBg ? (
                <span className="text-xs font-bold text-sky-700 bg-white/90 px-3 py-1.5 rounded-xl">
                  Optimizing background...
                </span>
              ) : (
                <img
                  src={playgroundBgDataUrl || DEFAULT_BG_PREVIEW_SRC}
                  alt="Playground background preview"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              )}
              <span className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-full bg-white/90 border border-sky-200 text-[11px] font-extrabold text-sky-900">
                {playgroundBgDataUrl ? 'Custom Photo' : 'Default Meadow'}
              </span>
            </div>

            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePlaygroundBgChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => bgFileInputRef.current?.click()}
              disabled={isProcessingBg}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold border-b-3 border-emerald-700 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>
                {playgroundBgDataUrl ? 'Change Background Image' : 'Upload Background Image'}
              </span>
            </button>

            {bgError && (
              <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {bgError}
              </div>
            )}
          </section>
        )}
        </div>

        {/* Right Main Area: Word List or Quiz Questions Editor */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {!activeClass ? (
            <div className="bg-white rounded-3xl border-2 border-slate-200 p-10 text-center text-slate-600 font-semibold">
              Please create or select a class room on the left to manage its content.
            </div>
          ) : (
            <>
              {/* Editor Mode Tabs */}
              <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl border-2 border-slate-200 p-2 shadow-xs">
                <button
                  type="button"
                  onClick={() => onSelectGameMode('spell')}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm sm:text-base transition-colors cursor-pointer ${
                    gameMode === 'spell'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Type className="w-4 h-4" />
                  <span>Spelling Words ({(activeClass.words ?? []).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectGameMode('quiz')}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm sm:text-base transition-colors cursor-pointer ${
                    gameMode === 'quiz'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Quiz Questions ({quizzes.length})</span>
                </button>
              </div>

              {gameMode === 'spell' ? (
                <>
                  {/* Add Vocabulary Item Card */}
                  <form
                    onSubmit={handleAddWordSubmit}
                    className="bg-white rounded-3xl border-2 border-emerald-200 p-5 sm:p-6 shadow-xs flex flex-col gap-5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display font-bold text-xl text-slate-900">
                        Add Word to &ldquo;{activeClass.name}&rdquo;
                      </h2>
                    </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Image Upload + Preview */}
                  <div className="md:col-span-5 flex flex-col items-center gap-3 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-4">
                    <div
                      className="w-28 h-28 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center p-2 shadow-xs overflow-hidden"
                      style={{
                        backgroundImage:
                          'radial-gradient(#e2e8f0 1px, transparent 1px)',
                        backgroundSize: '10px 10px',
                      }}
                    >
                      {isProcessingImg ? (
                        <span className="text-xs font-bold text-sky-600">Processing...</span>
                      ) : (
                        <img
                          src={previewDataUrl}
                          alt="Word sticker preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleNewFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold border-b-3 border-sky-700 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Image</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowStickerPicker((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-700 text-xs font-bold border-2 border-slate-200 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                        <span>Stickers</span>
                      </button>
                    </div>

                    {/* Paste Image URL */}
                    <div className="w-full flex items-center gap-1.5">
                      <div className="relative flex-1 min-w-0">
                        <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="url"
                          value={newImageUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewImageUrl(val);
                            setFormError(null);
                            if (/^(https?:\/\/|data:image\/|\/)/i.test(val.trim())) {
                              setRawUploadDataUrl(null);
                              setPreviewDataUrl(val.trim());
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyNewImageUrl();
                            }
                          }}
                          placeholder="Paste image URL (https://...)"
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-sky-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyNewImageUrl}
                        disabled={!newImageUrl.trim()}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 disabled:opacity-45 text-slate-800 text-xs font-bold shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Use URL
                      </button>
                    </div>

                    {rawUploadDataUrl && (
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          checked={removeBgEnabled}
                          onChange={(e) => handleToggleNewRemoveBg(e.target.checked)}
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                        />
                        <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Remove White Background</span>
                      </label>
                    )}
                  </div>

                  {/* Word Text & Letter Preview */}
                  <div className="md:col-span-7 flex flex-col gap-4">
                    <div>
                      <label
                        htmlFor="new-word-input"
                        className="block text-sm font-bold text-slate-700 mb-1.5"
                      >
                        Target English Word
                      </label>
                      <input
                        id="new-word-input"
                        type="text"
                        value={newWordText}
                        onChange={(e) => {
                          setNewWordText(sanitizeWord(e.target.value));
                          setFormError(null);
                        }}
                        placeholder="e.g., APPLE"
                        maxLength={12}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 font-display font-bold text-xl tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-base focus:outline-none focus:border-emerald-400"
                      />
                      <p className="text-xs text-slate-500 mt-1.5">
                        Letters A–Z only (2 to 12 letters). Students will connect these letters on
                        the map.
                      </p>
                    </div>

                    {/* Live Letter Slot Preview */}
                    <div className="flex flex-wrap items-center gap-1.5 min-h-[42px]">
                      {sanitizeWord(newWordText)
                        .split('')
                        .map((ch, idx) => (
                          <CartoonLetterTile
                            key={`${ch}-${idx}`}
                            char={ch}
                            sizeClass="w-10 h-10"
                          />
                        ))}
                    </div>

                    {formError && (
                      <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                        {formError}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm border-b-4 border-emerald-700 cursor-pointer active:translate-y-0.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Word to Class</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Built-in Sticker Picker Drawer */}
                {showStickerPicker && (
                  <div className="bg-amber-50/70 rounded-2xl border-2 border-amber-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-amber-950">
                        Quick Cute Stickers (100% Offline)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowStickerPicker(false)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
                      {STICKER_PRESETS.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handlePickSticker(st.dataUrl, st.suggestedWord)}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white hover:bg-sky-50 border-2 border-amber-100 hover:border-sky-300 transition-colors cursor-pointer"
                        >
                          <img
                            src={st.dataUrl}
                            alt={st.label}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 object-contain"
                          />
                          <span className="text-[11px] font-bold text-slate-700">{st.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>

              {/* Current Word List */}
              <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-xl text-slate-900">
                    Word List ({(activeClass.words ?? []).length})
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">
                    Auto-saved locally
                  </span>
                </div>

                {(activeClass.words ?? []).length === 0 ? (
                  <div className="py-10 text-center rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-500 font-semibold text-sm">
                    This class has no words yet. Add your first word above!
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {(activeClass.words ?? []).map((item, idx) => {
                      const isEditing = editingWordId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          {isEditing ? (
                            <div className="w-full flex flex-col sm:flex-row items-center gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-16 h-16 rounded-xl bg-white p-1.5 border border-slate-200 flex items-center justify-center shrink-0">
                                  {editPreviewDataUrl ? (
                                    <img
                                      src={editPreviewDataUrl}
                                      alt={editWordText}
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <ImageIcon className="w-6 h-6 text-slate-300" />
                                  )}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <input
                                    ref={editFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleEditFileChange}
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => editFileInputRef.current?.click()}
                                    className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 text-xs font-bold hover:bg-sky-200 cursor-pointer"
                                  >
                                    Replace Image
                                  </button>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="url"
                                      value={editImageUrl}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditImageUrl(val);
                                        if (/^(https?:\/\/|data:image\/|\/)/i.test(val.trim())) {
                                          setEditRawDataUrl(null);
                                          setEditPreviewDataUrl(val.trim());
                                        }
                                      }}
                                      placeholder="Paste image URL..."
                                      className="w-36 sm:w-44 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-sky-400"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleApplyEditImageUrl}
                                      disabled={!editImageUrl.trim()}
                                      className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 disabled:opacity-45 text-slate-700 text-xs font-bold cursor-pointer"
                                    >
                                      URL
                                    </button>
                                  </div>
                                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editRemoveBg}
                                      onChange={(e) =>
                                        handleToggleEditRemoveBg(e.target.checked)
                                      }
                                      className="accent-emerald-500"
                                    />
                                    <span>Remove White BG</span>
                                  </label>
                                </div>
                              </div>

                              <input
                                type="text"
                                value={editWordText}
                                onChange={(e) => setEditWordText(sanitizeWord(e.target.value))}
                                maxLength={12}
                                className="flex-1 min-w-0 w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white border-2 border-sky-400 font-display font-bold text-lg tracking-widest text-slate-900 focus:outline-none"
                              />

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => saveEditWord(item.id)}
                                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingWordId(null)}
                                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-4 min-w-0">
                                <span className="text-xs font-bold text-slate-400 w-5 text-center tabular-nums shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
                                  {item.imageDataUrl ? (
                                    <img
                                      src={item.imageDataUrl}
                                      alt={item.word}
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <ImageIcon className="w-6 h-6 text-slate-300" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-display font-bold text-xl tracking-wider text-slate-900 truncate">
                                    {item.word}
                                  </div>
                                  <div className="text-xs font-semibold text-slate-500 tabular-nums">
                                    {(item.word ?? '').length} letters
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => onMoveWord(activeClass.id, idx, 'up')}
                                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === (activeClass.words ?? []).length - 1}
                                  onClick={() => onMoveWord(activeClass.id, idx, 'down')}
                                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => beginEditWord(item)}
                                  className="p-2 rounded-xl bg-white border border-slate-200 text-sky-700 hover:bg-sky-50 cursor-pointer"
                                  title="Edit Word"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteWord(activeClass.id, item.id)}
                                  className="p-2 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="Delete Word"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
                </>
              ) : (
                <>
                  {/* Add Quiz Question Card (Single or Bulk Import) */}
                  <div className="bg-white rounded-3xl border-2 border-amber-200 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-display font-bold text-xl text-slate-900">
                        {showBulkImport
                          ? `Bulk Import Questions to "${activeClass.name}"`
                          : `Add Quiz Question to "${activeClass.name}"`}
                      </h2>

                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setShowBulkImport(false);
                            setBulkImportNotice(null);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                            !showBulkImport
                              ? 'bg-white text-amber-900 shadow-2xs border border-amber-200'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Single</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBulkImport(true);
                            setBulkImportNotice(null);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                            showBulkImport
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                          <span>Bulk Import</span>
                        </button>
                      </div>
                    </div>

                    {bulkImportNotice && (
                      <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-4 py-2.5 text-xs font-bold">
                        <span>{bulkImportNotice}</span>
                        <button
                          type="button"
                          onClick={() => setBulkImportNotice(null)}
                          className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {showBulkImport ? (
                      <div className="flex flex-col gap-4">
                        <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3.5 text-xs text-amber-950 flex flex-col gap-1.5">
                          <div className="font-extrabold">
                            Paste multiple questions at once (supports 2 quick formats):
                          </div>
                          <div>
                            <span className="font-bold">1) One line per question</span> (separated by{' '}
                            <code className="px-1 py-0.5 bg-white rounded border border-amber-200">|</code>,{' '}
                            <code className="px-1 py-0.5 bg-white rounded border border-amber-200">;</code>, Tab from Excel/Sheets, or CSV):
                            <div className="mt-0.5 font-mono text-[11px] text-amber-900">
                              Question | Correct Answer | Wrong 1 | Wrong 2 | Wrong 3
                            </div>
                          </div>
                          <div>
                            <span className="font-bold">2) Multi-line blocks</span> (blank line between questions, put{' '}
                            <code className="px-1 py-0.5 bg-white rounded border border-amber-200">*</code> before the right option or add{' '}
                            <code className="px-1 py-0.5 bg-white rounded border border-amber-200">Answer: B</code>):
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            ref={bulkFileInputRef}
                            type="file"
                            accept=".txt,.csv,.tsv,text/plain,text/csv"
                            onChange={handleBulkFileChange}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => bulkFileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 text-xs font-bold cursor-pointer"
                          >
                            <FileUp className="w-4 h-4" />
                            <span>Upload .txt / .csv</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBulkQuizText(BULK_QUIZ_SAMPLE);
                              setBulkImportNotice(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Load Example</span>
                          </button>
                          {bulkQuizText.trim() && (
                            <button
                              type="button"
                              onClick={() => setBulkQuizText('')}
                              className="ml-auto inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Clear</span>
                            </button>
                          )}
                        </div>

                        <textarea
                          value={bulkQuizText}
                          onChange={(e) => {
                            setBulkQuizText(e.target.value);
                            setBulkImportNotice(null);
                          }}
                          rows={8}
                          placeholder={`What animal says "Meow"? | Cat | Dog | Duck | Frog\nWhich fruit is yellow? | Banana | Apple | Grape\n\n1. What color is grass?\nA. Red\nB. *Green\nC. Blue`}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 font-mono text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
                        />

                        {parsedBulkQuiz.errors.length > 0 && (
                          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex flex-col gap-1">
                            <span className="font-extrabold">
                              Skipped ({parsedBulkQuiz.errors.length}):
                            </span>
                            {parsedBulkQuiz.errors.slice(0, 4).map((err, i) => (
                              <div key={i}>{err}</div>
                            ))}
                          </div>
                        )}

                        {parsedBulkQuiz.items.length > 0 && (
                          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-3.5 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-800">
                                Preview ({parsedBulkQuiz.items.length} ready)
                              </span>
                            </div>
                            <div className="max-h-56 overflow-y-auto flex flex-col gap-2 pr-1">
                              {parsedBulkQuiz.items.map((pq, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="rounded-xl bg-white border border-emerald-100 p-2.5 flex flex-col gap-1.5"
                                >
                                  <div className="text-xs font-bold text-slate-900">
                                    {pIdx + 1}. {pq.question}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                                      ✓ {pq.correctAnswer}
                                    </span>
                                    {pq.wrongAnswers.map((wa, wIdx) => (
                                      <span
                                        key={wIdx}
                                        className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-semibold"
                                      >
                                        ✕ {wa}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleConfirmBulkImport}
                            disabled={parsedBulkQuiz.items.length === 0}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm border-b-4 border-amber-700 disabled:border-slate-300 cursor-pointer disabled:cursor-not-allowed active:translate-y-0.5"
                          >
                            <ListPlus className="w-4 h-4" />
                            <span>
                              Import {parsedBulkQuiz.items.length}{' '}
                              {parsedBulkQuiz.items.length === 1 ? 'Question' : 'Questions'}
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleAddQuizSubmit} className="flex flex-col gap-4">

                    {/* Quiz Format Selector (2 Main Formats) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setQuizQuestionType('text-question');
                          setQuizFormError(null);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-colors cursor-pointer ${
                          quizQuestionType === 'text-question'
                            ? 'bg-amber-50 border-amber-400 text-amber-950'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-200'
                        }`}
                      >
                        <Type className="w-5 h-5 shrink-0 text-amber-600" />
                        <div className="min-w-0">
                          <div className="font-display font-bold text-sm">
                            Text Question
                          </div>
                          <div className="text-xs opacity-80">
                            Answers can be text or pictures
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQuizQuestionType('image-question');
                          setQuizAnswerType('text');
                          setQuizFormError(null);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-colors cursor-pointer ${
                          quizQuestionType === 'image-question'
                            ? 'bg-sky-50 border-sky-400 text-sky-950'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-sky-200'
                        }`}
                      >
                        <ImageIcon className="w-5 h-5 shrink-0 text-sky-600" />
                        <div className="min-w-0">
                          <div className="font-display font-bold text-sm">
                            Picture-Only Question
                          </div>
                          <div className="text-xs opacity-80">
                            Question is a picture · Text answers
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Question Input Area */}
                    {quizQuestionType === 'text-question' ? (
                      <div className="flex flex-col gap-3">
                        <div>
                          <label
                            htmlFor="quiz-question-input"
                            className="block text-sm font-bold text-slate-700 mb-1.5"
                          >
                            Question Text
                          </label>
                          <input
                            id="quiz-question-input"
                            type="text"
                            value={quizQuestion}
                            onChange={(e) => {
                              setQuizQuestion(e.target.value);
                              setQuizFormError(null);
                            }}
                            placeholder="e.g., Which picture is a BANANA? or Which animal says Meow?"
                            maxLength={140}
                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 font-semibold text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        {/* Answer Type Sub-toggle: Text Answers vs Image Answers */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-3.5 py-2.5">
                          <span className="text-xs font-extrabold uppercase tracking-wide text-slate-600">
                            Answer Format
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setQuizAnswerType('text');
                                setQuizFormError(null);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                quizAnswerType === 'text'
                                  ? 'bg-emerald-500 text-white shadow-2xs'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <Type className="w-3.5 h-3.5" />
                              <span>Text Answers</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuizAnswerType('image');
                                setQuizFormError(null);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                quizAnswerType === 'image'
                                  ? 'bg-amber-500 text-white shadow-2xs'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Picture Answers (No Text)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <QuizImagePicker
                        label="Question Picture (No Text Needed)"
                        value={quizImageUrl}
                        tone="sky"
                        requiredHint="Students will see only this picture and choose the matching word below."
                        onChange={(imgUrl, suggested) => {
                          setQuizImageUrl(imgUrl);
                          setQuizFormError(null);
                          if (suggested && !quizCorrect.trim()) {
                            setQuizCorrect(suggested);
                          }
                        }}
                      />
                    )}

                    {/* Answers Input Area */}
                    {quizQuestionType === 'text-question' && quizAnswerType === 'image' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <QuizImagePicker
                          label="Correct Answer Picture"
                          value={quizCorrectImg}
                          tone="emerald"
                          onChange={(imgUrl, suggested) => {
                            setQuizCorrectImg(imgUrl);
                            setQuizFormError(null);
                            if (suggested && !quizCorrect.trim()) {
                              setQuizCorrect(suggested);
                            }
                          }}
                        />
                        <QuizImagePicker
                          label="Wrong Picture 1 (Explodes!)"
                          value={quizWrong1Img}
                          tone="rose"
                          onChange={(imgUrl) => {
                            setQuizWrong1Img(imgUrl);
                            setQuizFormError(null);
                          }}
                        />
                        <QuizImagePicker
                          label="Wrong Picture 2 (Optional)"
                          value={quizWrong2Img}
                          tone="rose"
                          onChange={(imgUrl) => setQuizWrong2Img(imgUrl)}
                        />
                        <QuizImagePicker
                          label="Wrong Picture 3 (Optional)"
                          value={quizWrong3Img}
                          tone="rose"
                          onChange={(imgUrl) => setQuizWrong3Img(imgUrl)}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="quiz-correct-input"
                              className="block text-xs font-extrabold uppercase tracking-wide text-emerald-700 mb-1"
                            >
                              Correct Answer
                            </label>
                            <input
                              id="quiz-correct-input"
                              type="text"
                              value={quizCorrect}
                              onChange={(e) => {
                                setQuizCorrect(e.target.value);
                                setQuizFormError(null);
                              }}
                              placeholder="e.g., CAT"
                              maxLength={32}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-50/70 border-2 border-emerald-300 font-bold text-sm text-emerald-950 placeholder:text-emerald-700/40 focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="quiz-wrong1-input"
                              className="block text-xs font-extrabold uppercase tracking-wide text-rose-700 mb-1"
                            >
                              Wrong Answer 1 (Explodes!)
                            </label>
                            <input
                              id="quiz-wrong1-input"
                              type="text"
                              value={quizWrong1}
                              onChange={(e) => {
                                setQuizWrong1(e.target.value);
                                setQuizFormError(null);
                              }}
                              placeholder="e.g., DOG"
                              maxLength={32}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-rose-50/60 border-2 border-rose-200 font-bold text-sm text-rose-950 placeholder:text-rose-700/40 focus:outline-none focus:border-rose-400"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="quiz-wrong2-input"
                              className="block text-xs font-extrabold uppercase tracking-wide text-rose-700 mb-1"
                            >
                              Wrong Answer 2 (Optional)
                            </label>
                            <input
                              id="quiz-wrong2-input"
                              type="text"
                              value={quizWrong2}
                              onChange={(e) => setQuizWrong2(e.target.value)}
                              placeholder="e.g., FROG"
                              maxLength={32}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-rose-50/60 border-2 border-rose-200 font-bold text-sm text-rose-950 placeholder:text-rose-700/40 focus:outline-none focus:border-rose-400"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="quiz-wrong3-input"
                              className="block text-xs font-extrabold uppercase tracking-wide text-rose-700 mb-1"
                            >
                              Wrong Answer 3 (Optional)
                            </label>
                            <input
                              id="quiz-wrong3-input"
                              type="text"
                              value={quizWrong3}
                              onChange={(e) => setQuizWrong3(e.target.value)}
                              placeholder="e.g., DUCK"
                              maxLength={32}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-rose-50/60 border-2 border-rose-200 font-bold text-sm text-rose-950 placeholder:text-rose-700/40 focus:outline-none focus:border-rose-400"
                            />
                          </div>
                        </div>

                        {quizQuestionType === 'text-question' && (
                          <QuizImagePicker
                            label="Optional Clue Picture"
                            value={quizImageUrl}
                            tone="amber"
                            compact
                            onChange={(imgUrl) => setQuizImageUrl(imgUrl)}
                          />
                        )}
                      </>
                    )}

                    {quizFormError && (
                      <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                        {quizFormError}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm border-b-4 border-amber-700 cursor-pointer active:translate-y-0.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Question</span>
                      </button>
                    </div>
                  </form>
                    )}
                  </div>

                  {/* Current Quiz Questions List */}
                  <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display font-bold text-xl text-slate-900">
                        Quiz Questions ({quizzes.length})
                      </h2>
                      <span className="text-xs font-semibold text-slate-500">
                        Auto-saved locally
                      </span>
                    </div>

                    {quizzes.length === 0 ? (
                      <div className="py-8 text-center rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-500 font-semibold text-sm">
                        No custom quiz questions yet. Add one above{(activeClass.words ?? []).length >= 2 ? ' (or play auto-generated picture questions from your word list!)' : '!'}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {quizzes.map((item, idx) => {
                          const isEditing = editingQuizId === item.id;
                          const itemQType = item.questionType ?? 'text-question';
                          const itemAType = itemQType === 'image-question' ? 'text' : (item.answerType ?? 'text');
                          const badgeLabel =
                            itemQType === 'image-question'
                              ? 'Picture → Text'
                              : itemAType === 'image'
                                ? 'Text → Picture'
                                : 'Text → Text';

                          return (
                            <div
                              key={item.id}
                              className="rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-3.5 sm:p-4 flex flex-col gap-3"
                            >
                              {isEditing ? (
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditQuizQuestionType('text-question')}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                        editQuizQuestionType === 'text-question'
                                          ? 'bg-amber-500 text-white'
                                          : 'bg-white border border-slate-200 text-slate-600'
                                      }`}
                                    >
                                      Text Question
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditQuizQuestionType('image-question');
                                        setEditQuizAnswerType('text');
                                      }}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                        editQuizQuestionType === 'image-question'
                                          ? 'bg-sky-500 text-white'
                                          : 'bg-white border border-slate-200 text-slate-600'
                                      }`}
                                    >
                                      Picture-Only Question
                                    </button>

                                    {editQuizQuestionType === 'text-question' && (
                                      <div className="ml-auto flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setEditQuizAnswerType('text')}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                            editQuizAnswerType === 'text'
                                              ? 'bg-emerald-500 text-white'
                                              : 'bg-white border border-slate-200 text-slate-600'
                                          }`}
                                        >
                                          Text Answers
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditQuizAnswerType('image')}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                            editQuizAnswerType === 'image'
                                              ? 'bg-amber-500 text-white'
                                              : 'bg-white border border-slate-200 text-slate-600'
                                          }`}
                                        >
                                          Picture Answers
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {editQuizQuestionType === 'text-question' ? (
                                    <input
                                      type="text"
                                      value={editQuizQuestion}
                                      onChange={(e) => setEditQuizQuestion(e.target.value)}
                                      placeholder="Question text..."
                                      maxLength={140}
                                      className="w-full px-3.5 py-2 rounded-xl bg-white border-2 border-amber-400 font-semibold text-sm text-slate-900 focus:outline-none"
                                    />
                                  ) : (
                                    <QuizImagePicker
                                      label="Question Picture"
                                      value={editQuizImageUrl}
                                      tone="sky"
                                      compact
                                      onChange={(imgUrl) => setEditQuizImageUrl(imgUrl)}
                                    />
                                  )}

                                  {editQuizQuestionType === 'text-question' &&
                                  editQuizAnswerType === 'image' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      <QuizImagePicker
                                        label="Correct Picture"
                                        value={editQuizCorrectImg}
                                        tone="emerald"
                                        compact
                                        onChange={(imgUrl, suggested) => {
                                          setEditQuizCorrectImg(imgUrl);
                                          if (suggested && !editQuizCorrect.trim()) {
                                            setEditQuizCorrect(suggested);
                                          }
                                        }}
                                      />
                                      <QuizImagePicker
                                        label="Wrong Picture 1"
                                        value={editQuizWrong1Img}
                                        tone="rose"
                                        compact
                                        onChange={(imgUrl) => setEditQuizWrong1Img(imgUrl)}
                                      />
                                      <QuizImagePicker
                                        label="Wrong Picture 2"
                                        value={editQuizWrong2Img}
                                        tone="rose"
                                        compact
                                        onChange={(imgUrl) => setEditQuizWrong2Img(imgUrl)}
                                      />
                                      <QuizImagePicker
                                        label="Wrong Picture 3"
                                        value={editQuizWrong3Img}
                                        tone="rose"
                                        compact
                                        onChange={(imgUrl) => setEditQuizWrong3Img(imgUrl)}
                                      />
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      <input
                                        type="text"
                                        value={editQuizCorrect}
                                        onChange={(e) => setEditQuizCorrect(e.target.value)}
                                        placeholder="Correct"
                                        maxLength={32}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-50 border-2 border-emerald-300 font-bold text-xs text-emerald-950 focus:outline-none"
                                      />
                                      <input
                                        type="text"
                                        value={editQuizWrong1}
                                        onChange={(e) => setEditQuizWrong1(e.target.value)}
                                        placeholder="Wrong 1"
                                        maxLength={32}
                                        className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 font-bold text-xs text-rose-900 focus:outline-none"
                                      />
                                      <input
                                        type="text"
                                        value={editQuizWrong2}
                                        onChange={(e) => setEditQuizWrong2(e.target.value)}
                                        placeholder="Wrong 2"
                                        maxLength={32}
                                        className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 font-bold text-xs text-rose-900 focus:outline-none"
                                      />
                                      <input
                                        type="text"
                                        value={editQuizWrong3}
                                        onChange={(e) => setEditQuizWrong3(e.target.value)}
                                        placeholder="Wrong 3"
                                        maxLength={32}
                                        className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 font-bold text-xs text-rose-900 focus:outline-none"
                                      />
                                    </div>
                                  )}

                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => saveEditQuiz(item.id)}
                                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 cursor-pointer"
                                    >
                                      <Check className="w-4 h-4" />
                                      <span>Save</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingQuizId(null)}
                                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 cursor-pointer"
                                    >
                                      <X className="w-4 h-4" />
                                      <span>Cancel</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <span className="text-xs font-bold text-slate-400 w-5 pt-1 text-center tabular-nums shrink-0">
                                      {idx + 1}
                                    </span>
                                    {item.imageDataUrl && (
                                      <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                                        <img
                                          src={item.imageDataUrl}
                                          alt=""
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-contain"
                                        />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex flex-col gap-1.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[11px] font-bold">
                                          {badgeLabel}
                                        </span>
                                        {item.question ? (
                                          <span className="font-bold text-base text-slate-900">
                                            {item.question}
                                          </span>
                                        ) : (
                                          <span className="font-semibold text-sm italic text-slate-500">
                                            Picture-only prompt
                                          </span>
                                        )}
                                      </div>

                                      {itemAType === 'image' && item.correctAnswerImage ? (
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className="w-16 h-16 rounded-xl bg-emerald-50 border-2 border-emerald-400 p-1 flex items-center justify-center">
                                            <img
                                              src={item.correctAnswerImage}
                                              alt="Correct"
                                              referrerPolicy="no-referrer"
                                              className="w-full h-full object-contain"
                                            />
                                          </div>
                                          {(item.wrongAnswerImages ?? []).map((wImg, wi) => (
                                            <div
                                              key={`${item.id}-wi-${wi}`}
                                              className="w-16 h-16 rounded-xl bg-rose-50 border-2 border-rose-200 p-1 flex items-center justify-center"
                                            >
                                              <img
                                                src={wImg}
                                                alt="Wrong"
                                                referrerPolicy="no-referrer"
                                                className="w-full h-full object-contain"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs">
                                            ✓ {item.correctAnswer}
                                          </span>
                                          {(item.wrongAnswers ?? []).map((w, wi) => (
                                            <span
                                              key={`${item.id}-w-${wi}`}
                                              className="px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-200 text-rose-800 font-semibold text-xs"
                                            >
                                              ✕ {w}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => onMoveQuiz(activeClass.id, idx, 'up')}
                                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === quizzes.length - 1}
                                      onClick={() => onMoveQuiz(activeClass.id, idx, 'down')}
                                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => beginEditQuiz(item)}
                                      className="p-2 rounded-xl bg-white border border-slate-200 text-sky-700 hover:bg-sky-50 cursor-pointer"
                                      title="Edit Question"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteQuiz(activeClass.id, item.id)}
                                      className="p-2 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                      title="Delete Question"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
};
