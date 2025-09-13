// src/hooks/useWasm.ts
import { useState, useEffect } from "react";

type WasmModule = typeof import("@/wasm-math/wasm_math.js");

export default function useWasm() {
  const [wasm, setWasm] = useState<WasmModule | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function loadWasm() {
      try {
        const wasmModule = await import("@/wasm-math/wasm_math.js");
        await wasmModule.default();
        if (!cancelled) setWasm(wasmModule);
      } catch (err) {
        console.error("Failed to load WASM:", err);
      }
    }
    loadWasm();
    return () => {
      cancelled = true;
    };
  }, []);
  return wasm;
}