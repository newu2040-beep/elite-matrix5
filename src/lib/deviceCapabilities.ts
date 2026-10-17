import { useState, useEffect } from 'react';

export interface DeviceCapabilities {
  refreshRate: number; // e.g. 60, 90, 120, 144
  is120HzSupported: boolean;
  is90HzSupported: boolean;
  displayLabel: string;
  colorGamut: 'Display P3 (Wide Color)' | 'sRGB (Standard)';
  isHdrSupported: boolean;
  gpuRenderer: string;
  maxTextureSize: number;
  cpuCores: number;
  isMobile: boolean;
  isBenchmarking: boolean;
}

let cachedCapabilities: DeviceCapabilities | null = null;

export function measureScreenRefreshRate(): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      return resolve(60);
    }

    let frameCount = 0;
    let startTime = 0;
    const maxFrames = 75;
    const timestamps: number[] = [];

    const onFrame = (now: number) => {
      if (!startTime) startTime = now;
      timestamps.push(now);
      frameCount++;

      if (frameCount < maxFrames && now - startTime < 800) {
        requestAnimationFrame(onFrame);
      } else {
        // Calculate average delta between consecutive frames
        const deltas: number[] = [];
        for (let i = 1; i < timestamps.length; i++) {
          const delta = timestamps[i] - timestamps[i - 1];
          if (delta > 2 && delta < 50) {
            deltas.push(delta);
          }
        }

        if (deltas.length < 10) {
          return resolve(60);
        }

        // Median delta to reject drops
        deltas.sort((a, b) => a - b);
        const medianDelta = deltas[Math.floor(deltas.length / 2)];
        const measuredFps = 1000 / medianDelta;

        // Categorize into standard refresh rates
        let finalHz = 60;
        if (measuredFps >= 112) {
          finalHz = 120;
        } else if (measuredFps >= 82) {
          finalHz = 90;
        } else if (measuredFps >= 70) {
          finalHz = 75;
        } else {
          finalHz = 60;
        }
        resolve(finalHz);
      }
    };

    requestAnimationFrame(onFrame);
  });
}

export function detectDeviceHardware(): {
  colorGamut: 'Display P3 (Wide Color)' | 'sRGB (Standard)';
  isHdrSupported: boolean;
  gpuRenderer: string;
  maxTextureSize: number;
  cpuCores: number;
  isMobile: boolean;
} {
  let colorGamut: 'Display P3 (Wide Color)' | 'sRGB (Standard)' = 'sRGB (Standard)';
  let isHdrSupported = false;
  let gpuRenderer = 'Hardware Accelerated GPU';
  let maxTextureSize = 8192;
  const cpuCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;

  if (typeof window !== 'undefined') {
    if (window.matchMedia && window.matchMedia('(color-gamut: p3)').matches) {
      colorGamut = 'Display P3 (Wide Color)';
    }
    if (window.matchMedia && window.matchMedia('(dynamic-range: high)').matches) {
      isHdrSupported = true;
    }

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
      if (gl) {
        maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 8192;
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (renderer) gpuRenderer = renderer;
        }
      }
    } catch {
      // Fallback
    }
  }

  let isMobile = false;
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  }

  return { colorGamut, isHdrSupported, gpuRenderer, maxTextureSize, cpuCores, isMobile };
}

export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>(() => {
    if (cachedCapabilities) return cachedCapabilities;
    const hw = detectDeviceHardware();
    return {
      refreshRate: 60,
      is120HzSupported: false,
      is90HzSupported: false,
      displayLabel: '60Hz Standard Display',
      ...hw,
      isBenchmarking: true,
    };
  });

  useEffect(() => {
    if (cachedCapabilities) {
      setCapabilities(cachedCapabilities);
      return;
    }

    let isMounted = true;
    measureScreenRefreshRate().then((hz) => {
      if (!isMounted) return;
      const hw = detectDeviceHardware();
      const is120 = hz >= 115;
      const is90 = hz >= 85;

      let displayLabel = '60Hz Standard Display';
      if (is120) {
        displayLabel = '120Hz Apple ProMotion';
      } else if (is90) {
        displayLabel = '90Hz High Refresh Display';
      }

      const finalCap: DeviceCapabilities = {
        refreshRate: hz,
        is120HzSupported: is120,
        is90HzSupported: is90,
        displayLabel,
        ...hw,
        isBenchmarking: false,
      };

      cachedCapabilities = finalCap;
      setCapabilities(finalCap);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return capabilities;
}
