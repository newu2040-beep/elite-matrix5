export interface VideoMetadata {
  id: string;
  filename: string;
  filePath: string;
  fileSize: number;
  duration: number; // in seconds
  width: number;
  height: number;
  fps: number;
  videoCodec: string;
  audioCodec: string | null;
  pixelFormat: string;
  bitrate: number; // in bps
  aspectRatio: string;
  hasAudio: boolean;
  thumbnailUrl: string;
  streamUrl: string;
}

export type PresetType = 'balanced' | 'natural' | 'detail_recovery' | 'low_light' | 'maximum_quality' | 'cinema_master' | 'custom';

export type AspectRatioType = 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '21:9' | '2.39:1' | '4:3';

export type LutPresetType =
  | 'none'
  | 'teal_orange'
  | 'kodachrome'
  | 'fuji_eterna'
  | 'bleach_bypass'
  | 'moody_noir'
  | 'pastel_dream'
  | 'golden_hour'
  | 'cyber_neon'
  | 'desert_nomad'
  | 'nordic_cold'
  | 'emerald_lush'
  | 'rose_quartz'
  | 'tokyo_drift'
  | 'vintage_polaroid'
  | 'monochrome_silver'
  | 'matrix_code'
  | 'cinestill_800t'
  | 'custom';

export type SocialProfileType =
  | 'tiktok_reels'
  | 'youtube_4k'
  | 'youtube_shorts'
  | 'instagram_square'
  | 'instagram_portrait'
  | 'twitter_x'
  | 'cinematic_master'
  | 'custom';

export interface EnhancementSettings {
  preset: PresetType;
  socialProfile?: SocialProfileType;
  targetResolution: 'original' | '720p' | '1080p' | '1440p' | '4k' | 'custom';
  customWidth?: number;
  customHeight?: number;
  targetFps: 'preserve' | 24 | 25 | 30 | 50 | 60 | 90 | 120 | 'custom';
  customFps?: number;
  motionInterpolation: boolean;
  interpolationMode: 'motion_compensated' | 'blend' | 'standard';
  denoiseLevel: number; // 0 to 10
  sharpenLevel: number; // 0 to 10
  // Color Grading Tools (Real-time live preview)
  exposure: number; // -2.0 to 2.0 (EV, default 0)
  brightness: number; // -1.0 to 1.0 (default 0)
  contrast: number; // 0.5 to 2.0 (default 1)
  saturation: number; // 0.0 to 2.0 (default 1)
  vibrance: number; // -1.0 to 1.0 (default 0)
  temperature: number; // -100 to 100 (Cool to Warm, default 0)
  tint: number; // -100 to 100 (Green to Magenta, default 0)
  highlights: number; // -100 to 100 (default 0)
  shadows: number; // -100 to 100 (default 0)
  vignette: number; // 0 to 100 (percentage, default 0)
  hueShift?: number; // -180 to 180 degrees (default 0)
  sepia?: number; // 0 to 100 percentage (default 0)
  gamma?: number; // -50 to 50 (default 0)
  // LUT Filters
  lutPreset: LutPresetType;
  lutIntensity: number; // 0 to 100% (default 100)
  customLutUrl?: string;
  customLutName?: string;
  customLutPath?: string;
  // Aspect Ratio & Cropping
  aspectRatio: AspectRatioType;
  aspectRatioFit: 'crop' | 'pad';
  // High Quality Formats & Codecs
  codec: 'h264' | 'hevc' | 'prores' | 'vp9' | 'av1';
  container: 'mp4' | 'mov' | 'webm';
  bitrateMode: 'auto' | 'low' | 'medium' | 'high' | 'maximum' | 'prores_hq' | 'custom';
  customBitrateMbps?: number;
  // Video Trim & Cut
  trimActive?: boolean;
  trimStart?: number; // in seconds
  trimEnd?: number; // in seconds
  splitPoint?: number; // in seconds
  // Audio Mastering & High Quality Formats
  audioMode: 'preserve' | 'transcode' | 'remove';
  audioCodec: 'aac' | 'opus' | 'pcm';
  audioBitrateKbps: number;
  audioSampleRate?: 44100 | 48000 | 96000;
  audioChannels?: 'stereo' | 'mono' | '5.1';
  audioNormalization?: boolean; // EBU R128 (-14 LUFS)
  audioVocalBoost?: boolean; // Dialogue clarity
  audioBassPunch?: boolean; // Low-end warmth
  audioDeHum?: boolean; // 80Hz rumble cut
}

export type JobStatus = 'uploading' | 'queued' | 'processing' | 'finalizing' | 'completed' | 'failed' | 'cancelled';

export interface JobRecord {
  jobId: string;
  ownerUid: string;
  projectId: string;
  sourceVideo: VideoMetadata;
  settings: EnhancementSettings;
  status: JobStatus;
  stage: string;
  progress: number; // 0 to 100
  fps: number;
  speed: string;
  frame: number;
  totalFrames: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  exportId?: string;
}

export interface ExportRecord {
  exportId: string;
  ownerUid: string;
  projectId: string;
  jobId: string;
  downloadUrl: string;
  streamUrl: string;
  outputMetadata: VideoMetadata;
  settings: EnhancementSettings;
  createdAt: string;
  availabilityStatus: 'ready' | 'processing' | 'deleted';
}

export interface ProjectRecord {
  projectId: string;
  ownerUid: string;
  name: string;
  sourceMetadata: VideoMetadata;
  latestExport?: ExportRecord;
  latestJob?: JobRecord;
  thumbnailUrl: string;
  createdAt: string;
  updatedAt: string;
  deletionStatus: 'active' | 'deleted';
}

export interface ShareLinkRecord {
  shareId: string;
  ownerUid: string;
  exportId: string;
  accessPolicy: 'public' | 'unlisted' | 'restricted';
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
  exportData?: ExportRecord;
}
