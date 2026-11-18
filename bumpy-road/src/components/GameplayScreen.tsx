import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Volume2,
  Undo2,
  Trash2,
  Play,
  RotateCcw,
  Settings2,
  HelpCircle,
  CheckCircle2,
  ImagePlus,
} from 'lucide-react';
import {
  CarSettings,
  ClassRoom,
  FlyingLetter,
  GameMode,
  LetterNode,
  PlayPhase,
  QuizItem,
  QuizNode,
  WordItem,
} from '../types/game';
import { preloadWordAudio, soundEngine, speakWord } from '../utils/audio';
import { createStarterQuizzesFromWords } from '../utils/illustrations';
import { fileToDataUrl, resizeBackgroundDataUrl } from '../utils/imageProcessor';
import { drawCartoonLetterBlockOnCanvas, drawRoundedRectPath } from '../utils/letterStyles';
import { CartoonLetterTile } from './CartoonLetterTile';

const CAPYBARA_CAR_SRC =
  '/assets/aistudio/1794577203694_8202540140519589570_8202540140519589570_9d096bc92fd8c2e57e2410821cdb135f_148b7084.jpg';

const CAPYBARA_BOOM_SRC =
  '/assets/aistudio/Capybara_with_soot-covered_face_5ca7f4ef_92126732.jpg';

const PLAYGROUND_BG_SRC =
  '/assets/aistudio/Create_cartoon_grass_field_backg__51e75dca_526808d2.jpg';

const DOCK_ORB_SPRITE_SRC =
  '/assets/aistudio/Game_cover_art_809224ac_d4ea09ba.jpg';

const VICTORY_ORB_SPRITE_SRC =
  '/assets/aistudio/Game_cover_art_fbe69390_809f3132.jpg';

const FINISH_SIGN_SRC =
  '/assets/aistudio/Game_cover_art_ccea319f_543ec40d.jpg';

type DockOrbKey = 'undo' | 'clear' | 'go';

interface OrbRegion<T extends string> {
  key: T;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function extractOrbSprites<T extends string>(
  img: HTMLImageElement,
  regions: OrbRegion<T>[]
): Partial<Record<T, string>> {
  const result: Partial<Record<T, string>> = {};
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return result;

  for (const region of regions) {
    const sx0 = Math.floor(iw * region.x0);
    const sy0 = Math.floor(ih * region.y0);
    const sw = Math.max(1, Math.floor(iw * region.x1) - sx0);
    const sh = Math.max(1, Math.floor(ih * region.y1) - sy0);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.drawImage(img, sx0, sy0, sw, sh, 0, 0, sw, sh);
    const imageData = ctx.getImageData(0, 0, sw, sh);
    const data = imageData.data;

    const isCheckerboard = (idx: number): boolean => {
      const a = data[idx + 3];
      if (a < 15) return true;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const minC = Math.min(r, g, b);
      const maxC = Math.max(r, g, b);
      return minC >= 158 && maxC - minC <= 22;
    };

    const visited = new Uint8Array(sw * sh);
    const queue = new Int32Array(sw * sh);
    let head = 0;
    let tail = 0;

    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= sw || y >= sh) return;
      const p = y * sw + x;
      if (visited[p]) return;
      if (isCheckerboard(p * 4)) {
        visited[p] = 1;
        queue[tail++] = p;
      }
    };

    for (let x = 0; x < sw; x++) {
      push(x, 0);
      push(x, sh - 1);
    }
    for (let y = 0; y < sh; y++) {
      push(0, y);
      push(sw - 1, y);
    }

    while (head < tail) {
      const p = queue[head++];
      const x = p % sw;
      const y = (p - x) / sw;
      data[p * 4 + 3] = 0;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }

    let minX = sw;
    let minY = sh;
    let maxX = 0;
    let maxY = 0;

    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const p = y * sw + x;
        if (visited[p] || data[p * 4 + 3] === 0) continue;
        const borderTouch =
          visited[p - 1] || visited[p + 1] || visited[p - sw] || visited[p + sw];
        if (borderTouch) {
          const idx = p * 4;
          const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          if (avg > 175) {
            data[idx + 3] = Math.round(data[idx + 3] * 0.35);
          }
        }
        if (data[p * 4 + 3] > 20) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    if (maxX > minX && maxY > minY) {
      const pad = 2;
      const cx = Math.max(0, minX - pad);
      const cy = Math.max(0, minY - pad);
      const cw = Math.min(sw - cx, maxX - minX + pad * 2);
      const ch = Math.min(sh - cy, maxY - minY + pad * 2);

      const outSize = 160;
      const cropped = document.createElement('canvas');
      cropped.width = outSize;
      cropped.height = outSize;
      const cCtx = cropped.getContext('2d');
      if (cCtx) {
        cCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, outSize, outSize);
        result[region.key] = cropped.toDataURL('image/png');
        continue;
      }
    }
    result[region.key] = canvas.toDataURL('image/png');
  }

  return result;
}

function extractDockOrbs(img: HTMLImageElement): Partial<Record<DockOrbKey, string>> {
  return extractOrbSprites(img, [
    { key: 'undo', x0: 0.02, y0: 0.04, x1: 0.335, y1: 0.48 },
    { key: 'clear', x0: 0.338, y0: 0.04, x1: 0.662, y1: 0.48 },
    { key: 'go', x0: 0.665, y0: 0.04, x1: 0.985, y1: 0.48 },
  ]);
}

interface GameplayScreenProps {
  activeClass: ClassRoom | undefined;
  gameMode: GameMode;
  resetSignal: number;
  carSettings?: CarSettings;
  playgroundBgDataUrl?: string | null;
  onUpdatePlaygroundBg?: (dataUrl: string | null) => void;
  onOpenSetup: () => void;
  onPathPresenceChange: (hasPath: boolean) => void;
}

interface Point {
  x: number;
  y: number;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vRot: number;
}

interface SmokePuff {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  alpha: number;
  decay: number;
}

function loadCutoutCarSprite(
  src: string,
  minBackdropBrightness: number,
  maxColorDiff: number,
  onReady: (canvas: HTMLCanvasElement | null) => void
): () => void {
  let cancelled = false;
  const img = new Image();
  img.onload = () => {
    if (cancelled) return;
    try {
      const maxW = 600;
      const scale = Math.min(1, maxW / Math.max(1, img.width));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const rawCanvas = document.createElement('canvas');
      rawCanvas.width = w;
      rawCanvas.height = h;
      const rawCtx = rawCanvas.getContext('2d');
      if (!rawCtx) {
        onReady(null);
        return;
      }

      rawCtx.drawImage(img, 0, 0, w, h);
      const imageData = rawCtx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Clear small bottom-right star watermark corner
      for (let y = Math.floor(h * 0.8); y < h; y++) {
        for (let x = Math.floor(w * 0.87); x < w; x++) {
          data[(y * w + x) * 4 + 3] = 0;
        }
      }

      const isBackdrop = (idx: number): boolean => {
        const a = data[idx + 3];
        if (a < 15) return true;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const minC = Math.min(r, g, b);
        const maxC = Math.max(r, g, b);
        return minC >= minBackdropBrightness && maxC - minC <= maxColorDiff;
      };

      const visited = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let head = 0;
      let tail = 0;

      const push = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const p = y * w + x;
        if (visited[p]) return;
        if (isBackdrop(p * 4)) {
          visited[p] = 1;
          queue[tail++] = p;
        }
      };

      for (let x = 0; x < w; x++) {
        push(x, 0);
        push(x, h - 1);
      }
      for (let y = 0; y < h; y++) {
        push(0, y);
        push(w - 1, y);
      }

      while (head < tail) {
        const p = queue[head++];
        const x = p % w;
        const y = (p - x) / w;
        data[p * 4 + 3] = 0;
        push(x + 1, y);
        push(x - 1, y);
        push(x, y + 1);
        push(x, y - 1);
      }

      let minX = w;
      let minY = h;
      let maxX = 0;
      let maxY = 0;

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x;
          if (visited[p] || data[p * 4 + 3] === 0) continue;
          const borderTouch =
            visited[p - 1] || visited[p + 1] || visited[p - w] || visited[p + w];
          if (borderTouch) {
            const idx = p * 4;
            const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            if (avg > minBackdropBrightness + 15) {
              data[idx + 3] = Math.round(data[idx + 3] * 0.45);
            }
          }
          if (data[p * 4 + 3] > 20) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      rawCtx.putImageData(imageData, 0, 0);

      if (maxX > minX && maxY > minY) {
        const pad = 4;
        const sx = Math.max(0, minX - pad);
        const sy = Math.max(0, minY - pad);
        const sw = Math.min(w - sx, maxX - minX + pad * 2);
        const sh = Math.min(h - sy, maxY - minY + pad * 2);

        const cropped = document.createElement('canvas');
        cropped.width = sw;
        cropped.height = sh;
        const cCtx = cropped.getContext('2d');
        if (cCtx) {
          cCtx.drawImage(rawCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
          onReady(cropped);
          return;
        }
      }
      onReady(rawCanvas);
    } catch {
      onReady(null);
    }
  };
  img.onerror = () => {
    if (!cancelled) onReady(null);
  };
  img.src = src;
  return () => {
    cancelled = true;
  };
}

const NODE_PALETTE = [
  { fill: '#fde68a', rim: '#d97706', text: '#451a03' }, // Buttercup
  { fill: '#bae6fd', rim: '#0284c7', text: '#0c4a6e' }, // Sky
  { fill: '#fbcfe8', rim: '#db2777', text: '#831843' }, // Rose Pink
  { fill: '#bbf7d0', rim: '#16a34a', text: '#14532d' }, // Mint
  { fill: '#ddd6fe', rim: '#7c3aed', text: '#4c1d95' }, // Lavender
  { fill: '#fed7aa', rim: '#ea580c', text: '#7c2d12' }, // Peach
];

const CONFETTI_COLORS = [
  '#fb7185',
  '#fbbf24',
  '#34d399',
  '#38bdf8',
  '#a78bfa',
  '#fb923c',
];

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function lerpAngle(current: number, target: number, factor: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * factor;
}

function getStartPos(w: number, h: number): Point {
  return {
    x: Math.max(84, Math.min(128, w * 0.12)),
    y: Math.max(82, Math.min(h - 102, h * 0.54)),
  };
}

function getFinishPos(w: number, h: number): Point {
  return {
    x: Math.min(w - 86, Math.max(w - 134, w * 0.89)),
    y: Math.max(88, Math.min(h - 102, h * 0.54)),
  };
}

