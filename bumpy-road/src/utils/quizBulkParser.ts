import { QuizItem } from '../types/game';

export interface ParsedQuizPreview {
  items: Omit<QuizItem, 'id'>[];
  errors: string[];
}

function stripQuestionPrefix(text: string): string {
  return text
    .replace(/^\s*(?:Q(?:uestion)?|C[aâ]u)\s*\d+\s*[:.)-]?\s*/i, '')
    .replace(/^\s*\d+\s*[.):-]\s*/, '')
    .trim();
}

function stripOptionPrefix(text: string): { text: string; starred: boolean; letter?: string } {
  let s = text.trim();
  let starred = false;

  if (s.startsWith('*')) {
    starred = true;
    s = s.slice(1).trim();
  }

  let letter: string | undefined;
  const letterMatch = s.match(/^([A-Da-d])\s*[.):]\s*(.+)$/);
  if (letterMatch) {
    letter = letterMatch[1].toUpperCase();
    s = letterMatch[2].trim();
  } else if (/^[-•]\s+/.test(s)) {
    s = s.replace(/^[-•]\s+/, '').trim();
  }

  if (s.startsWith('*')) {
    starred = true;
    s = s.slice(1).trim();
  }
  if (s.endsWith('*') && !s.endsWith('\\*')) {
    starred = true;
    s = s.slice(0, -1).trim();
  }

  return { text: s, starred, letter };
}

function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function buildQuizFromLineParts(
  parts: string[],
  rowNum: number,
  errors: string[]
): Omit<QuizItem, 'id'> | null {
  const cleanParts = parts.map((p) => p.trim()).filter(Boolean);
  if (cleanParts.length < 3) {
    errors.push(`Line ${rowNum}: Need Question + at least 2 answers (1 correct, 1 wrong).`);
    return null;
  }

  const question = stripQuestionPrefix(cleanParts[0]);
  if (question.length < 2) {
    errors.push(`Line ${rowNum}: Question text is too short.`);
    return null;
  }

  const optionTokens = cleanParts.slice(1).map(stripOptionPrefix);
  let correctIndex = optionTokens.findIndex((o) => o.starred);
  if (correctIndex === -1) {
    correctIndex = 0;
  }

  const correctAnswer = optionTokens[correctIndex]?.text ?? '';
  if (!correctAnswer) {
    errors.push(`Line ${rowNum}: Missing correct answer.`);
    return null;
  }

  const seen = new Set<string>([correctAnswer.toLowerCase()]);
  const wrongAnswers: string[] = [];
  for (let i = 0; i < optionTokens.length; i++) {
    if (i === correctIndex) continue;
    const val = optionTokens[i].text;
    if (!val) continue;
    const key = val.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      wrongAnswers.push(val);
    }
  }

  if (wrongAnswers.length === 0) {
    errors.push(`Line ${rowNum}: Need at least 1 wrong answer different from the correct one.`);
    return null;
  }

  return {
    questionType: 'text-question',
    answerType: 'text',
    question: question.slice(0, 140),
    correctAnswer: correctAnswer.slice(0, 48),
    wrongAnswers: wrongAnswers.slice(0, 3).map((w) => w.slice(0, 48)),
  };
}

function parseDelimitedLine(line: string): string[] | null {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes('|')) return line.split('|');
  if (line.includes(';')) return line.split(';');
  // Support CSV lines if they have at least 2 commas
  if ((line.match(/,/g) ?? []).length >= 2) {
    return parseCsvRow(line);
  }
  return null;
}

