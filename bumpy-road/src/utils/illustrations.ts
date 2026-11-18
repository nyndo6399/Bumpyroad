import { ClassRoom, QuizItem, WordItem } from '../types/game';

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

export interface StickerPreset {
  id: string;
  label: string;
  suggestedWord: string;
  dataUrl: string;
}

export const STICKER_PRESETS: StickerPreset[] = [
  {
    id: 'apple',
    label: 'Apple',
    suggestedWord: 'APPLE',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="176" rx="48" ry="10" fill="#e2e8f0"/>
        <path d="M98 52 C98 30, 114 22, 122 24" stroke="#7c4a2d" stroke-width="9" stroke-linecap="round" fill="none"/>
        <path d="M102 44 C122 24, 150 32, 144 54 C132 62, 112 58, 102 44 Z" fill="#4ade80" stroke="#15803d" stroke-width="4" stroke-linejoin="round"/>
        <path d="M100 58 C68 48, 36 68, 40 112 C44 152, 74 174, 94 170 C98 169, 102 169, 106 170 C126 174, 156 152, 160 112 C164 68, 132 48, 100 58 Z" fill="#ff5a5f" stroke="#be123c" stroke-width="5" stroke-linejoin="round"/>
        <path d="M62 76 C52 88, 52 108, 56 118" stroke="#fda4af" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.85"/>
        <circle cx="80" cy="112" r="6" fill="#1e293b"/>
        <circle cx="120" cy="112" r="6" fill="#1e293b"/>
        <circle cx="82" cy="110" r="2" fill="#ffffff"/>
        <circle cx="122" cy="110" r="2" fill="#ffffff"/>
        <ellipse cx="68" cy="122" rx="8" ry="5" fill="#fda4af" opacity="0.8"/>
        <ellipse cx="132" cy="122" rx="8" ry="5" fill="#fda4af" opacity="0.8"/>
        <path d="M88 124 Q100 136 112 124" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      </svg>
    `),
  },
  {
    id: 'banana',
    label: 'Banana',
    suggestedWord: 'BANANA',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="174" rx="55" ry="10" fill="#e2e8f0"/>
        <path d="M54 50 C48 92, 68 144, 126 158 C150 163, 166 150, 164 138 C162 126, 146 130, 130 124 C96 112, 82 78, 76 46 Z" fill="#fde047" stroke="#ca8a04" stroke-width="5" stroke-linejoin="round"/>
        <path d="M68 42 C72 80, 94 126, 146 142 C164 146, 174 134, 170 124 C166 114, 152 118, 138 112 C106 98, 92 66, 86 38 Z" fill="#fef08a" stroke="#ca8a04" stroke-width="5" stroke-linejoin="round"/>
        <rect x="64" y="30" width="22" height="16" rx="5" transform="rotate(-12 75 38)" fill="#a16207" stroke="#713f12" stroke-width="4"/>
        <circle cx="96" cy="96" r="5" fill="#1e293b"/>
        <circle cx="118" cy="110" r="5" fill="#1e293b"/>
        <path d="M98 112 Q104 122 113 119" stroke="#1e293b" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>
    `),
  },
  {
    id: 'grape',
    label: 'Grape',
    suggestedWord: 'GRAPE',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="178" rx="45" ry="9" fill="#e2e8f0"/>
        <path d="M100 46 L100 24" stroke="#7c4a2d" stroke-width="8" stroke-linecap="round"/>
        <path d="M102 36 C122 20, 148 26, 142 46 C128 54, 112 50, 102 36 Z" fill="#4ade80" stroke="#15803d" stroke-width="4" stroke-linejoin="round"/>
        <g stroke="#6b21a8" stroke-width="4.5">
          <circle cx="76" cy="70" r="21" fill="#a855f7"/>
          <circle cx="104" cy="66" r="21" fill="#c084fc"/>
          <circle cx="128" cy="74" r="21" fill="#a855f7"/>
          <circle cx="68" cy="100" r="21" fill="#c084fc"/>
          <circle cx="98" cy="98" r="22" fill="#a855f7"/>
          <circle cx="128" cy="102" r="21" fill="#9333ea"/>
          <circle cx="82" cy="128" r="21" fill="#9333ea"/>
          <circle cx="114" cy="130" r="21" fill="#a855f7"/>
          <circle cx="98" cy="154" r="20" fill="#c084fc"/>
        </g>
        <circle cx="90" cy="96" r="4.5" fill="#1e293b"/>
        <circle cx="107" cy="96" r="4.5" fill="#1e293b"/>
        <path d="M92 106 Q98 113 105 106" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      </svg>
    `),
  },
  {
    id: 'orange',
    label: 'Orange',
    suggestedWord: 'ORANGE',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="176" rx="52" ry="10" fill="#e2e8f0"/>
        <path d="M100 50 L100 32" stroke="#15803d" stroke-width="8" stroke-linecap="round"/>
        <path d="M102 42 C122 24, 150 30, 144 50 C130 58, 114 54, 102 42 Z" fill="#4ade80" stroke="#15803d" stroke-width="4" stroke-linejoin="round"/>
        <circle cx="100" cy="112" r="60" fill="#fb923c" stroke="#c2410c" stroke-width="5"/>
        <path d="M64 78 C54 90, 52 108, 56 120" stroke="#fed7aa" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.85"/>
        <circle cx="80" cy="110" r="6" fill="#1e293b"/>
        <circle cx="120" cy="110" r="6" fill="#1e293b"/>
        <circle cx="82" cy="108" r="2" fill="#ffffff"/>
        <circle cx="122" cy="108" r="2" fill="#ffffff"/>
        <ellipse cx="66" cy="122" rx="8" ry="5" fill="#fecaca" opacity="0.75"/>
        <ellipse cx="134" cy="122" rx="8" ry="5" fill="#fecaca" opacity="0.75"/>
        <path d="M88 124 Q100 136 112 124" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      </svg>
    `),
  },
  {
    id: 'mango',
    label: 'Mango',
    suggestedWord: 'MANGO',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="176" rx="46" ry="9" fill="#e2e8f0"/>
        <path d="M106 42 C124 22, 148 28, 144 46 C132 54, 116 50, 106 42 Z" fill="#4ade80" stroke="#15803d" stroke-width="4"/>
        <path d="M100 44 C144 44, 158 82, 148 122 C138 158, 104 174, 78 164 C52 154, 46 124, 58 96 C68 72, 76 44, 100 44 Z" fill="#fbbf24" stroke="#b45309" stroke-width="5"/>
        <path d="M100 48 C130 50, 142 74, 138 96 C122 86, 94 74, 78 68 C84 54, 92 48, 100 48 Z" fill="#f97316" opacity="0.45"/>
        <circle cx="84" cy="106" r="5.5" fill="#1e293b"/>
        <circle cx="116" cy="106" r="5.5" fill="#1e293b"/>
        <path d="M90 120 Q100 130 110 120" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      </svg>
    `),
  },
  {
    id: 'cat',
    label: 'Cat',
    suggestedWord: 'CAT',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="176" rx="52" ry="9" fill="#e2e8f0"/>
        <path d="M52 86 L46 36 L86 60 Z" fill="#fdba74" stroke="#c2410c" stroke-width="5" stroke-linejoin="round"/>
        <path d="M148 86 L154 36 L114 60 Z" fill="#fdba74" stroke="#c2410c" stroke-width="5" stroke-linejoin="round"/>
        <path d="M57 76 L54 48 L78 62 Z" fill="#fda4af"/>
        <path d="M143 76 L146 48 L122 62 Z" fill="#fda4af"/>
        <ellipse cx="100" cy="112" rx="60" ry="52" fill="#fed7aa" stroke="#c2410c" stroke-width="5"/>
        <path d="M100 62 L100 78 M86 64 L90 76 M114 64 L110 76" stroke="#ea580c" stroke-width="5" stroke-linecap="round"/>
        <circle cx="76" cy="106" r="7" fill="#1e293b"/>
        <circle cx="124" cy="106" r="7" fill="#1e293b"/>
        <circle cx="78" cy="103" r="2.5" fill="#ffffff"/>
        <circle cx="126" cy="103" r="2.5" fill="#ffffff"/>
        <polygon points="94,116 106,116 100,124" fill="#fb7185"/>
        <path d="M88 128 Q94 134 100 124 Q106 134 112 128" stroke="#1e293b" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M46 110 L66 114 M44 122 L66 122 M154 110 L134 114 M156 122 L134 122" stroke="#9a3412" stroke-width="3.5" stroke-linecap="round"/>
      </svg>
    `),
  },
  {
    id: 'dog',
    label: 'Dog',
    suggestedWord: 'DOG',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="176" rx="54" ry="9" fill="#e2e8f0"/>
        <ellipse cx="46" cy="106" rx="20" ry="38" transform="rotate(14 46 106)" fill="#92400e" stroke="#451a03" stroke-width="5"/>
        <ellipse cx="154" cy="106" rx="20" ry="38" transform="rotate(-14 154 106)" fill="#92400e" stroke="#451a03" stroke-width="5"/>
        <ellipse cx="100" cy="108" rx="56" ry="52" fill="#fcd34d" stroke="#78350f" stroke-width="5"/>
        <ellipse cx="100" cy="126" rx="34" ry="26" fill="#fef3c7"/>
        <circle cx="78" cy="98" r="7" fill="#1e293b"/>
        <circle cx="122" cy="98" r="7" fill="#1e293b"/>
        <circle cx="80" cy="95" r="2.5" fill="#ffffff"/>
        <circle cx="124" cy="95" r="2.5" fill="#ffffff"/>
        <ellipse cx="100" cy="116" rx="12" ry="8" fill="#1e293b"/>
        <path d="M88 130 Q100 142 112 130" stroke="#1e293b" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M94 136 Q100 152 106 136 Z" fill="#fb7185" stroke="#be123c" stroke-width="2.5"/>
      </svg>
    `),
  },
  {
    id: 'frog',
    label: 'Frog',
    suggestedWord: 'FROG',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="176" rx="56" ry="9" fill="#e2e8f0"/>
        <circle cx="68" cy="68" r="22" fill="#4ade80" stroke="#15803d" stroke-width="5"/>
        <circle cx="132" cy="68" r="22" fill="#4ade80" stroke="#15803d" stroke-width="5"/>
        <circle cx="68" cy="68" r="12" fill="#ffffff"/>
        <circle cx="132" cy="68" r="12" fill="#ffffff"/>
        <circle cx="70" cy="68" r="6" fill="#1e293b"/>
        <circle cx="130" cy="68" r="6" fill="#1e293b"/>
        <ellipse cx="100" cy="118" rx="64" ry="46" fill="#4ade80" stroke="#15803d" stroke-width="5"/>
        <ellipse cx="100" cy="132" rx="44" ry="26" fill="#bbf7d0"/>
        <ellipse cx="58" cy="116" rx="9" ry="6" fill="#fda4af" opacity="0.85"/>
        <ellipse cx="142" cy="116" rx="9" ry="6" fill="#fda4af" opacity="0.85"/>
        <path d="M74 118 Q100 138 126 118" stroke="#14532d" stroke-width="5" stroke-linecap="round" fill="none"/>
      </svg>
    `),
  },
  {
    id: 'lion',
    label: 'Lion',
    suggestedWord: 'LION',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="178" rx="54" ry="9" fill="#e2e8f0"/>
        <circle cx="100" cy="105" r="66" fill="#f97316" stroke="#9a3412" stroke-width="5" stroke-dasharray="22 8"/>
        <circle cx="100" cy="105" r="56" fill="#ea580c"/>
        <circle cx="62" cy="62" r="14" fill="#fbbf24" stroke="#9a3412" stroke-width="4"/>
        <circle cx="138" cy="62" r="14" fill="#fbbf24" stroke="#9a3412" stroke-width="4"/>
        <circle cx="100" cy="108" r="44" fill="#fde047" stroke="#9a3412" stroke-width="4.5"/>
        <circle cx="82" cy="102" r="6" fill="#1e293b"/>
        <circle cx="118" cy="102" r="6" fill="#1e293b"/>
        <polygon points="93,112 107,112 100,120" fill="#7c2d12"/>
        <path d="M88 124 Q94 130 100 120 Q106 130 112 124" stroke="#1e293b" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>
    `),
  },
  {
    id: 'duck',
    label: 'Duck',
    suggestedWord: 'DUCK',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="176" rx="50" ry="9" fill="#e2e8f0"/>
        <circle cx="100" cy="112" r="54" fill="#fde047" stroke="#ca8a04" stroke-width="5"/>
        <path d="M92 58 C92 42, 108 42, 110 56" stroke="#ca8a04" stroke-width="5" stroke-linecap="round" fill="none"/>
        <circle cx="78" cy="100" r="6.5" fill="#1e293b"/>
        <circle cx="122" cy="100" r="6.5" fill="#1e293b"/>
        <circle cx="80" cy="98" r="2" fill="#ffffff"/>
        <circle cx="124" cy="98" r="2" fill="#ffffff"/>
        <ellipse cx="100" cy="120" rx="22" ry="12" fill="#fb923c" stroke="#c2410c" stroke-width="4"/>
        <ellipse cx="64" cy="114" rx="8" ry="5" fill="#fda4af" opacity="0.8"/>
        <ellipse cx="136" cy="114" rx="8" ry="5" fill="#fda4af" opacity="0.8"/>
      </svg>
    `),
  },
  {
    id: 'star',
    label: 'Star',
    suggestedWord: 'STAR',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="176" rx="46" ry="9" fill="#e2e8f0"/>
        <polygon points="100,26 122,74 174,80 135,116 146,168 100,142 54,168 65,116 26,80 78,74" fill="#fde047" stroke="#ca8a04" stroke-width="5" stroke-linejoin="round"/>
        <circle cx="84" cy="98" r="6" fill="#1e293b"/>
        <circle cx="116" cy="98" r="6" fill="#1e293b"/>
        <path d="M88 114 Q100 124 112 114" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      </svg>
    `),
  },
  {
    id: 'car',
    label: 'Car',
    suggestedWord: 'CAR',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="168" rx="64" ry="9" fill="#e2e8f0"/>
        <path d="M52 106 L72 68 Q78 58 92 58 L122 58 Q134 58 142 70 L156 106 Z" fill="#60a5fa" stroke="#1d4ed8" stroke-width="5" stroke-linejoin="round"/>
        <path d="M76 74 L126 74 L136 102 L68 102 Z" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3.5" stroke-linejoin="round"/>
        <rect x="30" y="102" width="140" height="44" rx="20" fill="#fb7185" stroke="#be123c" stroke-width="5"/>
        <circle cx="64" cy="146" r="18" fill="#334155" stroke="#0f172a" stroke-width="4"/>
        <circle cx="64" cy="146" r="7" fill="#e2e8f0"/>
        <circle cx="138" cy="146" r="18" fill="#334155" stroke="#0f172a" stroke-width="4"/>
        <circle cx="138" cy="146" r="7" fill="#e2e8f0"/>
      </svg>
    `),
  },
  {
    id: 'cake',
    label: 'Cake',
    suggestedWord: 'CAKE',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="176" rx="58" ry="9" fill="#e2e8f0"/>
        <rect x="94" y="38" width="12" height="28" rx="4" fill="#60a5fa" stroke="#1d4ed8" stroke-width="3"/>
        <path d="M100 18 Q108 30 100 38 Q92 30 100 18 Z" fill="#fb923c" stroke="#c2410c" stroke-width="2.5"/>
        <rect x="44" y="88" width="112" height="72" rx="14" fill="#fbcfe8" stroke="#be185d" stroke-width="5"/>
        <path d="M44 92 Q58 112 72 94 Q86 114 100 94 Q114 114 128 94 Q142 112 156 92 L156 76 Q156 64 142 64 L58 64 Q44 64 44 76 Z" fill="#fff1f2" stroke="#be185d" stroke-width="4.5"/>
        <circle cx="80" cy="130" r="5" fill="#1e293b"/>
        <circle cx="120" cy="130" r="5" fill="#1e293b"/>
        <path d="M90 140 Q100 148 110 140" stroke="#1e293b" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>
    `),
  },
  {
    id: 'fish',
    label: 'Fish',
    suggestedWord: 'FISH',
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <ellipse cx="100" cy="174" rx="48" ry="9" fill="#e2e8f0"/>
        <path d="M138 106 L176 74 L168 106 L176 138 Z" fill="#fb923c" stroke="#c2410c" stroke-width="5" stroke-linejoin="round"/>
        <ellipse cx="94" cy="106" rx="58" ry="42" fill="#38bdf8" stroke="#0369a1" stroke-width="5"/>
        <path d="M78 70 Q94 106 78 142" stroke="#0284c7" stroke-width="5" fill="none"/>
        <circle cx="62" cy="98" r="8" fill="#ffffff"/>
        <circle cx="60" cy="98" r="4.5" fill="#1e293b"/>
        <path d="M48 114 Q58 122 68 114" stroke="#1e293b" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>
    `),
  },
];

