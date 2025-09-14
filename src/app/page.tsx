// src/app/page.tsx
"use client";
import useWasm from "./hooks/useWasm";
import { useState } from "react";
import { preprocessImageForONNX } from "@/lib/image-preprocess";
import { postprocessONNXOutput, scaleDataUrl, blendDataUrls, cropDataUrl } from "@/lib/image-postprocess";
import { logger } from "@/lib/logger";
import { runOrt } from "@/lib/onnx-runtime";
export default function Home() {
  useWasm();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [result, setResult] = useState<number | null>(null);
  const [styledImage, setStyledImage] = useState<string | null>(null);
  const [blendedImage, setBlendedImage] = useState<string | null>(null);
  const [styleStrength, setStyleStrength] = useState<number>(1); // 0..1
  const [originalImageScaled, setOriginalImageScaled] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const artStyles = ["Picasso", "Van Gogh", "Georges Seurat", "Cyberpunk"];
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      // Reset processing-related state for a clean run on new image
      setStyledImage(null);
      setBlendedImage(null);
      setOriginalImageScaled(null);
      setResult(null);
      setStyleStrength(1);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const processImage = async () => {
    if (!selectedImage || !selectedStyle) return;
    
    setIsProcessing(true);
    // Don't clear styledImage here - only clear it if we want to show the new result
    
    try {
      logger.info('Starting image processing...', { style: selectedStyle, fileName: selectedImage.name });
      
      // Preprocess the image for ONNX model
      const preprocessedInput = await preprocessImageForONNX(selectedImage);
      
      if (!preprocessedInput) {
        logger.error('Failed to preprocess image');
        return;
      }
      
      logger.info('Image preprocessed successfully', { 
        width: preprocessedInput.width, 
        height: preprocessedInput.height,
        tensorLength: preprocessedInput.tensor.length 
      });
      
      // Map style names to model files
      const styleModelMap: { [key: string]: string } = {
        "Van Gogh": "/models/vangogh.onnx",
        "Picasso": "/models/picasso.onnx", 
        "Georges Seurat": "/models/georgesseurat.onnx",
        "Cyberpunk": "/models/cyberpunk.onnx"
      };
      
      const modelPath = styleModelMap[selectedStyle];
      
      if (!modelPath) {
        logger.error('Model not found for style:', selectedStyle);
        return;
      }
      
      logger.info('Running ONNX inference...', { modelPath });
      
      // Prepare tensor and dims [1, 3, H, W]
      const { tensor, width, height, originalWidth, originalHeight, letterbox } = preprocessedInput;
      const dims: number[] = [1, 3, height, width];
      const output = await runOrt(modelPath, { data: tensor, dims });

      logger.info('ONNX inference completed', { outputDims: output.dims });

      // Postprocess output back to image
      const outDims = output.dims as number[]; // [1, 3, H, W]
      const outH = outDims[2];
      const outW = outDims[3];
      const outData = output.data as Float32Array;
      
      logger.info('Starting postprocessing...', { outW, outH, dataLength: outData.length });
      
      const styled224 = postprocessONNXOutput(outData, outW, outH);
      
      if (!styled224) {
        logger.error('Failed to postprocess output image');
        return;
      }
      
      // Crop out the letterbox area before scaling back
      const cropped = await cropDataUrl(
        styled224,
        letterbox.offsetX,
        letterbox.offsetY,
        letterbox.contentWidth,
        letterbox.contentHeight
      );
      // Scale back to original dimensions for display
      const styledScaled = await scaleDataUrl(cropped, originalWidth, originalHeight);
      // Also scale the original image preview to match output size for blending
      if (imagePreview) {
        const originalScaled = await scaleDataUrl(imagePreview, originalWidth, originalHeight);
        setOriginalImageScaled(originalScaled);
        const blended = await blendDataUrls(originalScaled, styledScaled, styleStrength);
        setBlendedImage(blended);
      } else {
        setBlendedImage(styledScaled);
      }
      logger.info('Style transfer completed successfully!', { 
        finalSize: { width: originalWidth, height: originalHeight }
      });
      setStyledImage(styledScaled);
      logger.info('setStyledImage called with scaled image');

      // Optional: keep a numeric result for existing UI
      setResult(outData.length);
      
    } catch (error) {
      logger.error('Error processing image:', error as Error);
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <main className="min-h-screen p-24 flex flex-col items-center relative overflow-hidden">
      {/* Background rainbow glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="w-[120vmax] h-[120vmax] rounded-full bg-[conic-gradient(at_top_right,_#06b6d4,_#22c55e,_#f59e0b,_#ef4444,_#8b5cf6,_#06b6d4)] blur-3xl opacity-30 animate-spin [animation-duration:20s]" />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold tracking-tight">Image Artify</h1>
        <p className="mt-2 text-sm text-gray-400">Made with Web Assembly Node js</p>
      </div>
      <div className="space-y-6 w-full max-w-2xl">
        {/* Image Upload Field */}
        <div className="flex flex-col space-y-4 text-center">
          <label htmlFor="image-upload" className="text-lg font-medium">
            Upload an Image:
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Art Style Selector */}
        <div className="flex flex-col space-y-4 text-center">
          <label htmlFor="style-selector" className="text-lg font-medium">
            Choose Art Style:
          </label>
          <select
            id="style-selector"
            value={selectedStyle}
            onChange={(e) => {
              setSelectedStyle(e.target.value);
              // Reset blend strength when switching styles
              setStyleStrength(1);
              // If we already have a styled image, show the full style by default
              if (styledImage) setBlendedImage(styledImage);
            }}
            className="p-3 border-2 border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:border-blue-500 focus:outline-none transition-colors text-gray-700 font-medium"
          >
            <option value="" disabled className="text-gray-400">
              Select a style...
            </option>
            {artStyles.map((style) => (
              <option key={style} value={style} className="py-2">
                {style}
              </option>
            ))}
          </select>
          {selectedStyle && (
            <p className="text-sm text-gray-600">
              Selected style: <span className="font-semibold text-blue-600">{selectedStyle}</span>
            </p>
          )}
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="flex flex-col space-y-4 text-center">
            <h3 className="text-lg font-medium">Preview:</h3>
            <div className="relative max-w-md mx-auto">
              <img
                src={imagePreview}
                alt="Selected image preview"
                className="w-full h-auto rounded-lg shadow-md"
              />
            </div>
            <div className="text-sm text-gray-600">
              <p>File name: {selectedImage?.name}</p>
              <p>File size: {selectedImage ? (selectedImage.size / 1024).toFixed(2) : 0} KB</p>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <h3 className="text-lg font-medium text-blue-800">Processing...</h3>
          </div>
        )}

        {/* Stylized Output */}
        {(blendedImage || styledImage) && (
          <div className="flex flex-col space-y-4 text-center">
            <h3 className="text-lg font-medium">Stylized Output:</h3>
            <div className="relative max-w-md mx-auto">
              <img
                src={blendedImage ?? styledImage ?? ''}
                alt="Stylized output"
                className="w-full h-auto rounded-lg shadow-md"
              />
            </div>
            {/* Style Strength Slider */}
            <div className="flex flex-col items-center space-y-2">
              <label className="text-sm text-gray-700">Style Strength: {(styleStrength * 100).toFixed(0)}%</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={styleStrength}
                onChange={async (e) => {
                  const v = Number(e.target.value);
                  setStyleStrength(v);
                  if (originalImageScaled && styledImage) {
                    const blended = await blendDataUrls(originalImageScaled, styledImage, v);
                    setBlendedImage(blended);
                  }
                }}
                className="w-full max-w-md"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = (blendedImage ?? styledImage) as string;
                  link.download = 'stylized.png';
                  link.click();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
              >
                Download PNG
              </button>
            </div>
          </div>
        )}

        {/* Debug utilities hidden in production */}

        {/* Process Button */}
        <div className="text-center">
          {selectedImage && selectedStyle && (
            <button
              onClick={processImage}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isProcessing 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isProcessing ? 'Processing...' : `Apply ${selectedStyle} Style with WASM`}
            </button>
          )}
        </div>

        {/* Result Display */}
        {result !== null && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <h3 className="text-lg font-medium text-green-800">Processing Complete!</h3>
            <p className="text-green-700">Applied <span className="font-semibold">{selectedStyle}</span> style to image</p>
            <p className="text-green-600 text-sm mt-1">File size: {result} bytes</p>
          </div>
        )}
      </div>
      
    </main>
  );
}