export function parseBulkQuizText(rawText: string): ParsedQuizPreview {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return { items: [], errors: [] };
  }

  const items: Omit<QuizItem, 'id'>[] = [];
  const errors: string[] = [];

  // Split into blocks by blank lines or horizontal rules (---)
  const rawBlocks = normalized
    .split(/\n\s*\n+|\n\s*---+\s*\n/g)
    .map((b) => b.trim())
    .filter(Boolean);

  for (let bIdx = 0; bIdx < rawBlocks.length; bIdx++) {
    const blockLines = rawBlocks[bIdx]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (blockLines.length === 0) continue;

    // Check if every line in this block is a single-line delimited row
    const allDelimited = blockLines.every((l) => parseDelimitedLine(l) !== null);
    if (allDelimited) {
      blockLines.forEach((line, lIdx) => {
        const parts = parseDelimitedLine(line);
        if (!parts) return;
        // Skip optional CSV/TSV header row
        const firstLower = parts[0]?.trim().toLowerCase() ?? '';
        if (
          bIdx === 0 &&
          lIdx === 0 &&
          (firstLower === 'question' || firstLower === 'câu hỏi' || firstLower === 'prompt')
        ) {
          return;
        }
        const built = buildQuizFromLineParts(parts, lIdx + 1, errors);
        if (built) items.push(built);
      });
      continue;
    }

    // Otherwise treat as a multi-line Question + Options block
    if (blockLines.length < 3) {
      errors.push(
        `Block ${bIdx + 1} ("${blockLines[0].slice(0, 28)}..."): Need a question line and at least 2 answer lines.`
      );
      continue;
    }

    const question = stripQuestionPrefix(blockLines[0]);
    if (question.length < 2) {
      errors.push(`Block ${bIdx + 1}: Question text is too short.`);
      continue;
    }

    let explicitAnswerMarker: string | null = null;
    const optionLines: string[] = [];

    for (let i = 1; i < blockLines.length; i++) {
      const line = blockLines[i];
      const ansMatch = line.match(
        /^(?:Answer|Correct(?:\s+answer)?|Ans|Đáp\s*án)\s*[:=-]\s*(.+)$/i
      );
      if (ansMatch) {
        explicitAnswerMarker = ansMatch[1].trim();
      } else {
        optionLines.push(line);
      }
    }

    const parsedOpts = optionLines.map(stripOptionPrefix).filter((o) => o.text.length > 0);
    if (parsedOpts.length < 2) {
      errors.push(`Block ${bIdx + 1} ("${question.slice(0, 24)}..."): Need at least 2 options.`);
      continue;
    }

    let correctIdx = parsedOpts.findIndex((o) => o.starred);
    if (correctIdx === -1 && explicitAnswerMarker) {
      const markerClean = explicitAnswerMarker.replace(/[.)]$/, '').trim().toUpperCase();
      if (/^[A-D]$/.test(markerClean)) {
        const byLetter = parsedOpts.findIndex((o) => o.letter === markerClean);
        if (byLetter !== -1) {
          correctIdx = byLetter;
        } else {
          const alphaIdx = markerClean.charCodeAt(0) - 65;
          if (alphaIdx >= 0 && alphaIdx < parsedOpts.length) {
            correctIdx = alphaIdx;
          }
        }
      }
      if (correctIdx === -1) {
        const markerLower = explicitAnswerMarker.toLowerCase();
        correctIdx = parsedOpts.findIndex((o) => o.text.toLowerCase() === markerLower);
      }
    }
    if (correctIdx === -1) {
      correctIdx = 0;
    }

    const correctAnswer = parsedOpts[correctIdx].text;
    const seen = new Set<string>([correctAnswer.toLowerCase()]);
    const wrongAnswers: string[] = [];
    for (let i = 0; i < parsedOpts.length; i++) {
      if (i === correctIdx) continue;
      const val = parsedOpts[i].text;
      const key = val.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        wrongAnswers.push(val);
      }
    }

    if (wrongAnswers.length === 0) {
      errors.push(`Block ${bIdx + 1} ("${question.slice(0, 24)}..."): Need at least 1 wrong option.`);
      continue;
    }

    items.push({
      questionType: 'text-question',
      answerType: 'text',
      question: question.slice(0, 140),
      correctAnswer: correctAnswer.slice(0, 48),
      wrongAnswers: wrongAnswers.slice(0, 3).map((w) => w.slice(0, 48)),
    });
  }

  return { items, errors };
}

export const BULK_QUIZ_SAMPLE = `What animal says "Meow"? | Cat | Dog | Duck | Frog
Which fruit is yellow and curved? | Banana | Apple | Grape | Watermelon
What color is a sunny sky? | Blue | Red | Brown | Purple

1. Which animal can swim in water?
A. Elephant
B. *Fish
C. Monkey
D. Rabbit`;
