/**
 * Client-side HTML5 Canvas image resizer & white-background remover.
 * Uses edge-seeded flood fill so interior white details (e.g., eyes) stay intact!
 */

const MAX_DIM = 420;

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (w <= 0 || h <= 0) {
        reject(new Error('Invalid image dimensions'));
        return;
      }
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function resizeImageDataUrl(
  dataUrl: string,
  maxDim = MAX_DIM
): Promise<string> {
  const img = await loadImageElement(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

export async function resizeBackgroundDataUrl(
  dataUrl: string,
  maxDim = 1600
): Promise<string> {
  const img = await loadImageElement(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.fillStyle = '#ecfdf5';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.86);
}

export async function removeWhiteBackground(dataUrl: string, tolerance = 38): Promise<string> {
  const img = await loadImageElement(dataUrl);
  const scale = Math.min(1, MAX_DIM / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const isNearWhite = (idx: number): boolean => {
    const a = data[idx + 3];
    if (a < 15) return true;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const minChannel = Math.min(r, g, b);
    const maxChannel = Math.max(r, g, b);
    return minChannel >= 255 - tolerance && maxChannel - minChannel <= 28;
  };

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const tryPush = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    if (isNearWhite(p * 4)) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = (p - x) / width;

    const idx = p * 4;
    data[idx + 3] = 0;

    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }

  // Soft edge feathering for pixels adjacent to removed background
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (visited[p]) continue;
      const hasTransparentNeighbor =
        visited[p - 1] || visited[p + 1] || visited[p - width] || visited[p + width];
      if (hasTransparentNeighbor) {
        const idx = p * 4;
        const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (avg > 215) {
          data[idx + 3] = Math.round(data[idx + 3] * 0.45);
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function processCarImage(
  dataUrl: string,
  options: { removeBg: boolean; tolerance?: number }
): Promise<string> {
  const img = await loadImageElement(dataUrl);
  const maxDim = 520;
  const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, width, height);
  if (!options.removeBg) {
    return canvas.toDataURL('image/png');
  }

  const tolerance = Math.max(10, Math.min(110, options.tolerance ?? 42));
  const maxChannelDiff = Math.max(24, Math.round(tolerance * 0.78));
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const isNearWhite = (idx: number): boolean => {
    const a = data[idx + 3];
    if (a < 15) return true;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const minChannel = Math.min(r, g, b);
    const maxChannel = Math.max(r, g, b);
    return minChannel >= 255 - tolerance && maxChannel - minChannel <= maxChannelDiff;
  };

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const tryPush = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    if (isNearWhite(p * 4)) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = (p - x) / width;

    data[p * 4 + 3] = 0;

    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (visited[p] || data[p * 4 + 3] === 0) continue;
      const hasTransparentNeighbor =
        visited[p - 1] || visited[p + 1] || visited[p - width] || visited[p + width];
      if (hasTransparentNeighbor) {
        const idx = p * 4;
        const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (avg > 210) {
          data[idx + 3] = Math.round(data[idx + 3] * 0.4);
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

  // Tightly crop transparent padding so the car scales accurately on the track
  if (maxX > minX && maxY > minY) {
    const pad = 4;
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.min(width - sx, maxX - minX + pad * 2);
    const sh = Math.min(height - sy, maxY - minY + pad * 2);

    const cropped = document.createElement('canvas');
    cropped.width = sw;
    cropped.height = sh;
    const cCtx = cropped.getContext('2d');
    if (cCtx) {
      cCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      return cropped.toDataURL('image/png');
    }
  }

  return canvas.toDataURL('image/png');
}
