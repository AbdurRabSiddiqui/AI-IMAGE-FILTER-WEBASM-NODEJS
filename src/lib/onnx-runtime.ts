import * as ort from 'onnxruntime-web';
import { logger } from '@/lib/logger';

const sessionCache: Map<string, Promise<ort.InferenceSession>> = new Map();

export async function getOrtSession(modelPath: string): Promise<ort.InferenceSession> {
  if (!sessionCache.has(modelPath)) {
    sessionCache.set(
      modelPath,
      ort.InferenceSession.create(modelPath, { executionProviders: ['wasm'] })
    );
  }
  return sessionCache.get(modelPath)!;
}

export async function runOrt(
  modelPath: string,
  input: { data: Float32Array; dims: number[] }
): Promise<ort.Tensor> {
  try {
    logger.info('Creating/getting ORT session...', { modelPath });
    const session = await getOrtSession(modelPath);
    
    logger.info('Session created, preparing input...', { 
      inputNames: session.inputNames, 
      outputNames: session.outputNames,
      inputDims: input.dims
    });
    
    const inputName = session.inputNames[0];
    const feeds: Record<string, ort.Tensor> = {
      [inputName]: new ort.Tensor('float32', input.data, input.dims)
    };
    
    logger.info('Running inference...');
    const results = await session.run(feeds);
    
    const outputName = session.outputNames[0];
    const output = results[outputName];
    logger.info('ORT run complete', { outputDims: output.dims, outputSize: output.data.length });
    return output;
  } catch (error) {
    logger.error('ORT inference failed:', error as Error);
    throw error;
  }
}


