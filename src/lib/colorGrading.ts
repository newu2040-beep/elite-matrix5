import { EnhancementSettings, LutPresetType, AspectRatioType } from '../types/video';

export interface LutDefinition {
  id: LutPresetType;
  name: string;
  category: 'Cinematic' | 'Vintage' | 'Creative' | 'Monochrome' | 'Natural';
  description: string;
  previewColor: string;
  // CSS filter approximations for real-time 0ms latency rendering
  cssFilter: (intensity: number) => string;
  // Extra overlay tint or gradient
  overlayStyle?: (intensity: number) => React.CSSProperties;
  // Backend FFmpeg filter mapping
  ffmpegFilter: (intensity: number) => string;
}

export const LUT_PRESETS: LutDefinition[] = [
  {
    id: 'none',
    name: 'Rec.709 Natural',
    category: 'Natural',
    description: 'Clean, neutral dynamic range preserving true colors.',
    previewColor: '#94A3B8',
    cssFilter: () => 'none',
    ffmpegFilter: () => '',
  },
  {
    id: 'teal_orange',
    name: 'Teal & Orange',
    category: 'Cinematic',
    description: 'Hollywood blockbuster look with rich skin tones and deep teal shadows.',
    previewColor: '#0EA5E9',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `contrast(${1 + 0.18 * p}) saturate(${1 + 0.25 * p}) hue-rotate(${-10 * p}deg)`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'color',
      background: `linear-gradient(135deg, rgba(14, 165, 233, ${0.18 * (intensity / 100)}), rgba(249, 115, 22, ${0.16 * (intensity / 100)}))`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=rs=${(0.15 * Number(p)).toFixed(2)}:gs=${(-0.05 * Number(p)).toFixed(2)}:bs=${(-0.15 * Number(p)).toFixed(2)}:rh=${(-0.1 * Number(p)).toFixed(2)}:gh=${(0.05 * Number(p)).toFixed(2)}:bh=${(0.18 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'kodachrome',
    name: 'Kodachrome 64',
    category: 'Vintage',
    description: 'Classic 1970s film stock with saturated reds, golden highlights, and warm contrast.',
    previewColor: '#F59E0B',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `sepia(${0.25 * p}) saturate(${1 + 0.3 * p}) contrast(${1 + 0.12 * p}) brightness(${1 + 0.04 * p})`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'soft-light',
      background: `rgba(245, 158, 11, ${0.15 * (intensity / 100)})`,
    }),
    ffmpegFilter: () => `curves=vintage`,
  },
  {
    id: 'fuji_eterna',
    name: 'Fuji Eterna',
    category: 'Cinematic',
    description: 'Soft pastel greens, gentle contrast roll-off, and subtle cinematic shadow compression.',
    previewColor: '#10B981',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `contrast(${1 - 0.08 * p}) saturate(${1 - 0.12 * p}) brightness(${1 + 0.05 * p})`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'color',
      background: `rgba(16, 185, 129, ${0.1 * (intensity / 100)})`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=gs=${(0.08 * Number(p)).toFixed(2)}:bs=${(0.04 * Number(p)).toFixed(2)}:rs=${(-0.04 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'bleach_bypass',
    name: 'Bleach Bypass',
    category: 'Creative',
    description: 'Retained silver emulsion look with high contrast, desaturated tones, and metallic edge.',
    previewColor: '#64748B',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `contrast(${1 + 0.35 * p}) saturate(${Math.max(0.2, 1 - 0.65 * p)}) brightness(${1 - 0.04 * p})`;
    },
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      const c = (1 + 0.35 * Number(p)).toFixed(2);
      const s = Math.max(0.2, 1 - 0.65 * Number(p)).toFixed(2);
      return `eq=contrast=${c}:saturation=${s}`;
    },
  },
  {
    id: 'moody_noir',
    name: 'Moody Noir',
    category: 'Monochrome',
    description: 'Fine art black and white with deep crushed blacks and luminous silver highlights.',
    previewColor: '#334155',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `grayscale(${p}) contrast(${1 + 0.3 * p}) brightness(${1 - 0.02 * p})`;
    },
    ffmpegFilter: (intensity) => {
      const p = intensity / 100;
      if (p >= 0.8) return `hue=s=0,eq=contrast=1.3`;
      return `eq=contrast=${(1 + 0.3 * p).toFixed(2)}:saturation=${(1 - p).toFixed(2)}`;
    },
  },
  {
    id: 'pastel_dream',
    name: 'Pastel Dream',
    category: 'Creative',
    description: 'Ethereal soft bloom with luminous pastel highlights and gentle romantic warmth.',
    previewColor: '#F472B6',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `brightness(${1 + 0.08 * p}) contrast(${1 - 0.06 * p}) saturate(${1 + 0.15 * p})`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'screen',
      background: `linear-gradient(45deg, rgba(244, 114, 182, ${0.12 * (intensity / 100)}), rgba(167, 139, 250, ${0.1 * (intensity / 100)}))`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=rh=${(0.1 * Number(p)).toFixed(2)}:bh=${(0.08 * Number(p)).toFixed(2)}:gh=${(0.02 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    category: 'Vintage',
    description: 'Radiant amber sunset glow with rich warm highlights and honeyed shadows.',
    previewColor: '#D97706',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `sepia(${0.3 * p}) saturate(${1 + 0.25 * p}) brightness(${1 + 0.03 * p})`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'color-burn',
      background: `rgba(217, 119, 6, ${0.12 * (intensity / 100)})`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=rs=${(0.18 * Number(p)).toFixed(2)}:gs=${(0.06 * Number(p)).toFixed(2)}:bs=${(-0.16 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Neon',
    category: 'Creative',
    description: 'Futuristic electric night with punchy violet accents and hyper-saturated cyan highlights.',
    previewColor: '#8B5CF6',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `contrast(${1 + 0.2 * p}) saturate(${1 + 0.45 * p}) hue-rotate(${15 * p}deg)`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'overlay',
      background: `linear-gradient(180deg, rgba(139, 92, 246, ${0.15 * (intensity / 100)}), rgba(6, 182, 212, ${0.12 * (intensity / 100)}))`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=rh=${(0.12 * Number(p)).toFixed(2)}:bh=${(0.25 * Number(p)).toFixed(2)}:gh=${(-0.08 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'desert_nomad',
    name: 'Desert Nomad',
    category: 'Vintage',
    description: 'Arid warmth with baked terracotta earth tones, bleached skies, and sun-kissed textures.',
    previewColor: '#EA580C',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `sepia(${0.2 * p}) contrast(${1 + 0.15 * p}) saturate(${1 - 0.1 * p})`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'multiply',
      background: `rgba(234, 88, 12, ${0.08 * (intensity / 100)})`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=rs=${(0.14 * Number(p)).toFixed(2)}:bs=${(-0.12 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'nordic_cold',
    name: 'Nordic Frost',
    category: 'Cinematic',
    description: 'Crisp Arctic blues, cool slate shadows, and pristine Scandinavian clarity.',
    previewColor: '#38BDF8',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `contrast(${1 + 0.12 * p}) saturate(${1 - 0.15 * p}) hue-rotate(${-15 * p}deg) brightness(${1 + 0.02 * p})`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'color',
      background: `linear-gradient(180deg, rgba(56, 189, 248, ${0.12 * (intensity / 100)}), rgba(99, 102, 241, ${0.08 * (intensity / 100)}))`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=bs=${(0.18 * Number(p)).toFixed(2)}:bh=${(0.12 * Number(p)).toFixed(2)}:rs=${(-0.1 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'emerald_lush',
    name: 'Emerald Lush',
    category: 'Natural',
    description: 'Vibrant organic greens, velvety foliage depth, and radiant natural vitality.',
    previewColor: '#059669',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `contrast(${1 + 0.08 * p}) saturate(${1 + 0.3 * p}) hue-rotate(${10 * p}deg)`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'soft-light',
      background: `rgba(5, 150, 105, ${0.14 * (intensity / 100)})`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=gs=${(0.16 * Number(p)).toFixed(2)}:gh=${(0.1 * Number(p)).toFixed(2)}:rs=${(-0.06 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'rose_quartz',
    name: 'Rose Quartz',
    category: 'Creative',
    description: 'Soft pastel pink undertones, champagne highlights, and creamy dreamy skin tones.',
    previewColor: '#FB7185',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `sepia(${0.15 * p}) contrast(${1 - 0.04 * p}) saturate(${1 + 0.18 * p}) brightness(${1 + 0.05 * p})`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'screen',
      background: `linear-gradient(135deg, rgba(251, 113, 133, ${0.14 * (intensity / 100)}), rgba(244, 114, 182, ${0.1 * (intensity / 100)}))`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=rh=${(0.14 * Number(p)).toFixed(2)}:bh=${(0.06 * Number(p)).toFixed(2)}:rs=${(0.08 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'tokyo_drift',
    name: 'Tokyo Cyber Drift',
    category: 'Creative',
    description: 'Hyper-saturated violet shadows, neon amber streetlights, and electric Japanese night vibe.',
    previewColor: '#C084FC',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `contrast(${1 + 0.22 * p}) saturate(${1 + 0.38 * p}) hue-rotate(${25 * p}deg)`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'overlay',
      background: `linear-gradient(135deg, rgba(192, 132, 252, ${0.18 * (intensity / 100)}), rgba(251, 146, 60, ${0.14 * (intensity / 100)}))`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=rs=${(0.12 * Number(p)).toFixed(2)}:bs=${(0.22 * Number(p)).toFixed(2)}:rh=${(0.18 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'vintage_polaroid',
    name: 'Polaroid 600',
    category: 'Vintage',
    description: 'Faded nostalgic warm whites, cyan shadows, and analog instant film warmth.',
    previewColor: '#F59E0B',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `sepia(${0.32 * p}) contrast(${1 - 0.08 * p}) brightness(${1 + 0.06 * p}) saturate(${1 + 0.1 * p})`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'soft-light',
      background: `rgba(245, 158, 11, ${0.18 * (intensity / 100)})`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=rs=${(0.15 * Number(p)).toFixed(2)}:gs=${(0.05 * Number(p)).toFixed(2)}:bh=${(-0.1 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'monochrome_silver',
    name: 'Silver Gelatin Fine Art',
    category: 'Monochrome',
    description: 'Museum-grade silver gelatin B&W with deep crushed blacks and luminous highlights.',
    previewColor: '#94A3B8',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `grayscale(${p}) contrast(${1 + 0.35 * p}) brightness(${1 - 0.03 * p})`;
    },
    ffmpegFilter: (intensity) => {
      const p = intensity / 100;
      return `hue=s=0,eq=contrast=${(1 + 0.35 * p).toFixed(2)}`;
    },
  },
  {
    id: 'matrix_code',
    name: 'Matrix Code Green',
    category: 'Creative',
    description: 'Phosphor green shadows, cool emerald highlights, and dark cybernetic mood.',
    previewColor: '#22C55E',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `contrast(${1 + 0.18 * p}) hue-rotate(${-35 * p}deg) saturate(${1 + 0.2 * p})`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'color',
      background: `rgba(34, 197, 94, ${0.16 * (intensity / 100)})`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=gs=${(0.25 * Number(p)).toFixed(2)}:gh=${(0.12 * Number(p)).toFixed(2)}:rs=${(-0.15 * Number(p)).toFixed(2)}`;
    },
  },
  {
    id: 'cinestill_800t',
    name: 'CineStill 800T',
    category: 'Cinematic',
    description: 'Tungsten-balanced night film stock with distinctive cool shadows and warm halation.',
    previewColor: '#38BDF8',
    cssFilter: (intensity) => {
      const p = intensity / 100;
      return `contrast(${1 + 0.15 * p}) hue-rotate(${-12 * p}deg) saturate(${1 + 0.15 * p})`;
    },
    overlayStyle: (intensity) => ({
      mixBlendMode: 'screen',
      background: `linear-gradient(180deg, rgba(56, 189, 248, ${0.12 * (intensity / 100)}), rgba(239, 68, 68, ${0.08 * (intensity / 100)}))`,
    }),
    ffmpegFilter: (intensity) => {
      const p = (intensity / 100).toFixed(2);
      return `colorbalance=bs=${(0.16 * Number(p)).toFixed(2)}:rh=${(0.12 * Number(p)).toFixed(2)}`;
    },
  },
];

/**
 * Computes live real-time CSS filter styles for the video player based on settings
 */
export function getRealtimeVideoFilter(settings: Partial<EnhancementSettings>): {
  filter: string;
  overlayStyle?: React.CSSProperties;
  vignetteStyle?: React.CSSProperties;
} {
  const parts: string[] = [];

  // Exposure & Brightness
  // Exposure 1 EV ~ +40% brightness
  const exposureMult = Math.pow(2, (settings.exposure || 0) * 0.5);
  const brightnessVal = Math.max(0, (1 + (settings.brightness || 0)) * exposureMult);
  if (Math.abs(brightnessVal - 1) > 0.005) {
    parts.push(`brightness(${brightnessVal.toFixed(3)})`);
  }

  // Contrast & Gamma
  const gammaBoost = (settings.gamma || 0) * 0.005;
  const contrastVal = (settings.contrast !== undefined ? settings.contrast : 1) + gammaBoost;
  if (Math.abs(contrastVal - 1) > 0.005) {
    parts.push(`contrast(${contrastVal.toFixed(3)})`);
  }

  // Saturation & Vibrance
  const baseSat = settings.saturation !== undefined ? settings.saturation : 1;
  const vibranceBoost = (settings.vibrance || 0) * 0.4;
  const finalSat = Math.max(0, baseSat + vibranceBoost);
  if (Math.abs(finalSat - 1) > 0.005) {
    parts.push(`saturate(${finalSat.toFixed(3)})`);
  }

  // Hue shift (degree rotation)
  const hueShift = settings.hueShift || 0;
  if (hueShift !== 0) {
    parts.push(`hue-rotate(${hueShift}deg)`);
  }

  // Sepia
  const sepiaVal = settings.sepia || 0;
  if (sepiaVal > 0) {
    parts.push(`sepia(${(sepiaVal / 100).toFixed(3)})`);
  }

  // Temperature (Warmth) & Tint
  // Positive temp -> warm amber / sepia shift
  // Negative temp -> cool cyan shift
  const temp = settings.temperature || 0;
  const tint = settings.tint || 0;
  if (temp > 0 && sepiaVal === 0) {
    parts.push(`sepia(${(temp * 0.004).toFixed(3)})`);
  }
  if (tint !== 0 || (temp < 0 && hueShift === 0)) {
    // Hue-rotate shift
    const hueDeg = (temp * -0.15 + tint * 0.25).toFixed(1);
    parts.push(`hue-rotate(${hueDeg}deg)`);
  }

  // Inbuilt LUT Filter
  const activeLut = LUT_PRESETS.find((l) => l.id === (settings.lutPreset || 'none'));
  let overlayStyle: React.CSSProperties | undefined;

  if (activeLut && activeLut.id !== 'none') {
    const intensity = settings.lutIntensity !== undefined ? settings.lutIntensity : 100;
    const lutCss = activeLut.cssFilter(intensity);
    if (lutCss && lutCss !== 'none') {
      parts.push(lutCss);
    }
    if (activeLut.overlayStyle) {
      overlayStyle = activeLut.overlayStyle(intensity);
    }
  }

  // Vignette overlay
  let vignetteStyle: React.CSSProperties | undefined;
  if (settings.vignette && settings.vignette > 0) {
    const vOpacity = (settings.vignette / 100) * 0.75;
    vignetteStyle = {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: `radial-gradient(circle at center, transparent 40%, rgba(0,0,0,${vOpacity.toFixed(2)}) 100%)`,
      zIndex: 2,
    };
  }

  return {
    filter: parts.length > 0 ? parts.join(' ') : 'none',
    overlayStyle,
    vignetteStyle,
  };
}

/**
 * Aspect Ratio geometry helper
 */
export const ASPECT_RATIOS: {
  id: AspectRatioType;
  label: string;
  sublabel: string;
  ratio: string;
  cssAspect: string;
}[] = [
  { id: 'original', label: 'Original', sublabel: 'Source', ratio: 'Native', cssAspect: 'auto' },
  { id: '16:9', label: '16:9', sublabel: 'YouTube / Widescreen', ratio: '16:9', cssAspect: '16 / 9' },
  { id: '9:16', label: '9:16', sublabel: 'TikTok / Reels / Shorts', ratio: '9:16', cssAspect: '9 / 16' },
  { id: '1:1', label: '1:1', sublabel: 'Square Feed', ratio: '1:1', cssAspect: '1 / 1' },
  { id: '4:5', label: '4:5', sublabel: 'Instagram Portrait', ratio: '4:5', cssAspect: '4 / 5' },
  { id: '21:9', label: '21:9', sublabel: 'Ultra-wide Cinematic', ratio: '21:9', cssAspect: '21 / 9' },
  { id: '2.39:1', label: '2.39:1', sublabel: 'Anamorphic Cinema', ratio: '2.39:1', cssAspect: '2.39 / 1' },
  { id: '4:3', label: '4:3', sublabel: 'Classic Academy', ratio: '4:3', cssAspect: '4 / 3' },
];
