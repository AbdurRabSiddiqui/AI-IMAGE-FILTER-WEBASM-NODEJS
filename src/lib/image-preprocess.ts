// Image preprocessing helpers for ONNX fast neural style models

export function letterboxToSquare(
  canvas: HTMLCanvasElement,
  targetSize: number = 224,
  padColor: string = '#000'
): {
  canvas: HTMLCanvasElement;
  contentWidth: number;
  contentHeight: number;
  offsetX: number;
  offsetY: number;
} {
  const srcW = canvas.width;
  const srcH = canvas.height;
  const scale = Math.min(targetSize / srcW, targetSize / srcH);
  const newW = Math.round(srcW * scale);
  const newH = Math.round(srcH * scale);
  const offsetX = Math.floor((targetSize - newW) / 2);
  const offsetY = Math.floor((targetSize - newH) / 2);

  const out = document.createElement('canvas');
  out.width = targetSize;
  out.height = targetSize;
  const ctx = out.getContext('2d');
  if (ctx) {
    ctx.fillStyle = padColor;
    ctx.fillRect(0, 0, targetSize, targetSize);
    ctx.drawImage(canvas, 0, 0, srcW, srcH, offsetX, offsetY, newW, newH);
  }
  return { canvas: out, contentWidth: newW, contentHeight: newH, offsetX, offsetY };
}

export async function preprocessImageForONNX(imageFile: File): Promise<{
  tensor: Float32Array;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  letterbox: { contentWidth: number; contentHeight: number; offsetX: number; offsetY: number; targetSize: number };
} | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      const originalWidth = img.width;
      const originalHeight = img.height;
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      ctx.drawImage(img, 0, 0);

      // Letterbox to 224x224 while preserving aspect ratio
      const targetSize = 224;
      const lb = letterboxToSquare(canvas, targetSize);
      const processedCanvas = lb.canvas;
      const processedCtx = processedCanvas.getContext('2d');
      if (!processedCtx) {
        resolve(null);
        return;
      }

      const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
      const { data, width, height } = imageData;

      const tensor = new Float32Array(1 * 3 * height * width);
      for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
          const pixelIndex = (i * width + j) * 4; // RGBA
          const tensorIndex = i * width + j;
          tensor[tensorIndex] = data[pixelIndex]; // R
          tensor[height * width + tensorIndex] = data[pixelIndex + 1]; // G
          tensor[2 * height * width + tensorIndex] = data[pixelIndex + 2]; // B
        }
      }

      resolve({
        tensor,
        width,
        height,
        originalWidth,
        originalHeight,
        letterbox: {
          contentWidth: lb.contentWidth,
          contentHeight: lb.contentHeight,
          offsetX: lb.offsetX,
          offsetY: lb.offsetY,
          targetSize
        }
      });
    };

    img.onerror = () => resolve(null);
    const imageUrl = URL.createObjectURL(imageFile);
    img.src = imageUrl;
  });
}

// Note: postprocessing moved to src/lib/image-postprocess.ts