function generateScatteredNodes(
  word: string,
  width: number,
  height: number
): LetterNode[] {
  const letters = (word ?? '').trim().split('');
  if (letters.length === 0) return [];
  const radius = width < 520 ? 31 : Math.min(44, Math.max(35, width * 0.042));
  const startPos = getStartPos(width, height);
  const finishPos = getFinishPos(width, height);

  const marginX = radius + 24;
  const minX = Math.max(marginX, startPos.x + 110);
  const maxX = Math.max(minX + 60, width - marginX - 22);
  const minY = radius + 24;
  const maxY = Math.max(minY + 36, height - 96 - radius);

  // Shuffle placement order so sequential letters aren't clustered predictably
  const indices = letters.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const placed: LetterNode[] = [];
  let minSpacing = radius * 2.55;

  for (const wordIdx of indices) {
    let chosen: Point | null = null;

    for (let attempt = 0; attempt < 260; attempt++) {
      const currentSpacing = attempt > 160 ? radius * 2.15 : minSpacing;
      const cand: Point = {
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY),
      };

      // Avoid START pad
      if (dist(cand, startPos) < radius + 94) continue;
      // Avoid FINISH sign
      if (dist(cand, finishPos) < radius + 98) continue;
      // Avoid other nodes
      if (placed.some((p) => dist(cand, p) < currentSpacing)) continue;

      chosen = cand;
      break;
    }

    if (!chosen) {
      // Deterministic grid fallback if viewport is extremely cramped
      const cols = Math.max(2, Math.floor((maxX - minX) / (radius * 2.2)));
      const slot = placed.length;
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      chosen = {
        x: Math.min(maxX, minX + col * radius * 2.25 + 10),
        y: Math.min(maxY, minY + row * radius * 2.25 + 10),
      };
    }

    const palette = NODE_PALETTE[wordIdx % NODE_PALETTE.length];
    placed.push({
      id: `node-${wordIdx}-${Math.random().toString(36).slice(2, 7)}`,
      char: letters[wordIdx],
      indexInWord: wordIdx,
      x: chosen.x,
      y: chosen.y,
      radius,
      fillColor: palette.fill,
      rimColor: palette.rim,
      textColor: palette.text,
      collected: false,
    });
  }

  return placed;
}

let quizMeasureCtx: CanvasRenderingContext2D | null = null;
function measureQuizAnswerWidth(text: string, isCompact: boolean): number {
  if (typeof document === 'undefined') return isCompact ? 160 : 200;
  if (!quizMeasureCtx) {
    const c = document.createElement('canvas');
    quizMeasureCtx = c.getContext('2d');
  }
  const minW = isCompact ? 148 : 186;
  const maxW = isCompact ? 260 : 340;
  if (!quizMeasureCtx) return Math.max(minW, text.length * 20 + 64);
  quizMeasureCtx.font = `800 ${isCompact ? 26 : 32}px Fredoka, Nunito, sans-serif`;
  const measured = quizMeasureCtx.measureText(text).width;
  return Math.max(minW, Math.min(maxW, Math.ceil(measured) + (isCompact ? 58 : 76)));
}

function generateScatteredQuizNodes(
  quiz: QuizItem,
  width: number,
  height: number
): QuizNode[] {
  const isImageAnswers =
    quiz.questionType !== 'image-question' &&
    quiz.answerType === 'image' &&
    Boolean(quiz.correctAnswerImage);

  const uniqueOptions: {
    text: string;
    imageDataUrl?: string;
    isCorrect: boolean;
  }[] = [];

  const correctText = (quiz.correctAnswer ?? '').trim();
  if (isImageAnswers && quiz.correctAnswerImage) {
    uniqueOptions.push({
      text: correctText,
      imageDataUrl: quiz.correctAnswerImage,
      isCorrect: true,
    });
    for (const imgUrl of quiz.wrongAnswerImages ?? []) {
      const cleanImg = (imgUrl ?? '').trim();
      if (cleanImg && !uniqueOptions.some((o) => o.imageDataUrl === cleanImg)) {
        uniqueOptions.push({
          text: '',
          imageDataUrl: cleanImg,
          isCorrect: false,
        });
      }
      if (uniqueOptions.length >= 4) break;
    }
  } else {
    uniqueOptions.push({ text: correctText, isCorrect: true });
    for (const w of quiz.wrongAnswers ?? []) {
      const clean = (w ?? '').trim();
      if (
        clean &&
        !uniqueOptions.some((o) => o.text.toLowerCase() === clean.toLowerCase())
      ) {
        uniqueOptions.push({ text: clean, isCorrect: false });
      }
      if (uniqueOptions.length >= 4) break;
    }
  }

  // Shuffle options randomly so the right answer moves around every round
  for (let i = uniqueOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniqueOptions[i], uniqueOptions[j]] = [uniqueOptions[j], uniqueOptions[i]];
  }

  const startPos = getStartPos(width, height);
  const finishPos = getFinishPos(width, height);
  const isCompact = width < 520;
  const maxFitH = Math.max(96, Math.floor((height - 126) / 2));
  const maxFitW = Math.max(96, Math.floor((width - 250) / 2.25));
  const imgTileSize =
    isCompact
      ? Math.min(118, maxFitH)
      : Math.min(176, Math.max(128, Math.min(maxFitH, maxFitW)));
  const textNodeH = isCompact ? 68 : 84;
  const placed: QuizNode[] = [];

  for (let i = 0; i < uniqueOptions.length; i++) {
    const opt = uniqueOptions[i];
    const nodeW = opt.imageDataUrl
      ? imgTileSize
      : measureQuizAnswerWidth(opt.text, isCompact);
    const nodeH = opt.imageDataUrl ? imgTileSize : textNodeH;
    const halfW = nodeW / 2;
    const halfH = nodeH / 2;

    const minX = Math.max(halfW + 18, startPos.x + 88);
    const maxX = Math.max(minX + 40, width - halfW - 18);
    const minY = halfH + 18;
    const maxY = Math.max(minY + 30, height - 92 - halfH);

    let chosen: Point | null = null;
    for (let attempt = 0; attempt < 300; attempt++) {
      const gap = attempt > 180 ? 10 : 20;
      const cand: Point = {
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY),
      };

      // Avoid START pad
      if (
        Math.abs(cand.x - startPos.x) < halfW + 76 &&
        Math.abs(cand.y - startPos.y) < halfH + 66
      ) {
        continue;
      }
      // Avoid FINISH sign
      if (
        Math.abs(cand.x - finishPos.x) < halfW + 80 &&
        Math.abs(cand.y - finishPos.y) < halfH + 78
      ) {
        continue;
      }
      // Avoid other answer bubbles
      if (
        placed.some(
          (p) =>
            Math.abs(cand.x - p.x) < (nodeW + p.width) / 2 + gap &&
            Math.abs(cand.y - p.y) < (nodeH + p.height) / 2 + gap
        )
      ) {
        continue;
      }

      chosen = cand;
      break;
    }

    if (!chosen) {
      const cols = 2;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const totalRows = Math.max(1, Math.ceil(uniqueOptions.length / cols));
      chosen = {
        x: minX + col * (maxX - minX),
        y: minY + (totalRows === 1 ? 0.5 : row / (totalRows - 1)) * (maxY - minY),
      };
    }

    const palette = NODE_PALETTE[i % NODE_PALETTE.length];
    placed.push({
      id: `qnode-${i}-${Math.random().toString(36).slice(2, 7)}`,
      text: opt.text,
      imageDataUrl: opt.imageDataUrl,
      isCorrect: opt.isCorrect,
      x: chosen.x,
      y: chosen.y,
      width: nodeW,
      height: nodeH,
      fillColor: palette.fill,
      rimColor: palette.rim,
      textColor: palette.text,
      collected: false,
    });
  }

  return placed;
}

function distToQuizNode(pt: Point, node: QuizNode): number {
  const dx = Math.max(0, Math.abs(pt.x - node.x) - node.width / 2);
  const dy = Math.max(0, Math.abs(pt.y - node.y) - node.height / 2);
  return Math.hypot(dx, dy);
}

