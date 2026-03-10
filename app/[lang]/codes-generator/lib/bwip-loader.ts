declare global {
  interface Window {
    bwipjs: any;
  }
}

let bwipjsLoaded = false;

export async function loadBwipJs(): Promise<void> {
  if (bwipjsLoaded || (typeof window !== "undefined" && window.bwipjs)) {
    return;
  }

  if (typeof window === "undefined") {
    throw new Error("bwip-js can only be loaded in browser environment");
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/bwip-js@3/dist/bwip-js-min.js";
    script.async = true;

    script.onload = () => {
      bwipjsLoaded = true;
      resolve();
    };

    script.onerror = () => {
      reject(new Error("Failed to load bwip-js"));
    };

    document.head.appendChild(script);
  });
}

export async function generateDataMatrix(
  text: string,
  canvas: HTMLCanvasElement,
): Promise<void> {
  await loadBwipJs();

  if (!window.bwipjs) {
    throw new Error("bwip-js not loaded");
  }

  return window.bwipjs.toCanvas(canvas, {
    bcid: "datamatrix",
    text: text,
    scale: 4, // Increased scale for better quality
    padding: 0,
    includetext: false,
  });
}
