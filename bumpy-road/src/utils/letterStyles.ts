export interface LetterTilePalette {
  bg: string;
  bgTop: string;
  bgBottom: string;
  letterFill: string;
  letterHighlight: string;
}

const THEMES = {
  pink: { bg: '#f55698', bgTop: '#ff96c3', bgBottom: '#c9286d' },
  cyan: { bg: '#15c5db', bgTop: '#7befff', bgBottom: '#078ca6' },
  yellow: { bg: '#ffd42a', bgTop: '#fff394', bgBottom: '#e59d00' },
  orange: { bg: '#ff7b0f', bgTop: '#ffbe73', bgBottom: '#cc4e00' },
  purple: { bg: '#9747ff', bgTop: '#cfa3ff', bgBottom: '#691fd1' },
  green: { bg: '#2ae375', bgTop: '#8effba', bgBottom: '#0faa4e' },
  lime: { bg: '#98e615', bgTop: '#d4ff78', bgBottom: '#65ad00' },
  blue: { bg: '#2292f5', bgTop: '#80c8ff', bgBottom: '#0b5fc2' },
  mint: { bg: '#13d4a3', bgTop: '#7dffde', bgBottom: '#079973' },
  red: { bg: '#ff364a', bgTop: '#ff8a96', bgBottom: '#c41226' },
  sky: { bg: '#21b6f7', bgTop: '#8ae2ff', bgBottom: '#0a80bf' },
  royal: { bg: '#3e8bff', bgTop: '#96c2ff', bgBottom: '#1c59cf' },
} as const;

const LETTER_COLORS = {
  cream: { letterFill: '#fff3b0', letterHighlight: '#ffffff' },
  rose: { letterFill: '#ffc2d6', letterHighlight: '#ffeaf1' },
  mint: { letterFill: '#ceffd6', letterHighlight: '#f0fff2' },
} as const;

const LETTER_MAP: Record<string, LetterTilePalette> = {
  A: { ...THEMES.pink, ...LETTER_COLORS.cream },
  B: { ...THEMES.cyan, ...LETTER_COLORS.rose },
  C: { ...THEMES.yellow, ...LETTER_COLORS.rose },
  D: { ...THEMES.orange, ...LETTER_COLORS.cream },
  E: { ...THEMES.purple, ...LETTER_COLORS.mint },
  F: { ...THEMES.green, ...LETTER_COLORS.rose },
  G: { ...THEMES.lime, ...LETTER_COLORS.mint },
  H: { ...THEMES.pink, ...LETTER_COLORS.rose },
  I: { ...THEMES.blue, ...LETTER_COLORS.cream },
  J: { ...THEMES.mint, ...LETTER_COLORS.mint },
  K: { ...THEMES.orange, ...LETTER_COLORS.rose },
  L: { ...THEMES.lime, ...LETTER_COLORS.rose },
  M: { ...THEMES.purple, ...LETTER_COLORS.cream },
  N: { ...THEMES.lime, ...LETTER_COLORS.rose },
  O: { ...THEMES.yellow, ...LETTER_COLORS.mint },
  P: { ...THEMES.purple, ...LETTER_COLORS.cream },
  Q: { ...THEMES.red, ...LETTER_COLORS.rose },
  R: { ...THEMES.mint, ...LETTER_COLORS.cream },
  S: { ...THEMES.sky, ...LETTER_COLORS.cream },
  T: { ...THEMES.royal, ...LETTER_COLORS.cream },
  U: { ...THEMES.red, ...LETTER_COLORS.rose },
  V: { ...THEMES.yellow, ...LETTER_COLORS.mint },
  W: { ...THEMES.sky, ...LETTER_COLORS.cream },
  X: { ...THEMES.red, ...LETTER_COLORS.cream },
  Y: { ...THEMES.purple, ...LETTER_COLORS.rose },
  Z: { ...THEMES.green, ...LETTER_COLORS.cream },
};

export function getLetterPalette(char: string): LetterTilePalette {
  const key = (char ?? '').trim().toUpperCase();
  return LETTER_MAP[key] ?? { ...THEMES.sky, ...LETTER_COLORS.cream };
}