export function getStickerByWord(word: string): string {
  const upper = (word ?? '').trim().toUpperCase();
  const match = STICKER_PRESETS.find((s) => s.suggestedWord === upper);
  return match ? match.dataUrl : STICKER_PRESETS[0].dataUrl;
}

export function getDefaultQuizzesForClass(classId: string): QuizItem[] {
  if (classId === 'class-grade1-fruits') {
    return [
      {
        id: 'q-fruit-banana',
        questionType: 'text-question',
        answerType: 'image',
        question: 'Which picture is a BANANA?',
        correctAnswer: 'BANANA',
        wrongAnswers: ['APPLE', 'GRAPE', 'ORANGE'],
        correctAnswerImage: getStickerByWord('BANANA'),
        wrongAnswerImages: [
          getStickerByWord('APPLE'),
          getStickerByWord('GRAPE'),
          getStickerByWord('ORANGE'),
        ],
      },
      {
        id: 'q-fruit-apple',
        questionType: 'image-question',
        answerType: 'text',
        question: '',
        correctAnswer: 'APPLE',
        wrongAnswers: ['MANGO', 'BANANA', 'GRAPE'],
        imageDataUrl: getStickerByWord('APPLE'),
      },
      {
        id: 'q-fruit-grape',
        questionType: 'text-question',
        answerType: 'image',
        question: 'Find the purple GRAPES!',
        correctAnswer: 'GRAPE',
        wrongAnswers: ['ORANGE', 'APPLE', 'MANGO'],
        correctAnswerImage: getStickerByWord('GRAPE'),
        wrongAnswerImages: [
          getStickerByWord('ORANGE'),
          getStickerByWord('APPLE'),
          getStickerByWord('MANGO'),
        ],
      },
      {
        id: 'q-fruit-orange',
        questionType: 'image-question',
        answerType: 'text',
        question: '',
        correctAnswer: 'ORANGE',
        wrongAnswers: ['BANANA', 'GRAPE', 'APPLE'],
        imageDataUrl: getStickerByWord('ORANGE'),
      },
      {
        id: 'q-fruit-mango',
        questionType: 'text-question',
        answerType: 'text',
        question: 'Which sweet tropical fruit is golden inside with one big seed?',
        correctAnswer: 'MANGO',
        wrongAnswers: ['APPLE', 'ORANGE', 'GRAPE'],
      },
    ];
  }

  if (classId === 'class-grade2-animals') {
    return [
      {
        id: 'q-animal-cat',
        questionType: 'text-question',
        answerType: 'image',
        question: 'Which cute pet says "Meow"?',
        correctAnswer: 'CAT',
        wrongAnswers: ['DOG', 'FROG', 'DUCK'],
        correctAnswerImage: getStickerByWord('CAT'),
        wrongAnswerImages: [
          getStickerByWord('DOG'),
          getStickerByWord('FROG'),
          getStickerByWord('DUCK'),
        ],
      },
      {
        id: 'q-animal-dog',
        questionType: 'image-question',
        answerType: 'text',
        question: '',
        correctAnswer: 'DOG',
        wrongAnswers: ['CAT', 'LION', 'DUCK'],
        imageDataUrl: getStickerByWord('DOG'),
      },
      {
        id: 'q-animal-frog',
        questionType: 'text-question',
        answerType: 'image',
        question: 'Which green animal says "Ribbit"?',
        correctAnswer: 'FROG',
        wrongAnswers: ['LION', 'DOG', 'CAT'],
        correctAnswerImage: getStickerByWord('FROG'),
        wrongAnswerImages: [
          getStickerByWord('LION'),
          getStickerByWord('DOG'),
          getStickerByWord('CAT'),
        ],
      },
      {
        id: 'q-animal-lion',
        questionType: 'text-question',
        answerType: 'text',
        question: 'Which wild cat has a big mane and is called the king of the jungle?',
        correctAnswer: 'LION',
        wrongAnswers: ['FROG', 'DUCK', 'CAT'],
      },
      {
        id: 'q-animal-duck',
        questionType: 'image-question',
        answerType: 'text',
        question: '',
        correctAnswer: 'DUCK',
        wrongAnswers: ['DOG', 'LION', 'FROG'],
        imageDataUrl: getStickerByWord('DUCK'),
      },
    ];
  }

  return [];
}

