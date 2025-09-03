// Converts ONNX output tensor [1, 3, H, W] float32 (0..255) to a data URL image

export function postprocessONNXOutput(
  outputTensor: Float32Array,
  width: number,
  height: number
): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.createImageData(width, height);
    const { data } = imageData;

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const pixelIndex = (i * width + j) * 4;
        const tensorIndex = i * width + j;
        data[pixelIndex] = Math.min(255, Math.max(0, Math.round(outputTensor[tensorIndex])));
        data[pixelIndex + 1] = Math.min(255, Math.max(0, Math.round(outputTensor[height * width + tensorIndex])));
        data[pixelIndex + 2] = Math.min(255, Math.max(0, Math.round(outputTensor[2 * height * width + tensorIndex])));
        data[pixelIndex + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return null;
  }
}

export function cropDataUrl(
  dataUrl: string,
  sx: number,
  sy: number,
  sw: number,
  syh?: number // unused, placeholder to avoid accidental breaking changes
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = arguments[5] as number || sw; // keep square by default if not provided
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      const sh = arguments[5] as number || sw;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function scaleDataUrl(
  dataUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function blendDataUrls(
  originalDataUrl: string,
  stylizedDataUrl: string,
  alpha: number
): Promise<string> {
  return new Promise((resolve) => {
    const imgA = new Image();
    const imgB = new Image();

    let aLoaded = false;
    let bLoaded = false;

    const tryBlend = () => {
      if (!aLoaded || !bLoaded) return;
      const width = Math.max(imgA.width, imgB.width) || imgA.width || imgB.width;
      const height = Math.max(imgA.height, imgB.height) || imgA.height || imgB.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(stylizedDataUrl);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = 1 - alpha;
      ctx.drawImage(imgA, 0, 0, width, height);
      ctx.globalAlpha = alpha;
      ctx.drawImage(imgB, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };

    imgA.onload = () => { aLoaded = true; tryBlend(); };
    imgB.onload = () => { bLoaded = true; tryBlend(); };
    imgA.onerror = () => resolve(stylizedDataUrl);
    imgB.onerror = () => resolve(stylizedDataUrl);

    imgA.src = originalDataUrl;
    imgB.src = stylizedDataUrl;
  });
}