function drawQuizAnswerBubbleOnCanvas(
  ctx: CanvasRenderingContext2D,
  node: QuizNode,
  isConnected: boolean,
  isHighlighted: boolean,
  pulseScale: number,
  imgCache: Map<string, HTMLImageElement>
) {
  ctx.save();
  ctx.translate(node.x, node.y);
  ctx.scale(pulseScale, pulseScale);

  const w = node.width;
  const h = node.height;
  const isImageTile = Boolean(node.imageDataUrl);
  const r = isImageTile ? 22 : h * 0.42;

  if (node.collected) {
    ctx.fillStyle = 'rgba(209, 250, 229, 0.72)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    drawRoundedRectPath(ctx, -w / 2, -h / 2, w, h, r);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Highlight halo when connected or hovered
  if (isHighlighted || isConnected) {
    ctx.save();
    ctx.shadowColor = isConnected ? '#38bdf8' : '#facc15';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = isConnected ? '#38bdf8' : '#fde047';
    ctx.lineWidth = 6;
    drawRoundedRectPath(ctx, -w / 2 - 4, -h / 2 - 4, w + 8, h + 8, r + 4);
    ctx.stroke();
    ctx.restore();
  }

  // 3D bottom lip / shadow
  ctx.fillStyle = node.rimColor;
  drawRoundedRectPath(ctx, -w / 2, -h / 2 + 5, w, h, r);
  ctx.fill();

  // Main body (crisp cream-white interior for image-only cards, pastel fill for text pills)
  ctx.fillStyle = isImageTile ? '#ffffff' : node.fillColor;
  ctx.strokeStyle = node.rimColor;
  ctx.lineWidth = 4;
  drawRoundedRectPath(ctx, -w / 2, -h / 2, w, h, r);
  ctx.fill();
  ctx.stroke();

  if (isImageTile && node.imageDataUrl) {
    // Subtle inner pastel frame ring
    ctx.strokeStyle = node.fillColor;
    ctx.lineWidth = 2.5;
    drawRoundedRectPath(ctx, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, Math.max(12, r - 4));
    ctx.stroke();

    const cachedImg = imgCache.get(node.imageDataUrl);
    if (
      cachedImg &&
      cachedImg.complete &&
      cachedImg.naturalWidth > 0 &&
      cachedImg.naturalHeight > 0
    ) {
      const innerPad = 6;
      const maxDimW = w - innerPad * 2;
      const maxDimH = h - innerPad * 2;
      const scale = Math.min(
        maxDimW / cachedImg.naturalWidth,
        maxDimH / cachedImg.naturalHeight
      );
      const drawW = cachedImg.naturalWidth * scale;
      const drawH = cachedImg.naturalHeight * scale;
      if (drawW > 0 && drawH > 0) {
        ctx.drawImage(cachedImg, -drawW / 2, -drawH / 2, drawW, drawH);
      }
    }
  } else {
    // Top glossy sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    drawRoundedRectPath(ctx, -w / 2 + 8, -h / 2 + 5, w - 16, h * 0.34, r * 0.5);
    ctx.fill();

    // Crisp answer label (large cartoon typography, auto-shrink only if long)
    let fontSize = h < 74 ? 26 : 32;
    ctx.font = `800 ${fontSize}px Fredoka, Nunito, sans-serif`;
    while (fontSize > 16 && ctx.measureText(node.text).width > w - 34) {
      fontSize -= 2;
      ctx.font = `800 ${fontSize}px Fredoka, Nunito, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.strokeText(node.text, 0, 1);
    ctx.fillStyle = node.textColor;
    ctx.fillText(node.text, 0, 1);
  }

  if (isConnected) {
    ctx.fillStyle = '#0ea5e9';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(w / 2 - 6, -h / 2 + 6, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 10, -h / 2 + 6);
    ctx.lineTo(w / 2 - 7, -h / 2 + 9);
    ctx.lineTo(w / 2 - 2, -h / 2 + 3);
    ctx.stroke();
  }

  ctx.restore();
}

export const GameplayScreen: React.FC<GameplayScreenProps> = ({
  activeClass,
  gameMode,
  resetSignal,
  carSettings,
  playgroundBgDataUrl,
  onUpdatePlaygroundBg,
  onOpenSetup,
  onPathPresenceChange,
}) => {
  const isQuizMode = gameMode === 'quiz';
  const words: WordItem[] = useMemo(
    () =>
      (activeClass?.words ?? []).filter(
        (w): w is WordItem => Boolean(w && typeof w.word === 'string' && w.word.trim())
      ),
    [activeClass?.words]
  );
  const quizzes: QuizItem[] = useMemo(() => {
    if (!activeClass) return [];
    if (activeClass.quizzes && activeClass.quizzes.length > 0) {
      return activeClass.quizzes;
    }
    return createStarterQuizzesFromWords(words);
  }, [activeClass, words]);

  const [wordIndex, setWordIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);

  // Reset indices when class or mode changes
  useEffect(() => {
    setWordIndex(0);
    setQuizIndex(0);
  }, [activeClass?.id, gameMode]);

  const currentWord = words[wordIndex] ?? words[0];
  const currentQuiz = quizzes[quizIndex] ?? quizzes[0];

  const [phase, setPhase] = useState<PlayPhase>('drawing');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [collectedSlots, setCollectedSlots] = useState<(string | null)[]>([]);
  const [collectedAnswer, setCollectedAnswer] = useState<{
    text: string;
    imageDataUrl?: string;
  } | null>(null);
  const [flyingLetters, setFlyingLetters] = useState<FlyingLetter[]>([]);
  const [pathNodeIds, setPathNodeIds] = useState<string[]>([]);
  const [hasStroke, setHasStroke] = useState(false);
  const [dockOrbs, setDockOrbs] = useState<Partial<Record<DockOrbKey, string>>>({});
  const [replayOrbUrl, setReplayOrbUrl] = useState<string | null>(null);
  const [isUpdatingBg, setIsUpdatingBg] = useState(false);

  // Canvas & DOM measurement refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Mutable animation & interaction state kept in refs for smooth 60fps canvas loop
  const sizeRef = useRef<{ w: number; h: number }>({ w: 900, h: 460 });
  const nodesRef = useRef<LetterNode[]>([]);
  const quizNodesRef = useRef<QuizNode[]>([]);
  const pathIdsRef = useRef<string[]>([]);
  const drawnPointsRef = useRef<Point[]>([]);
  const undoStackRef = useRef<{ pointsLen: number; visitedIds: string[] }[]>([]);
  const phaseRef = useRef<PlayPhase>('drawing');
  const isDrawingRef = useRef(false);
  const pointerPosRef = useRef<Point | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);

  // Driving animation state
  const carStateRef = useRef({
    x: 90,
    y: 250,
    angle: 0,
    wheelSpin: 0,
    wobbleTime: 0,
    waypoints: [] as Point[],
    segmentIndex: 0,
    segmentProgress: 0,
    expectedCharIndex: 0,
    finishingDrive: false,
  });

  const confettiRef = useRef<ConfettiPiece[]>([]);
  const smokeRef = useRef<SmokePuff[]>([]);
  const explosionRef = useRef<ExplosionParticle[]>([]);
  const isBoomRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const flyingRef = useRef<FlyingLetter[]>([]);
  const carSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const customCarSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const customBoomCarSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const carSettingsRef = useRef<CarSettings | undefined>(carSettings);
  const carBoomSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const finishSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const quizImgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    carSettingsRef.current = carSettings;
  }, [carSettings]);

  // Load custom playground background or default cartoon grass field background
  useEffect(() => {
    let cancelled = false;
    const loadSrc = (src: string, fallbackOnErr: boolean) => {
      const bg = new Image();
      bg.onload = () => {
        if (!cancelled) {
          bgImageRef.current = bg;
        }
      };
      bg.onerror = () => {
        if (cancelled) return;
        if (fallbackOnErr && src !== PLAYGROUND_BG_SRC) {
          loadSrc(PLAYGROUND_BG_SRC, false);
        } else {
          bgImageRef.current = null;
        }
      };
      bg.src = src;
    };

    loadSrc(playgroundBgDataUrl || PLAYGROUND_BG_SRC, Boolean(playgroundBgDataUrl));
    return () => {
      cancelled = true;
    };
  }, [playgroundBgDataUrl]);

  const handleBgFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onUpdatePlaygroundBg) return;
      setIsUpdatingBg(true);
      try {
        const raw = await fileToDataUrl(file);
        const compressed = await resizeBackgroundDataUrl(raw, 1600);
        onUpdatePlaygroundBg(compressed);
      } catch {
        setFeedbackMsg('Could not load that background image.');
        window.setTimeout(() => {
          if (isMountedRef.current) setFeedbackMsg(null);
        }, 2000);
      } finally {
        setIsUpdatingBg(false);
        if (bgFileInputRef.current) bgFileInputRef.current.value = '';
      }
    },
    [onUpdatePlaygroundBg]
  );

  // Load normal Capybara car, soot-covered explosion car & FINISH sign sprites once
  useEffect(() => {
    const cancelNormal = loadCutoutCarSprite(CAPYBARA_CAR_SRC, 145, 26, (sprite) => {
      carSpriteRef.current = sprite;
    });
    const cancelBoom = loadCutoutCarSprite(CAPYBARA_BOOM_SRC, 192, 18, (sprite) => {
      carBoomSpriteRef.current = sprite;
    });
    const cancelFinish = loadCutoutCarSprite(FINISH_SIGN_SRC, 232, 22, (sprite) => {
      finishSpriteRef.current = sprite;
    });
    return () => {
      cancelNormal();
      cancelBoom();
      cancelFinish();
    };
  }, []);

  // Load user-uploaded custom car sprite (already background-removed & cropped) into offscreen canvas
  useEffect(() => {
    const customUrl = carSettings?.customCarDataUrl;
    if (!customUrl) {
      customCarSpriteRef.current = null;
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        customCarSpriteRef.current = null;
        return;
      }
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(img, 0, 0, w, h);
        customCarSpriteRef.current = offscreen;
      } else {
        customCarSpriteRef.current = null;
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        customCarSpriteRef.current = null;
      }
    };
    img.src = customUrl;
    return () => {
      cancelled = true;
    };
  }, [carSettings?.customCarDataUrl]);

  // Load user-uploaded custom wrong-answer ("boom") car sprite into offscreen canvas
  useEffect(() => {
    const customBoomUrl = carSettings?.customBoomCarDataUrl;
    if (!customBoomUrl) {
      customBoomCarSpriteRef.current = null;
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        customBoomCarSpriteRef.current = null;
        return;
      }
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(img, 0, 0, w, h);
        customBoomCarSpriteRef.current = offscreen;
      } else {
        customBoomCarSpriteRef.current = null;
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        customBoomCarSpriteRef.current = null;
      }
    };
    img.src = customBoomUrl;
    return () => {
      cancelled = true;
    };
  }, [carSettings?.customBoomCarDataUrl]);

  // Load glossy dock orb buttons (Undo, Clear, GO!) once
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      try {
        setDockOrbs(extractDockOrbs(img));
      } catch {
        // Fallback cleanly to vector buttons
      }
    };
    img.onerror = () => {
      if (!cancelled) setDockOrbs({});
    };
    img.src = DOCK_ORB_SPRITE_SRC;
    return () => {
      cancelled = true;
    };
  }, []);

  // Load glossy red Replay orb from Game_cover_art_fbe69390_809f3132.jpg once
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      try {
        const extracted = extractOrbSprites(img, [
          { key: 'replay', x0: 0.505, y0: 0.50, x1: 0.84, y1: 0.97 },
        ]);
        if (extracted.replay) {
          setReplayOrbUrl(extracted.replay);
        }
      } catch {
        // Fallback cleanly to vector orb
      }
    };
    img.onerror = () => {
      if (!cancelled) setReplayOrbUrl(null);
    };
    img.src = VICTORY_ORB_SPRITE_SRC;
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep refs synced with React state
  useEffect(() => {
    pathIdsRef.current = pathNodeIds;
    onPathPresenceChange((hasStroke || pathNodeIds.length > 0) && phase === 'drawing');
  }, [pathNodeIds, hasStroke, phase, onPathPresenceChange]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const initActiveLevel = useCallback(
    (forceNewScatter = true) => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      soundEngine.stopEngine();

      const { w, h } = sizeRef.current;
      const startPos = getStartPos(w, h);

      if (isQuizMode) {
        if (!currentQuiz) return;
        if (forceNewScatter || quizNodesRef.current.length === 0) {
          quizNodesRef.current = generateScatteredQuizNodes(currentQuiz, w, h);
        } else {
          quizNodesRef.current = quizNodesRef.current.map((n) => ({ ...n, collected: false }));
        }
        nodesRef.current = [];
        setCollectedSlots([]);
        setCollectedAnswer(null);
      } else {
        if (!currentWord) return;
        if (forceNewScatter || nodesRef.current.length === 0) {
          nodesRef.current = generateScatteredNodes(currentWord.word, w, h);
        } else {
          nodesRef.current = nodesRef.current.map((n) => ({ ...n, collected: false }));
        }
        quizNodesRef.current = [];
        setCollectedSlots(new Array(currentWord.word.length).fill(null));
        setCollectedAnswer(null);
      }

      pathIdsRef.current = [];
      drawnPointsRef.current = [];
      undoStackRef.current = [];
      setPathNodeIds([]);
      setHasStroke(false);
      setPhase('drawing');
      phaseRef.current = 'drawing';
      setFeedbackMsg(null);
      flyingRef.current = [];
      setFlyingLetters([]);
      confettiRef.current = [];
      smokeRef.current = [];
      explosionRef.current = [];
      isBoomRef.current = false;
      isDrawingRef.current = false;
      pointerPosRef.current = null;

      carStateRef.current = {
        x: startPos.x,
        y: startPos.y,
        angle: 0,
        wheelSpin: 0,
        wobbleTime: 0,
        waypoints: [],
        segmentIndex: 0,
        segmentProgress: 0,
        expectedCharIndex: 0,
        finishingDrive: false,
      };
    },
    [isQuizMode, currentWord, currentQuiz]
  );

  // Reinitialize whenever level or mode changes
  useEffect(() => {
    initActiveLevel(true);
    if (isQuizMode && currentQuiz) {
      if ((currentQuiz.correctAnswer ?? '').trim()) {
        preloadWordAudio(currentQuiz.correctAnswer);
      }
      const urls = [
        currentQuiz.correctAnswerImage,
        ...(currentQuiz.wrongAnswerImages ?? []),
      ].filter((u): u is string => Boolean(u));
      for (const url of urls) {
        if (!quizImgCacheRef.current.has(url)) {
          const img = new Image();
          img.referrerPolicy = 'no-referrer';
          img.onerror = () => {
            quizImgCacheRef.current.delete(url);
          };
          img.src = url;
          quizImgCacheRef.current.set(url, img);
        }
      }
    } else if (currentWord?.word) {
      preloadWordAudio(currentWord.word);
    }
  }, [isQuizMode, currentWord?.id, currentWord?.word, currentQuiz?.id, currentQuiz?.question, initActiveLevel]);

  // Handle TopBar Reset Path trigger
  useEffect(() => {
    if (resetSignal > 0 && (isQuizMode ? currentQuiz : currentWord)) {
      soundEngine.playUndo();
      initActiveLevel(false);
    }
  }, [resetSignal, isQuizMode, currentWord, currentQuiz, initActiveLevel]);

  // Cleanup timers & engine hum on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      soundEngine.stopEngine();
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  // ResizeObserver for crisp high-DPI responsive canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafResize = 0;
    const updateSize = () => {
      try {
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const w = Math.max(320, Math.floor(rect.width));
        const h = Math.max(240, Math.floor(rect.height));
        const prev = sizeRef.current;
        sizeRef.current = { w, h };

        const canvas = canvasRef.current;
        if (canvas) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const targetW = Math.floor(w * dpr);
          const targetH = Math.floor(h * dpr);
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }
        }

        // If canvas size changed meaningfully while idle in drawing mode, keep nodes cleanly inside bounds
        if (
          phaseRef.current === 'drawing' &&
          (Math.abs(prev.w - w) > 20 || Math.abs(prev.h - h) > 20)
        ) {
          if (isQuizMode && currentQuiz) {
            if (pathIdsRef.current.length === 0) {
              quizNodesRef.current = generateScatteredQuizNodes(currentQuiz, w, h);
            } else {
              const scaleX = w / Math.max(1, prev.w);
              const scaleY = h / Math.max(1, prev.h);
              quizNodesRef.current = quizNodesRef.current.map((n) => ({
                ...n,
                x: Math.max(n.width / 2 + 16, Math.min(w - n.width / 2 - 16, n.x * scaleX)),
                y: Math.max(n.height / 2 + 20, Math.min(h - 110 - n.height / 2, n.y * scaleY)),
              }));
            }
          } else if (!isQuizMode && currentWord) {
            if (pathIdsRef.current.length === 0) {
              nodesRef.current = generateScatteredNodes(currentWord.word, w, h);
            } else {
              const scaleX = w / Math.max(1, prev.w);
              const scaleY = h / Math.max(1, prev.h);
              nodesRef.current = nodesRef.current.map((n) => ({
                ...n,
                x: Math.max(n.radius + 20, Math.min(w - n.radius - 20, n.x * scaleX)),
                y: Math.max(n.radius + 20, Math.min(h - 114 - n.radius, n.y * scaleY)),
              }));
            }
          }
          const startPos = getStartPos(w, h);
          carStateRef.current.x = startPos.x;
          carStateRef.current.y = startPos.y;
        }
      } catch {
        // Ignore transient resize measurement errors
      }
    };

    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        cancelAnimationFrame(rafResize);
        rafResize = requestAnimationFrame(updateSize);
      });
      observer.observe(container);
      return () => {
        cancelAnimationFrame(rafResize);
        observer.disconnect();
      };
    }

    const handleResize = () => {
      cancelAnimationFrame(rafResize);
      rafResize = requestAnimationFrame(updateSize);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(rafResize);
      window.removeEventListener('resize', handleResize);
    };
  }, [isQuizMode, currentWord, currentQuiz]);

  // Flying letter animation tick (updates flyingLetters progress and populates slot on arrival)
  const hasFlyingLetters = flyingLetters.length > 0;
  useEffect(() => {
    if (!hasFlyingLetters) return;

    let rafId = 0;
    const step = () => {
      try {
        const now = performance.now();
        const landedBatch: { index: number; char: string }[] = [];
        const remaining: FlyingLetter[] = [];

        for (const fl of flyingRef.current) {
          if (now - fl.startTime >= fl.duration) {
            landedBatch.push({ index: fl.targetSlotIndex, char: fl.char });
          } else {
            remaining.push(fl);
          }
        }

        flyingRef.current = remaining;
        setFlyingLetters([...remaining]);

        if (landedBatch.length > 0) {
          setCollectedSlots((prevSlots) => {
            const next = [...prevSlots];
            for (const item of landedBatch) {
              if (item.index >= 0 && item.index < next.length) {
                next[item.index] = item.char;
              }
            }
            return next;
          });
        }

        if (remaining.length > 0) {
          rafId = requestAnimationFrame(step);
        }
      } catch {
        flyingRef.current = [];
        setFlyingLetters([]);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [hasFlyingLetters]);

  const spawnFlyingLetter = useCallback(
    (node: LetterNode, slotIndex: number) => {
      try {
        const canvas = canvasRef.current;
        const slotEl = slotRefs.current[slotIndex];
        if (!canvas || !slotEl) {
          setCollectedSlots((prev) => {
            const next = [...prev];
            if (slotIndex >= 0 && slotIndex < next.length) {
              next[slotIndex] = node.char;
            }
            return next;
          });
          return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const slotRect = slotEl.getBoundingClientRect();

        const fl: FlyingLetter = {
          id: `fly-${node.id}-${performance.now()}`,
          char: node.char,
          targetSlotIndex: slotIndex,
          startX: canvasRect.left + node.x,
          startY: canvasRect.top + node.y,
          endX: slotRect.left + slotRect.width / 2,
          endY: slotRect.top + slotRect.height / 2,
          fillColor: node.fillColor,
          rimColor: node.rimColor,
          startTime: performance.now(),
          duration: 380,
        };

        flyingRef.current = [...flyingRef.current, fl];
        setFlyingLetters([...flyingRef.current]);
      } catch {
        setCollectedSlots((prev) => {
          const next = [...prev];
          if (slotIndex >= 0 && slotIndex < next.length) {
            next[slotIndex] = node.char;
          }
          return next;
        });
      }
    },
    []
  );

  const triggerConfetti = useCallback((originX: number, originY: number) => {
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 340;
      pieces.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 180,
        size: 6 + Math.random() * 7,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 10,
      });
    }
    confettiRef.current = pieces;
  }, []);

  const triggerBumpFail = useCallback(
    (message: string, isWrongLetter = false) => {
      soundEngine.stopEngine();
      isBoomRef.current = isWrongLetter;
      if (isWrongLetter) {
        soundEngine.playBoom();
        const cx = carStateRef.current.x;
        const cy = carStateRef.current.y;
        const fireColors = ['#f97316', '#ef4444', '#facc15', '#4b5563', '#1f2937'];
        const particles: ExplosionParticle[] = [];
        for (let i = 0; i < 36; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 65 + Math.random() * 220;
          particles.push({
            x: cx + (Math.random() - 0.5) * 28,
            y: cy + (Math.random() - 0.5) * 22,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 55,
            r: 8 + Math.random() * 18,
            color: fireColors[i % fireColors.length],
            alpha: 0.95,
            decay: 0.95 + Math.random() * 0.75,
          });
        }
        explosionRef.current = particles;
      } else {
        soundEngine.playBump();
        explosionRef.current = [];
      }

      phaseRef.current = 'bumping';
      setPhase('bumping');
      setFeedbackMsg(message);
      carStateRef.current.wobbleTime = performance.now();

      resetTimerRef.current = window.setTimeout(
        () => {
          if (isMountedRef.current) {
            initActiveLevel(false);
          }
        },
        isWrongLetter ? 1850 : 1150
      );
    },
    [initActiveLevel]
  );

  // Main 60fps HTML5 Canvas render + driving physics loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const drawCartoonCar = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      angle: number,
      wheelSpin: number,
      wobbleOffset: number,
      now: number
    ) => {
      const isBoom = phaseRef.current === 'bumping' && isBoomRef.current;
      const usingCustomBoom = Boolean(isBoom && customBoomCarSpriteRef.current);
      const activeDefaultBoom = Boolean(
        isBoom && !usingCustomBoom && carBoomSpriteRef.current
      );
      const usingCustomNormal = Boolean(!isBoom && customCarSpriteRef.current);
      const sprite = usingCustomBoom
        ? customBoomCarSpriteRef.current
        : activeDefaultBoom
          ? carBoomSpriteRef.current
          : customCarSpriteRef.current || carSpriteRef.current;

      const rawScale = isBoom
        ? (carSettingsRef.current?.boomScale ?? 1)
        : (carSettingsRef.current?.scale ?? 1);
      const carScale = Number.isFinite(rawScale) ? Math.max(0.5, Math.min(1.8, rawScale)) : 1;
      const customFlipX = Boolean(carSettingsRef.current?.flipX);
      const customBoomFlipX = Boolean(carSettingsRef.current?.boomFlipX);
      const bounceY = phaseRef.current === 'driving' ? Math.sin(wheelSpin * 1.4) * 2.2 : 0;

      ctx.save();
      ctx.translate(x + wobbleOffset, y + bounceY);

      // Soft ground shadow underneath car (scaled with car size)
      ctx.fillStyle = isBoom ? 'rgba(15, 23, 42, 0.34)' : 'rgba(15, 23, 42, 0.2)';
      ctx.beginPath();
      ctx.ellipse(
        0,
        48 * carScale - bounceY * 0.5,
        (isBoom ? 92 : 76) * carScale,
        18 * carScale,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      if (sprite && sprite.width > 0 && sprite.height > 0) {
        const facingLeft = Math.cos(angle) < -0.05;
        // Normal sprite faces RIGHT; default Boom sprite faces LEFT; custom sprites support flipX toggle
        const shouldFlip = activeDefaultBoom
          ? !facingLeft
          : usingCustomBoom
            ? customBoomFlipX
              ? !facingLeft
              : facingLeft
            : usingCustomNormal && customFlipX
              ? !facingLeft
              : facingLeft;
        const normalizedAngle = facingLeft
          ? Math.atan2(Math.sin(angle), -Math.cos(angle))
          : angle;
        const clampedTilt = Math.max(-0.42, Math.min(0.42, normalizedAngle * 0.55));

        if (shouldFlip) {
          ctx.scale(-1, 1);
        }
        ctx.rotate(isBoom ? clampedTilt * 0.35 : clampedTilt);

        let targetW: number;
        let targetH: number;
        if (activeDefaultBoom) {
          targetW = 250 * carScale;
          targetH = (sprite.height / Math.max(1, sprite.width)) * targetW;
        } else if (usingCustomBoom) {
          const baseW = 220 * carScale;
          const rawH = (sprite.height / Math.max(1, sprite.width)) * baseW;
          const maxH = 185 * carScale;
          const fit = rawH > maxH ? maxH / rawH : 1;
          targetW = baseW * fit;
          targetH = rawH * fit;
        } else {
          const baseW = 196 * carScale;
          const rawH = (sprite.height / Math.max(1, sprite.width)) * baseW;
          const maxH = 165 * carScale;
          const fit = rawH > maxH ? maxH / rawH : 1;
          targetW = baseW * fit;
          targetH = rawH * fit;
        }

        ctx.drawImage(
          sprite,
          -targetW / 2,
          -targetH / 2 - (isBoom ? 20 : 8) * carScale,
          targetW,
          targetH
        );
        ctx.restore();

        // Comic "BOOM!" callout above exploding car during first 0.9s
        if (isBoom) {
          const elapsed = (now - carStateRef.current.wobbleTime) / 1000;
          if (elapsed < 0.95) {
            const popScale = Math.min(1.12, 0.55 + elapsed * 3.8) * (1 - Math.max(0, elapsed - 0.6) * 1.2);
            if (popScale > 0.05) {
              ctx.save();
              ctx.translate(x, y - 92 * carScale - elapsed * 18);
              ctx.scale(popScale, popScale);
              ctx.rotate(-0.08);
              ctx.font = '800 32px Fredoka, Nunito, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.lineJoin = 'round';
              ctx.lineWidth = 7;
              ctx.strokeStyle = '#7f1d1d';
              ctx.strokeText('BOOM!', 0, 0);
              ctx.fillStyle = '#fde047';
              ctx.fillText('BOOM!', 0, 0);
              ctx.restore();
            }
          }
        }
        return;
      }

      // Fallback silhouette while sprite loads
      ctx.rotate(angle);
      ctx.scale(carScale, carScale);
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 3;
      drawRoundedRectPath(ctx, -34, -20, 68, 40, 16);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    const drawScenery = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const bgImg = bgImageRef.current;
      if (bgImg && bgImg.naturalWidth > 0 && bgImg.naturalHeight > 0) {
        // Cover-fit the cartoon grass field while preserving aspect ratio
        const scale = Math.max(w / bgImg.naturalWidth, h / bgImg.naturalHeight);
        const drawW = bgImg.naturalWidth * scale;
        const drawH = bgImg.naturalHeight * scale;
        const dx = (w - drawW) / 2;
        // Anchor slightly lower so both sky/clouds and meadow field are nicely framed
        const dy = (h - drawH) * 0.62;
        ctx.drawImage(bgImg, dx, dy, drawW, drawH);
        return;
      }

      // Soft meadow gradient fallback while background image loads
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#ecfdf5');
      grad.addColorStop(0.55, '#dcfce7');
      grad.addColorStop(1, '#bbf7d0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Gentle pastel rolling hills in background
      ctx.fillStyle = 'rgba(134, 239, 172, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.35);
      ctx.quadraticCurveTo(w * 0.25, h * 0.18, w * 0.55, h * 0.32);
      ctx.quadraticCurveTo(w * 0.82, h * 0.44, w, h * 0.26);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
    };

    const drawStartPad = (ctx: CanvasRenderingContext2D, pos: Point) => {
      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Outer asphalt circle
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner dashed ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // START label below pad with crisp pill backdrop for legibility
      ctx.font = '700 15px Fredoka, Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.strokeText('START', 0, 56);
      ctx.fillStyle = '#0369a1';
      ctx.fillText('START', 0, 56);
      ctx.restore();
    };

    const drawFinishBanner = (
      ctx: CanvasRenderingContext2D,
      pos: Point,
      canvasHeight: number,
      won: boolean,
      now: number
    ) => {
      ctx.save();
      ctx.translate(pos.x, pos.y);

      const finishSprite = finishSpriteRef.current;
      if (finishSprite && finishSprite.width > 0 && finishSprite.height > 0) {
        const drawH = Math.min(168, Math.max(112, canvasHeight * 0.37));
        const drawW = drawH * (finishSprite.width / Math.max(1, finishSprite.height));
        const bounce = won ? 1 + Math.sin(now * 0.008) * 0.045 : 1;

        // Soft grass shadow under the sign post
        ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
        ctx.beginPath();
        ctx.ellipse(0, drawH * 0.42, drawW * 0.26, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.scale(bounce, bounce);
        if (won) {
          ctx.shadowColor = 'rgba(250, 204, 21, 0.85)';
          ctx.shadowBlur = 22;
        }
        ctx.drawImage(finishSprite, -drawW / 2, -drawH / 2 - 4, drawW, drawH);
        ctx.restore();
        return;
      }

      // Vector fallback while Finish sign image loads
      const cols = 4;
      const rows = 2;
      const cell = 14;
      const startX = -(cols * cell) / 2;
      const startY = -(rows * cell) / 2;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3.5;
      drawRoundedRectPath(ctx, startX - 7, startY - 7, cols * cell + 14, rows * cell + 14, 12);
      ctx.fill();
      ctx.stroke();

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#1e293b' : '#f8fafc';
          ctx.fillRect(startX + c * cell, startY + r * cell, cell, cell);
        }
      }

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, startY - 7);
      ctx.lineTo(0, startY - 42);
      ctx.stroke();

      ctx.fillStyle = won ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(0, startY - 42);
      ctx.lineTo(30, startY - 32);
      ctx.lineTo(0, startY - 22);
      ctx.closePath();
      ctx.fill();

      ctx.font = '700 15px Fredoka, Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.strokeText('FINISH', 0, startY + rows * cell + 12);
      ctx.fillStyle = won ? '#047857' : '#b45309';
      ctx.fillText('FINISH', 0, startY + rows * cell + 12);
      ctx.restore();
    };

    const drawPath = (ctx: CanvasRenderingContext2D, now: number) => {
      const pts = drawnPointsRef.current;
      if (pts.length < 2) return;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const traceSmoothCurve = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        if (pts.length === 2) {
          ctx.lineTo(pts[1].x, pts[1].y);
        } else {
          for (let i = 1; i < pts.length - 1; i++) {
            const midX = (pts[i].x + pts[i + 1].x) / 2;
            const midY = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
          }
          const last = pts[pts.length - 1];
          ctx.lineTo(last.x, last.y);
        }
      };

      // Layer 1: Wide soft neon lime bloom
      traceSmoothCurve();
      ctx.shadowColor = '#a3e635';
      ctx.shadowBlur = 26;
      ctx.strokeStyle = 'rgba(163, 230, 53, 0.55)';
      ctx.lineWidth = 22;
      ctx.stroke();

      // Layer 2: Rich chartreuse-lime neon tube body
      traceSmoothCurve();
      ctx.shadowColor = '#84cc16';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#9ae615';
      ctx.lineWidth = 13;
      ctx.stroke();

      // Layer 3: Bright yellow-lime inner glow
      traceSmoothCurve();
      ctx.shadowColor = '#d9f99d';
      ctx.shadowBlur = 9;
      ctx.strokeStyle = '#d9f99d';
      ctx.lineWidth = 7.5;
      ctx.stroke();

      // Layer 4: Crisp white-yellow neon core
      traceSmoothCurve();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.strokeStyle = '#fefce8';
      ctx.lineWidth = 3.2;
      ctx.stroke();

      // Glowing neon pen tip indicator at end of freehand stroke when drawing is paused
      if (phaseRef.current === 'drawing' && !isDrawingRef.current) {
        const tip = pts[pts.length - 1];
        const pulse = 1 + Math.sin(now * 0.007) * 0.16;
        ctx.shadowColor = '#a3e635';
        ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(163, 230, 53, 0.42)';
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 13 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 6;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawNodes = (ctx: CanvasRenderingContext2D, now: number) => {
      const connectedIds = pathIdsRef.current;
      const lastConnectedId = connectedIds[connectedIds.length - 1];

      if (isQuizMode) {
        for (const qNode of quizNodesRef.current) {
          const isConnected = connectedIds.includes(qNode.id);
          const isHovered = hoveredNodeIdRef.current === qNode.id;
          const pulseScale =
            ((isConnected && phaseRef.current === 'drawing') || isHovered) && !qNode.collected
              ? 1 + Math.sin(now * 0.008) * 0.05
              : 1;
          drawQuizAnswerBubbleOnCanvas(
            ctx,
            qNode,
            isConnected,
            (isConnected && phaseRef.current === 'drawing') || isHovered,
            pulseScale,
            quizImgCacheRef.current
          );
        }
        return;
      }

      const nodes = nodesRef.current;
      for (const node of nodes) {
        if (node.collected) {
          // Cute subtle star crater where the letter jumped from
          ctx.save();
          ctx.translate(node.x, node.y);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(0, 0, node.radius * 0.72, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          continue;
        }

        const stepIdx = connectedIds.indexOf(node.id);
        const isConnected = stepIdx !== -1;
        const isHovered = hoveredNodeIdRef.current === node.id;
        const isLast = lastConnectedId === node.id;
        const pulseScale =
          (isLast && phaseRef.current === 'drawing') || isHovered
            ? 1 + Math.sin(now * 0.008) * 0.07
            : 1;

        drawCartoonLetterBlockOnCanvas(ctx, node.x, node.y, node.radius * 1.95, node.char, {
          isConnected,
          stepNumber: isConnected ? stepIdx + 1 : undefined,
          isHighlighted: (isLast && phaseRef.current === 'drawing') || isHovered,
          pulseScale,
        });
      }
    };

    const tick = (now: number) => {
      try {
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const { w, h } = sizeRef.current;
      const startPos = getStartPos(w, h);
      const finishPos = getFinishPos(w, h);

      // Update driving physics along exact freehand curve
      const car = carStateRef.current;
      const hasActiveLevel = isQuizMode ? Boolean(currentQuiz) : Boolean(currentWord);
      if (phaseRef.current === 'driving' && hasActiveLevel) {
        const speed = 260; // px per second
        const wp = car.waypoints;
        let remainingDist = speed * dt;
        car.wheelSpin += dt * 16;

        // Emit cute pastel smoke puffs occasionally
        if (Math.random() < 0.25) {
          smokeRef.current.push({
            x: car.x - Math.cos(car.angle) * 36,
            y: car.y - Math.sin(car.angle) * 36,
            r: 5 + Math.random() * 4,
            alpha: 0.65,
          });
        }

        while (remainingDist > 0 && car.segmentIndex < wp.length - 1) {
          const from = wp[car.segmentIndex];
          const to = wp[car.segmentIndex + 1];
          if (!from || !to) break;
          const segLen = dist(from, to);

          if (segLen < 0.001) {
            car.segmentIndex += 1;
            car.segmentProgress = 0;
            continue;
          }

          const subFrom: Point = { x: car.x, y: car.y };
          const distLeftInSeg = (1 - car.segmentProgress) * segLen;

          if (remainingDist >= distLeftInSeg) {
            remainingDist -= distLeftInSeg;
            car.x = to.x;
            car.y = to.y;
            car.segmentIndex += 1;
            car.segmentProgress = 0;
          } else {
            car.segmentProgress += remainingDist / segLen;
            remainingDist = 0;
            car.x = from.x + (to.x - from.x) * car.segmentProgress;
            car.y = from.y + (to.y - from.y) * car.segmentProgress;
          }

          // Smooth steering angle toward lookahead point on the freehand path
          const lookIdx = Math.min(wp.length - 1, car.segmentIndex + 2);
          const lookPt = wp[lookIdx];
          if (dist(subFrom, lookPt) > 1) {
            const targetAngle = Math.atan2(lookPt.y - subFrom.y, lookPt.x - subFrom.x);
            car.angle = lerpAngle(car.angle, targetAngle, Math.min(1, dt * 15 + 0.18));
          }

          const subTo: Point = { x: car.x, y: car.y };

          // Check node collision along this exact driven freehand sub-segment
          if (!car.finishingDrive) {
            if (isQuizMode && currentQuiz) {
              const midPt: Point = {
                x: (subFrom.x + subTo.x) / 2,
                y: (subFrom.y + subTo.y) / 2,
              };
              let hitQuizNode: QuizNode | null = null;
              let bestDist = Infinity;
              for (const qNode of quizNodesRef.current) {
                if (qNode.collected) continue;
                const d = Math.min(
                  distToQuizNode(subTo, qNode),
                  distToQuizNode(midPt, qNode)
                );
                if (d <= 14 && d < bestDist) {
                  bestDist = d;
                  hitQuizNode = qNode;
                }
              }

              if (hitQuizNode) {
                if (hitQuizNode.isCorrect) {
                  hitQuizNode.collected = true;
                  soundEngine.playCollect(0);
                  setCollectedAnswer({
                    text: hitQuizNode.text,
                    imageDataUrl: hitQuizNode.imageDataUrl,
                  });
                  triggerConfetti(hitQuizNode.x, hitQuizNode.y);
                  car.finishingDrive = true;
                  car.waypoints = [
                    { x: car.x, y: car.y },
                    { x: finishPos.x, y: finishPos.y },
                  ];
                  car.segmentIndex = 0;
                  car.segmentProgress = 0;
                  break;
                } else {
                  // Wrong quiz answer -> BOOM explosion!
                  const failLabel = hitQuizNode.text.trim()
                    ? `BOOM! "${hitQuizNode.text}" is wrong!`
                    : 'BOOM! Wrong picture! Try another one!';
                  triggerBumpFail(failLabel, true);
                  break;
                }
              }
            } else if (!isQuizMode && currentWord) {
              let hitNode: LetterNode | null = null;
              let bestDist = Infinity;
              for (const node of nodesRef.current) {
                if (node.collected) continue;
                const d = distToSegment(node, subFrom, subTo);
                if (d <= node.radius + 14 && d < bestDist) {
                  bestDist = d;
                  hitNode = node;
                }
              }

              if (hitNode) {
                const expectedChar = currentWord.word[car.expectedCharIndex];
                if (!expectedChar) break;
                if (hitNode.char === expectedChar) {
                  hitNode.collected = true;
                  soundEngine.playCollect(car.expectedCharIndex);
                  spawnFlyingLetter(hitNode, car.expectedCharIndex);
                  car.expectedCharIndex += 1;

                  if (car.expectedCharIndex >= currentWord.word.length) {
                    // All letters collected -> zoom to FINISH!
                    car.finishingDrive = true;
                    car.waypoints = [
                      { x: car.x, y: car.y },
                      { x: finishPos.x, y: finishPos.y },
                    ];
                    car.segmentIndex = 0;
                    car.segmentProgress = 0;
                    break;
                  }
                } else {
                  // Wrong letter order -> BOOM explosion!
                  triggerBumpFail(`BOOM! Look for "${expectedChar}" next!`, true);
                  break;
                }
              }
            }
          }
        }

        // Check end of path states
        if (phaseRef.current === 'driving' && car.segmentIndex >= car.waypoints.length - 1) {
          if (car.finishingDrive) {
            soundEngine.stopEngine();
            soundEngine.playVictory();
            phaseRef.current = 'won';
            setPhase('won');
            triggerConfetti(finishPos.x, finishPos.y);
            if (isQuizMode && currentQuiz) {
              if ((currentQuiz.correctAnswer ?? '').trim()) {
                speakWord(currentQuiz.correctAnswer);
              }
            } else if (currentWord) {
              speakWord(currentWord.word);
            }
          } else if (isQuizMode) {
            triggerBumpFail('Almost! Drive your car through an answer!');
          } else if (currentWord && car.expectedCharIndex < currentWord.word.length) {
            triggerBumpFail(`Almost! Connect all ${currentWord.word.length} letters!`);
          }
        }
      }

      // Update smoke puffs
      if (smokeRef.current.length > 0) {
        smokeRef.current = smokeRef.current
          .map((s) => ({ ...s, r: s.r + dt * 10, alpha: s.alpha - dt * 1.4 }))
          .filter((s) => s.alpha > 0.02);
      }

      // Update confetti
      if (confettiRef.current.length > 0) {
        confettiRef.current = confettiRef.current
          .map((c) => ({
            ...c,
            x: c.x + c.vx * dt,
            y: c.y + c.vy * dt,
            vy: c.vy + 460 * dt,
            rot: c.rot + c.vRot * dt,
          }))
          .filter((c) => c.y < h + 40);
      }

      // Update explosion fire & smoke particles
      if (explosionRef.current.length > 0) {
        explosionRef.current = explosionRef.current
          .map((p) => ({
            ...p,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            vx: p.vx * 0.96,
            vy: p.vy * 0.96 - 18 * dt,
            r: p.r + dt * 16,
            alpha: p.alpha - p.decay * dt,
          }))
          .filter((p) => p.alpha > 0.03);
      }

      // Render Canvas
      if (canvas && ctx) {
        const dpr = canvas.width / Math.max(1, w);
        ctx.save();
        ctx.scale(dpr, dpr);

        // Brief screen shake on wrong-letter explosion
        if (phaseRef.current === 'bumping' && isBoomRef.current) {
          const elapsed = (now - car.wobbleTime) / 1000;
          if (elapsed < 0.45) {
            const amp = (1 - elapsed / 0.45) * 8;
            ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
          }
        }

        drawScenery(ctx, w, h);
        drawStartPad(ctx, startPos);
        drawFinishBanner(ctx, finishPos, h, phaseRef.current === 'won', now);
        drawPath(ctx, now);
        drawNodes(ctx, now);

        // Smoke puffs
        for (const s of smokeRef.current) {
          ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Cute wobble on bump
        let wobbleOffset = 0;
        if (phaseRef.current === 'bumping') {
          const elapsed = (now - car.wobbleTime) / 1000;
          wobbleOffset = Math.sin(elapsed * 38) * Math.max(0, 1 - elapsed * 1.1) * (isBoomRef.current ? 11 : 9);
        }

        drawCartoonCar(ctx, car.x, car.y, car.angle, car.wheelSpin, wobbleOffset, now);

        // Explosion fire/smoke burst particles around the car
        for (const p of explosionRef.current) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Confetti layer
        for (const c of confettiRef.current) {
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rot);
          ctx.fillStyle = c.color;
          ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size * 0.6);
          ctx.restore();
        }

        ctx.restore();
      }
      } catch {
        // Keep animation loop alive across transient frame errors
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    isQuizMode,
    currentWord,
    currentQuiz,
    spawnFlyingLetter,
    triggerBumpFail,
    triggerConfetti,
  ]);

  // Pointer helpers for Canvas interaction (mouse + touch + interactive board)
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const target = e.currentTarget;
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const findHoveredNodeId = (pt: Point): string | null => {
    if (isQuizMode) {
      for (const qNode of quizNodesRef.current) {
        if (qNode.collected) continue;
        if (distToQuizNode(pt, qNode) <= 10) {
          return qNode.id;
        }
      }
      return null;
    }
    for (const node of nodesRef.current) {
      if (node.collected) continue;
      if (dist(pt, node) <= node.radius + 14) {
        return node.id;
      }
    }
    return null;
  };

  const checkSegmentNodeHits = (from: Point, to: Point) => {
    if (isQuizMode) {
      if (pathIdsRef.current.length > 0) return;
      const mid: Point = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
      for (const qNode of quizNodesRef.current) {
        if (qNode.collected) continue;
        if (
          distToQuizNode(to, qNode) <= 10 ||
          distToQuizNode(mid, qNode) <= 10 ||
          distToQuizNode(from, qNode) <= 10
        ) {
          undoStackRef.current.push({
            pointsLen: drawnPointsRef.current.length,
            visitedIds: [...pathIdsRef.current],
          });
          const nextIds = [qNode.id];
          pathIdsRef.current = nextIds;
          setPathNodeIds(nextIds);
          soundEngine.playConnect(0);
          return;
        }
      }
      return;
    }

    for (const node of nodesRef.current) {
      if (node.collected) continue;
      if (pathIdsRef.current.includes(node.id)) continue;
      if (distToSegment(node, from, to) <= node.radius + 13) {
        // Save undo checkpoint right before entering this node so Undo Last steps back cleanly
        undoStackRef.current.push({
          pointsLen: drawnPointsRef.current.length,
          visitedIds: [...pathIdsRef.current],
        });
        const nextIds = [...pathIdsRef.current, node.id];
        pathIdsRef.current = nextIds;
        setPathNodeIds(nextIds);
        soundEngine.playConnect(nextIds.length - 1);
      }
    }
  };

  const appendSubdividedPoints = (from: Point, to: Point) => {
    const d = dist(from, to);
    const steps = Math.max(1, Math.floor(d / 12));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const interp = {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      };
      const prev = drawnPointsRef.current[drawnPointsRef.current.length - 1] ?? from;
      checkSegmentNodeHits(prev, interp);
      drawnPointsRef.current.push(interp);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'drawing') return;
    soundEngine.unlock();

    const pt = getCanvasPoint(e);
    if (!pt) return;
    const startPos = getStartPos(sizeRef.current.w, sizeRef.current.h);

    try {
      e.currentTarget?.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic pointer events without an active pointer ID
    }
    isDrawingRef.current = true;
    pointerPosRef.current = pt;

    // Save stroke-start undo checkpoint
    undoStackRef.current.push({
      pointsLen: drawnPointsRef.current.length,
      visitedIds: [...pathIdsRef.current],
    });

    if (drawnPointsRef.current.length === 0) {
      drawnPointsRef.current = [startPos];
      soundEngine.playConnect(0);
      if (dist(startPos, pt) > 8) {
        appendSubdividedPoints(startPos, pt);
      }
    } else {
      const lastPt = drawnPointsRef.current[drawnPointsRef.current.length - 1];
      if (dist(lastPt, pt) > 4) {
        appendSubdividedPoints(lastPt, pt);
      }
    }

    if (drawnPointsRef.current.length > 1) {
      setHasStroke(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (!pt) return;
    hoveredNodeIdRef.current = findHoveredNodeId(pt);

    if (phaseRef.current !== 'drawing' || !isDrawingRef.current) return;
    pointerPosRef.current = pt;

    const pts = drawnPointsRef.current;
    if (pts.length === 0) return;

    const lastPt = pts[pts.length - 1];
    if (dist(lastPt, pt) >= 6) {
      checkSegmentNodeHits(lastPt, pt);
      pts.push(pt);
      setHasStroke(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget && e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore synthetic pointer events
    }
    if (isDrawingRef.current && pointerPosRef.current && drawnPointsRef.current.length > 0) {
      const lastPt = drawnPointsRef.current[drawnPointsRef.current.length - 1];
      if (dist(lastPt, pointerPosRef.current) >= 3) {
        checkSegmentNodeHits(lastPt, pointerPosRef.current);
        drawnPointsRef.current.push(pointerPosRef.current);
        setHasStroke(true);
      }
    }
    if (drawnPointsRef.current.length < 2) {
      drawnPointsRef.current = [];
      undoStackRef.current = [];
      setHasStroke(false);
    }
    isDrawingRef.current = false;
    pointerPosRef.current = null;
  };

  const handleUndoLast = () => {
    if (phaseRef.current !== 'drawing' || drawnPointsRef.current.length === 0) return;
    soundEngine.unlock();
    soundEngine.playUndo();

    const checkpoint = undoStackRef.current.pop();
    if (checkpoint) {
      drawnPointsRef.current = drawnPointsRef.current.slice(0, checkpoint.pointsLen);
      pathIdsRef.current = checkpoint.visitedIds;
      setPathNodeIds(checkpoint.visitedIds);
      setHasStroke(drawnPointsRef.current.length > 1);
    } else {
      drawnPointsRef.current = [];
      pathIdsRef.current = [];
      setPathNodeIds([]);
      setHasStroke(false);
    }
  };

  const handleClearPath = () => {
    if (phaseRef.current !== 'drawing' || drawnPointsRef.current.length === 0) return;
    soundEngine.unlock();
    soundEngine.playUndo();
    drawnPointsRef.current = [];
    undoStackRef.current = [];
    pathIdsRef.current = [];
    setPathNodeIds([]);
    setHasStroke(false);
  };

  const handleStartDrive = () => {
    const hasLevel = isQuizMode ? Boolean(currentQuiz) : Boolean(currentWord);
    if (!hasLevel || phaseRef.current !== 'drawing' || drawnPointsRef.current.length < 2) {
      return;
    }
    soundEngine.unlock();
    const { w, h } = sizeRef.current;
    const startPos = getStartPos(w, h);
    const waypoints = [...drawnPointsRef.current];

    carStateRef.current = {
      x: waypoints[0].x,
      y: waypoints[0].y,
      angle:
        waypoints.length > 1
          ? Math.atan2(waypoints[1].y - waypoints[0].y, waypoints[1].x - waypoints[0].x)
          : 0,
      wheelSpin: 0,
      wobbleTime: 0,
      waypoints,
      segmentIndex: 0,
      segmentProgress: 0,
      expectedCharIndex: 0,
      finishingDrive: false,
    };

    if (dist(startPos, waypoints[0]) > 4) {
      carStateRef.current.waypoints = [startPos, ...waypoints];
    }

    setFeedbackMsg(null);
    phaseRef.current = 'driving';
    setPhase('driving');
    soundEngine.startEngine();
  };

  const handleSpeakClue = () => {
    const textToSpeak = isQuizMode ? currentQuiz?.question : currentWord?.word;
    if (!textToSpeak) return;
    soundEngine.unlock();
    setIsSpeaking(true);
    speakWord(textToSpeak, () => setIsSpeaking(false));
  };

  const handleNextLevel = () => {
    soundEngine.unlock();
    if (isQuizMode) {
      if (quizIndex < quizzes.length - 1) {
        setQuizIndex((i) => i + 1);
      } else {
        setQuizIndex(0);
        initActiveLevel(true);
      }
      return;
    }

    if (wordIndex < words.length - 1) {
      setWordIndex((i) => i + 1);
    } else {
      setWordIndex(0);
      initActiveLevel(true);
    }
  };

  const slotSizeClass = useMemo(() => {
    const len = currentWord?.word.length ?? 5;
    if (len >= 9) return 'w-9 h-10 sm:w-11 sm:h-12 text-xl sm:text-2xl';
    if (len >= 7) return 'w-10 h-11 sm:w-12 sm:h-13 text-2xl sm:text-3xl';
    return 'w-11 h-12 sm:w-14 sm:h-15 text-2xl sm:text-3xl';
  }, [currentWord?.word.length]);

  if (
    !activeClass ||
    (isQuizMode
      ? quizzes.length === 0 || !currentQuiz
      : words.length === 0 || !currentWord)
  ) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border-2 border-amber-200 p-8 text-center shadow-xs flex flex-col items-center gap-4">
          <h2 className="font-display font-bold text-2xl text-slate-900">
            {isQuizMode ? 'No Quiz Questions Yet!' : 'No Words in This Class Yet!'}
          </h2>
          <p className="text-slate-600 text-sm">
            {isQuizMode
              ? 'Add at least one quiz question (or 2 vocabulary words) in Teacher Setup to play Quiz Drive.'
              : 'Add at least one English vocabulary word and picture clue in Teacher Setup to begin playing.'}
          </p>
          <button
            type="button"
            onClick={onOpenSetup}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold border-b-4 border-amber-600 cursor-pointer"
          >
            <Settings2 className="w-5 h-5" />
            <span>Go to Teacher Setup</span>
          </button>
        </div>
      </main>
    );
  }

  const isPathComplete = isQuizMode
    ? pathNodeIds.length >= 1
    : Boolean(currentWord && pathNodeIds.length === currentWord.word.length);

  const drawnNodes = !isQuizMode
    ? pathNodeIds
        .map((id) => nodesRef.current.find((n) => n.id === id))
        .filter((n): n is LetterNode => Boolean(n))
    : [];

  const selectedQuizNode = isQuizMode
    ? quizNodesRef.current.find((n) => n.id === pathNodeIds[0]) ?? null
    : null;

  const hasMoreLevels = isQuizMode
    ? quizIndex < quizzes.length - 1
    : wordIndex < words.length - 1;

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-2 flex flex-col gap-2 md:h-[calc(100dvh-4.25rem)] md:overflow-hidden">
      {/* TOP AREA: Compact Spelling Mode OR Quiz Question Mode */}
      {isQuizMode && currentQuiz ? (
        (() => {
          const qType = currentQuiz.questionType ?? 'text-question';
          const aType = qType === 'image-question' ? 'text' : (currentQuiz.answerType ?? 'text');
          const isPicturePromptOnly = qType === 'image-question';
          const showPromptImage =
            isPicturePromptOnly ||
            (Boolean(currentQuiz.imageDataUrl) && aType !== 'image');

          return (
            <section className="bg-white rounded-2xl border-2 border-amber-200 shadow-xs px-3.5 py-1.5 sm:px-5 sm:py-2 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              {/* Left: Maximized Question Picture + Listen Button */}
              <div className="flex items-center gap-3 shrink-0">
                {showPromptImage && currentQuiz.imageDataUrl ? (
                  <div
                    className={`relative ${
                      isPicturePromptOnly
                        ? 'w-52 h-40 sm:w-64 sm:h-44 md:w-76 md:h-48'
                        : 'w-44 h-36 sm:w-56 sm:h-40 md:w-64 md:h-44'
                    } flex items-center justify-center shrink-0`}
                  >
                    <img
                      src={currentQuiz.imageDataUrl}
                      alt="Quiz picture question"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="w-full h-full object-contain select-none pointer-events-none"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-sky-50 border-2 border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
                    <HelpCircle className="w-8 h-8 sm:w-9 sm:h-9 text-amber-500" />
                  </div>
                )}

                <div className="flex flex-col items-start gap-1.5">
                  <div className="text-xs font-bold text-slate-500 tabular-nums">
                    {activeClass.name} · Question {quizIndex + 1} of {quizzes.length}
                  </div>

                  {!isPicturePromptOnly && (currentQuiz.question ?? '').trim().length > 0 && (
                    <button
                      type="button"
                      onClick={handleSpeakClue}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-sm transition-all cursor-pointer active:translate-y-0.5 ${
                        isSpeaking
                          ? 'bg-sky-500 text-white border-b-3 border-sky-700 scale-105'
                          : 'bg-sky-100 hover:bg-sky-200 text-sky-900 border-b-3 border-sky-300'
                      }`}
                      title="Hear the question"
                    >
                      <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                      <span>Listen</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right/Center: Question Prompt + Chosen Answer Status */}
              <div className="flex-1 flex flex-col items-center md:items-end gap-2 w-full">
                {!isPicturePromptOnly && (currentQuiz.question ?? '').trim().length > 0 && (
                  <div className="w-full md:max-w-2xl bg-sky-50/85 border-2 border-sky-200 rounded-xl px-4 py-2 text-center md:text-right shadow-2xs">
                    <div className="font-display font-bold text-base sm:text-lg md:text-xl leading-snug text-slate-900">
                      {currentQuiz.question}
                    </div>
                  </div>
                )}

                <div className="w-full md:w-auto min-w-[240px] max-w-full bg-amber-50/80 border-2 border-amber-200 rounded-xl px-3 py-1.5 flex items-center justify-center md:justify-between gap-2.5">
                  <span className="text-xs font-extrabold text-amber-900 shrink-0">
                    Your Choice
                  </span>
                  {collectedAnswer ? (
                    collectedAnswer.imageDataUrl ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-emerald-500 text-white font-display font-bold text-xs shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <img
                          src={collectedAnswer.imageDataUrl}
                          alt="Chosen answer"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          className="w-10 h-10 rounded-lg bg-white p-0.5 object-contain"
                        />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500 text-white font-display font-bold text-sm shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{collectedAnswer.text}</span>
                      </span>
                    )
                  ) : selectedQuizNode ? (
                    selectedQuizNode.imageDataUrl ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl bg-sky-500 shadow-xs">
                        <img
                          src={selectedQuizNode.imageDataUrl}
                          alt="Selected answer"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          className="w-10 h-10 rounded-lg bg-white p-0.5 object-contain"
                        />
                      </span>
                    ) : (
                      <span className="px-3 py-0.5 rounded-full bg-sky-500 text-white font-display font-bold text-sm shadow-xs">
                        {selectedQuizNode.text}
                      </span>
                    )
                  ) : (
                    <span className="text-xs font-semibold text-amber-700/80">
                      {aType === 'image'
                        ? 'Draw through the right picture below'
                        : 'Draw through the right word below'}
                    </span>
                  )}
                </div>
              </div>
            </section>
          );
        })()
      ) : (
        <section className="bg-white rounded-2xl border-2 border-sky-100 shadow-xs px-3.5 py-1.5 sm:px-5 sm:py-2 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          {/* Left/Center: Maximized Picture & Speaker Button */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative w-44 h-36 sm:w-56 sm:h-40 md:w-64 md:h-44 flex items-center justify-center shrink-0">
              {currentWord.imageDataUrl ? (
                <img
                  src={currentWord.imageDataUrl}
                  alt="Vocabulary picture clue"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-contain select-none pointer-events-none"
                />
              ) : null}
            </div>

            <div className="flex flex-col items-start gap-1.5">
              <div className="text-xs font-bold text-slate-500 tabular-nums">
                {activeClass.name} · Word {wordIndex + 1} of {words.length}
              </div>

              <button
                type="button"
                onClick={handleSpeakClue}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-sm transition-all cursor-pointer active:translate-y-0.5 ${
                  isSpeaking
                    ? 'bg-sky-500 text-white border-b-3 border-sky-700 scale-105'
                    : 'bg-sky-100 hover:bg-sky-200 text-sky-900 border-b-3 border-sky-300'
                }`}
                title="Hear the word"
              >
                <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                <span>Listen</span>
              </button>
            </div>
          </div>

          {/* Right/Center: Target Word Letter Slots + Live Connecting Preview */}
          <div className="flex flex-col items-center md:items-end gap-2 w-full md:w-auto">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {currentWord.word.split('').map((_, idx) => {
                const filledChar = collectedSlots[idx];
                return (
                  <div
                    key={`${currentWord.id}-slot-${idx}`}
                    ref={(el) => {
                      slotRefs.current[idx] = el;
                    }}
                    className={`${slotSizeClass} rounded-[22%] flex items-center justify-center select-none`}
                  >
                    {filledChar ? (
                      <CartoonLetterTile
                        char={filledChar}
                        sizeClass="w-full h-full animate-slot-pop"
                      />
                    ) : (
                      <div className="w-full h-full rounded-[22%] border-3 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center font-display font-bold text-slate-300">
                        _
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live Drawn Sequence Box */}
            <div className="w-full md:w-auto min-w-[240px] max-w-full bg-amber-50/80 border-2 border-amber-200 rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-center md:justify-between gap-2">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-extrabold text-amber-900">Your Path</span>
                <span className="text-xs font-bold text-amber-700 tabular-nums">
                  {drawnNodes.length} / {currentWord.word.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 min-h-[34px]">
                {drawnNodes.length === 0 ? (
                  <span className="text-xs font-semibold text-amber-700/80">
                    Draw through the letters below
                  </span>
                ) : (
                  drawnNodes.map((node, idx) => (
                    <React.Fragment key={`preview-${node.id}`}>
                      {idx > 0 && (
                        <span className="text-amber-400 font-bold text-xs select-none">→</span>
                      )}
                      <CartoonLetterTile
                        char={node.char}
                        sizeClass="w-8 h-8 sm:w-9 sm:h-9"
                      />
                    </React.Fragment>
                  ))
                )}
                {drawnNodes.length > 0 && drawnNodes.length < currentWord.word.length && (
                  <>
                    <span className="text-amber-400 font-bold text-xs select-none">→</span>
                    <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-[22%] border-2 border-dashed border-amber-300 bg-white/70 flex items-center justify-center font-display font-bold text-sm text-amber-400 select-none">
                      ?
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BOTTOM AREA: Expanded Interactive Playground Canvas */}
      <section className="relative flex-1 min-h-[380px] sm:min-h-[440px] md:min-h-0 rounded-3xl overflow-hidden border-3 border-emerald-200 shadow-sm bg-emerald-50 flex flex-col">
        <div ref={containerRef} className="relative flex-1 w-full min-h-0">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute inset-0 block w-full h-full touch-none cursor-crosshair select-none"
          />

          {/* Friendly Bump / Prompt Floating Message */}
          {feedbackMsg && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-3 rounded-2xl bg-white/95 border-2 border-amber-300 shadow-md font-display font-bold text-lg sm:text-xl text-amber-900 whitespace-nowrap pointer-events-none">
              {feedbackMsg}
            </div>
          )}

          {/* Subtle Helper Instruction when path is empty */}
          {phase === 'drawing' && !hasStroke && !feedbackMsg && (
            <div className="hidden sm:block absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-white/85 border border-emerald-200 text-sm sm:text-base font-bold text-emerald-900 pointer-events-none whitespace-nowrap">
              {isQuizMode
                ? 'Draw a road from the car through the right answer, then press GO!'
                : 'Draw a road freely from the car through the letters in order, then press OK / GO!'}
            </div>
          )}

          {/* Quick Playground Background Upload & Reset Controls */}
          {onUpdatePlaygroundBg && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
              <input
                ref={bgFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBgFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => bgFileInputRef.current?.click()}
                disabled={isUpdatingBg}
                title="Upload custom playground background"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-800 border border-emerald-200 shadow-xs text-xs font-bold cursor-pointer transition-colors disabled:opacity-60"
              >
                <ImagePlus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{isUpdatingBg ? 'Loading...' : 'Change BG'}</span>
              </button>
              {playgroundBgDataUrl && (
                <button
                  type="button"
                  onClick={() => onUpdatePlaygroundBg(null)}
                  title="Reset to default grass background"
                  aria-label="Reset playground background"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/90 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-emerald-200 shadow-xs cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Bottom Control Dock (Undo / Clear / Big GO!) — floating transparent orbs without white box */}
          {phase !== 'won' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 sm:gap-5">
              <button
                type="button"
                onClick={handleUndoLast}
                disabled={phase !== 'drawing' || !hasStroke}
                title="Undo Last"
                aria-label="Undo Last"
                className={`relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full shrink-0 transition-all drop-shadow-[0_6px_10px_rgba(0,0,0,0.28)] ${
                  phase === 'drawing' && hasStroke
                    ? 'cursor-pointer hover:scale-105 active:scale-95 active:translate-y-0.5'
                    : 'opacity-45 grayscale-[30%] cursor-not-allowed'
                }`}
              >
                {dockOrbs.undo ? (
                  <img
                    src={dockOrbs.undo}
                    alt="Undo Last"
                    onError={() => setDockOrbs((prev) => ({ ...prev, undo: undefined }))}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  <span className="w-full h-full rounded-full bg-cyan-500 text-white border-3 border-cyan-950 flex items-center justify-center">
                    <Undo2 className="w-6 h-6" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleClearPath}
                disabled={phase !== 'drawing' || !hasStroke}
                title="Clear Path"
                aria-label="Clear Path"
                className={`relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full shrink-0 transition-all drop-shadow-[0_6px_10px_rgba(0,0,0,0.28)] ${
                  phase === 'drawing' && hasStroke
                    ? 'cursor-pointer hover:scale-105 active:scale-95 active:translate-y-0.5'
                    : 'opacity-45 grayscale-[30%] cursor-not-allowed'
                }`}
              >
                {dockOrbs.clear ? (
                  <img
                    src={dockOrbs.clear}
                    alt="Clear Path"
                    onError={() => setDockOrbs((prev) => ({ ...prev, clear: undefined }))}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  <span className="w-full h-full rounded-full bg-rose-600 text-white border-3 border-rose-950 flex items-center justify-center">
                    <Trash2 className="w-6 h-6" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleStartDrive}
                disabled={phase !== 'drawing' || !hasStroke}
                title="GO!"
                aria-label="GO!"
                className={`relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0 transition-all drop-shadow-[0_8px_14px_rgba(0,0,0,0.32)] ${
                  phase === 'drawing' && hasStroke
                    ? isPathComplete
                      ? 'cursor-pointer scale-105 hover:scale-110 active:scale-95 active:translate-y-0.5 animate-gentle-float'
                      : 'cursor-pointer hover:scale-105 active:scale-95 active:translate-y-0.5'
                    : 'opacity-45 grayscale-[30%] cursor-not-allowed'
                }`}
              >
                {dockOrbs.go ? (
                  <img
                    src={dockOrbs.go}
                    alt="GO!"
                    onError={() => setDockOrbs((prev) => ({ ...prev, go: undefined }))}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  <span className="w-full h-full rounded-full bg-amber-400 text-amber-950 border-3 border-amber-900 flex items-center justify-center font-display font-extrabold text-xl">
                    <Play className="w-7 h-7 fill-current" />
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Victory Actions: 2 floating glossy 3D orb buttons (Replay & Next Word/Question / Play Again) */}
          {phase === 'won' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-5 sm:gap-6">
              <button
                type="button"
                onClick={() => initActiveLevel(true)}
                title="Replay"
                aria-label="Replay"
                className="relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0 cursor-pointer transition-all hover:scale-110 active:scale-95 active:translate-y-0.5 drop-shadow-[0_8px_14px_rgba(0,0,0,0.32)]"
              >
                {replayOrbUrl ? (
                  <img
                    src={replayOrbUrl}
                    alt="Replay"
                    onError={() => setReplayOrbUrl(null)}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  <span className="w-full h-full rounded-full bg-gradient-to-b from-rose-400 via-red-600 to-rose-900 border-[3px] border-rose-950 text-white flex items-center justify-center shadow-inner">
                    <RotateCcw className="w-8 h-8 stroke-[2.75]" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleNextLevel}
                title={
                  hasMoreLevels
                    ? isQuizMode
                      ? 'Next Question'
                      : 'Next Word'
                    : 'Play Again'
                }
                aria-label={
                  hasMoreLevels
                    ? isQuizMode
                      ? 'Next Question'
                      : 'Next Word'
                    : 'Play Again'
                }
                className="relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0 cursor-pointer transition-all hover:scale-110 active:scale-95 active:translate-y-0.5 animate-gentle-float drop-shadow-[0_8px_14px_rgba(0,0,0,0.32)]"
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full pointer-events-none"
                  aria-hidden="true"
                >
                  <defs>
                    <radialGradient id="nextOrbBody" cx="38%" cy="28%" r="72%">
                      <stop offset="0%" stopColor="#9cf772" />
                      <stop offset="38%" stopColor="#2ad148" />
                      <stop offset="78%" stopColor="#129932" />
                      <stop offset="100%" stopColor="#0a5e1e" />
                    </radialGradient>
                    <linearGradient id="nextOrbArrow" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#fff7cc" />
                      <stop offset="55%" stopColor="#ffd43b" />
                      <stop offset="100%" stopColor="#f59f00" />
                    </linearGradient>
                  </defs>
                  {/* Dark outer cartoon border */}
                  <circle cx="50" cy="50" r="47" fill="#0b4619" />
                  {/* Glossy 3D sphere */}
                  <circle cx="50" cy="50" r="43" fill="url(#nextOrbBody)" />
                  {/* Inner bright rim */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="rgba(210,255,190,0.45)"
                    strokeWidth="2"
                  />
                  {/* Top-left specular gloss */}
                  <ellipse
                    cx="35"
                    cy="25"
                    rx="14"
                    ry="7.5"
                    transform="rotate(-24 35 25)"
                    fill="rgba(255,255,255,0.68)"
                  />
                  <circle cx="21" cy="36" r="3" fill="rgba(255,255,255,0.55)" />
                  {/* Bottom specular bounce */}
                  <path
                    d="M28 79 Q50 88 72 79"
                    fill="none"
                    stroke="rgba(165,255,140,0.55)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  {/* 4-point cartoon sparkles */}
                  <path
                    d="M74 22 L76 27 L81 29 L76 31 L74 36 L72 31 L67 29 L72 27 Z"
                    fill="#ffffff"
                    opacity="0.92"
                  />
                  <path
                    d="M24 68 L25.5 72 L29.5 73.5 L25.5 75 L24 79 L22.5 75 L18.5 73.5 L22.5 72 Z"
                    fill="#ffffff"
                    opacity="0.78"
                  />
                  <path
                    d="M78 65 L79 68 L82 69 L79 70 L78 73 L77 70 L74 69 L77 68 Z"
                    fill="#ffffff"
                    opacity="0.72"
                  />
                  {/* Shadow under forward arrow */}
                  <path
                    d="M27 45 H52 V34 C52 31 55.5 29.5 58 31.8 L76 49.5 C77.6 51 77.6 53.6 76 55.1 L58 72.8 C55.5 75.1 52 73.6 52 70.6 V59.5 H27 C24.5 59.5 23 58 23 55.5 V49 C23 46.5 24.5 45 27 45 Z"
                    fill="rgba(6,50,18,0.45)"
                  />
                  {/* Chunky cartoon forward arrow */}
                  <path
                    d="M27 42.5 H52 V31.5 C52 28.5 55.5 27 58 29.3 L76 47 C77.6 48.5 77.6 51.1 76 52.6 L58 70.3 C55.5 72.6 52 71.1 52 68.1 V57 H27 C24.5 57 23 55.5 23 53 V46.5 C23 44 24.5 42.5 27 42.5 Z"
                    fill="url(#nextOrbArrow)"
                    stroke="#0b4619"
                    strokeWidth="4.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Flying Letters Overlay Layer (animates smoothly from Canvas node to Top Word Slot) */}
      {flyingLetters.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {flyingLetters.map((fl) => {
            const elapsed = performance.now() - fl.startTime;
            const rawT = Math.max(0, Math.min(1, elapsed / fl.duration));
            // Smooth easeOutCubic
            const t = 1 - Math.pow(1 - rawT, 3);
            const arcLift = Math.sin(rawT * Math.PI) * 56;
            const x = fl.startX + (fl.endX - fl.startX) * t;
            const y = fl.startY + (fl.endY - fl.startY) * t - arcLift;
            const scale = 1.15 - 0.15 * t;

            return (
              <div
                key={fl.id}
                style={{
                  transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`,
                }}
                className="absolute top-0 left-0"
              >
                <CartoonLetterTile char={fl.char} sizeClass="w-20 h-20" />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};