export function createStarterQuizzesFromWords(words: WordItem[]): QuizItem[] {
  if (!Array.isArray(words)) return [];
  const validWords = words.filter(
    (w): w is WordItem => Boolean(w && typeof w.word === 'string' && w.word.trim())
  );
  if (validWords.length < 2) return [];
  return validWords.map((item, idx) => {
    const otherWords = validWords.filter((_, j) => j !== idx).slice(0, 3);
    const distractors = otherWords.map((w) => w.word);
    if (idx % 2 === 1 && item.imageDataUrl) {
      return {
        id: `q-auto-${item.id}`,
        questionType: 'text-question',
        answerType: 'image',
        question: item.word,
        correctAnswer: item.word,
        wrongAnswers: distractors,
        correctAnswerImage: item.imageDataUrl,
        wrongAnswerImages: otherWords
          .map((w) => w.imageDataUrl)
          .filter((img): img is string => Boolean(img)),
      };
    }
    return {
      id: `q-auto-${item.id}`,
      questionType: 'image-question',
      answerType: 'text',
      question: '',
      correctAnswer: item.word,
      wrongAnswers: distractors,
      imageDataUrl: item.imageDataUrl || getStickerByWord(item.word),
    };
  });
}

export function createDefaultClasses(): ClassRoom[] {
  const now = Date.now();
  return [
    {
      id: 'class-grade1-fruits',
      name: 'Grade 1 - Fruits',
      createdAt: now,
      updatedAt: now,
      words: [
        { id: 'w-apple', word: 'APPLE', imageDataUrl: getStickerByWord('APPLE') },
        { id: 'w-banana', word: 'BANANA', imageDataUrl: getStickerByWord('BANANA') },
        { id: 'w-grape', word: 'GRAPE', imageDataUrl: getStickerByWord('GRAPE') },
        { id: 'w-orange', word: 'ORANGE', imageDataUrl: getStickerByWord('ORANGE') },
        { id: 'w-mango', word: 'MANGO', imageDataUrl: getStickerByWord('MANGO') },
      ],
      quizzes: getDefaultQuizzesForClass('class-grade1-fruits'),
    },
    {
      id: 'class-grade2-animals',
      name: 'Grade 2 - Animals',
      createdAt: now + 1,
      updatedAt: now + 1,
      words: [
        { id: 'w-cat', word: 'CAT', imageDataUrl: getStickerByWord('CAT') },
        { id: 'w-dog', word: 'DOG', imageDataUrl: getStickerByWord('DOG') },
        { id: 'w-frog', word: 'FROG', imageDataUrl: getStickerByWord('FROG') },
        { id: 'w-lion', word: 'LION', imageDataUrl: getStickerByWord('LION') },
        { id: 'w-duck', word: 'DUCK', imageDataUrl: getStickerByWord('DUCK') },
      ],
      quizzes: getDefaultQuizzesForClass('class-grade2-animals'),
    },
  ];
}