export function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }

  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFourPointSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.closePath();
  ctx.fill();
}

export function drawCartoonLetterBlockOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  char: string,
  options?: {
    isConnected?: boolean;
    stepNumber?: number;
    isHighlighted?: boolean;
    pulseScale?: number;
  }
) {
  const palette = getLetterPalette(char);
  const half = size / 2;
  const cornerRadius = size * 0.22;
  const isConnected = Boolean(options?.isConnected);
  const isHighlighted = Boolean(options?.isHighlighted);

  ctx.save();
  ctx.translate(x, y);

  // Outer glow / halo if connected or hovered
  if (isConnected || isHighlighted) {
    const haloScale = options?.pulseScale ?? 1;
    ctx.fillStyle = isConnected
      ? 'rgba(251, 146, 60, 0.34)'
      : 'rgba(56, 189, 248, 0.32)';
    drawRoundedRectPath(
      ctx,
      -(half + 7) * haloScale,
      -(half + 7) * haloScale,
      (size + 14) * haloScale,
      (size + 14) * haloScale,
      cornerRadius + 6
    );
    ctx.fill();
  }

  // Soft ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  drawRoundedRectPath(ctx, -half + 1, -half + 6, size, size, cornerRadius);
  ctx.fill();

  // Main rounded square block base (bottom bevel color)
  ctx.fillStyle = palette.bgBottom;
  drawRoundedRectPath(ctx, -half, -half, size, size, cornerRadius);
  ctx.fill();

  // Inner vivid gradient face shifted slightly up for chunky 3D bevel
  const faceGrad = ctx.createLinearGradient(0, -half, 0, half);
  faceGrad.addColorStop(0, palette.bgTop);
  faceGrad.addColorStop(0.28, palette.bg);
  faceGrad.addColorStop(1, palette.bg);
  ctx.fillStyle = faceGrad;
  drawRoundedRectPath(
    ctx,
    -half + 2,
    -half + 2,
    size - 4,
    size - 7,
    Math.max(4, cornerRadius - 2)
  );
  ctx.fill();

  // Top-left glossy highlight pill + dot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
  ctx.beginPath();
  ctx.ellipse(-half * 0.56, -half * 0.62, size * 0.1, size * 0.055, -0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.beginPath();
  ctx.arc(-half * 0.3, -half * 0.72, size * 0.032, 0, Math.PI * 2);
  ctx.fill();

  // Crisp 4-point sparkles matching the reference tiles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  drawFourPointSparkle(ctx, half * 0.64, -half * 0.6, size * 0.095);
  drawFourPointSparkle(ctx, -half * 0.64, half * 0.58, size * 0.065);

  // Dark cartoon outer outline
  ctx.strokeStyle = isConnected ? '#ea580c' : '#132238';
  ctx.lineWidth = isConnected ? 3.8 : 3.2;
  drawRoundedRectPath(ctx, -half, -half, size, size, cornerRadius);
  ctx.stroke();

  // Puffy 3D outlined cartoon letter
  const fontSize = Math.round(size * 0.62);
  ctx.font = `700 ${fontSize}px Fredoka, Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Letter drop shadow
  ctx.fillStyle = '#132238';
  ctx.fillText(char, 0, 4.5);

  // Thick dark outline around letter
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#132238';
  ctx.lineWidth = Math.max(4.5, size * 0.11);
  ctx.strokeText(char, 0, 1.5);

  // Letter gradient fill (highlight at top -> pastel fill)
  const textGrad = ctx.createLinearGradient(0, -fontSize * 0.4, 0, fontSize * 0.4);
  textGrad.addColorStop(0, palette.letterHighlight);
  textGrad.addColorStop(0.45, palette.letterFill);
  textGrad.addColorStop(1, palette.letterFill);
  ctx.fillStyle = textGrad;
  ctx.fillText(char, 0, 1.5);

  // Step number badge if connected
  if (isConnected && options?.stepNumber !== undefined) {
    const bx = half - 2;
    const by = -half + 2;
    ctx.fillStyle = '#ea580c';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px Nunito, sans-serif';
    ctx.fillText(String(options.stepNumber), bx, by + 0.5);
  }

  ctx.restore();
}
