// Image preprocessing helpers for ONNX fast neural style models

export function resizeImageToSquare(canvas: HTMLCanvasElement, targetSize: number = 224): HTMLCanvasElement {
  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = targetSize;
  resizedCanvas.height = targetSize;
  const ctx = resizedCanvas.getContext('2d');
  
  if (ctx) {
    // Resize and stretch to exact square dimensions (224x224)
    ctx.drawImage(canvas, 0, 0, targetSize, targetSize);
  }
  return resizedCanvas;
}

export async function preprocessImageForONNX(imageFile: File): Promise<{
  tensor: Float32Array;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
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

      // Resize to exact 224x224 as required by Fast Neural Style models
      const processedCanvas = resizeImageToSquare(canvas, 224);
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

      resolve({ tensor, width, height, originalWidth, originalHeight });
    };

    img.onerror = () => resolve(null);
    const imageUrl = URL.createObjectURL(imageFile);
    img.src = imageUrl;
  });
}

// Note: postprocessing moved to src/lib/image-postprocess.ts


