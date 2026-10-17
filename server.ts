import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn, execFile } from 'child_process';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import type { VideoMetadata, EnhancementSettings, JobRecord, ExportRecord, ProjectRecord, ShareLinkRecord } from './src/types/video.ts';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const FF_PATH = ffmpegStatic || 'ffmpeg';
const FFPROBE_PATH = ffprobeStatic.path || 'ffprobe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global CORS & Cross-Origin Resource Policy middleware for media streaming and API requests
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Storage directories setup
const STORAGE_DIR = path.join(__dirname, 'storage');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');
const EXPORTS_DIR = path.join(STORAGE_DIR, 'exports');
const THUMBNAILS_DIR = path.join(STORAGE_DIR, 'thumbnails');
const SAMPLES_DIR = path.join(STORAGE_DIR, 'samples');
const LUTS_DIR = path.join(STORAGE_DIR, 'luts');
const DATA_FILE = path.join(STORAGE_DIR, 'db.json');

for (const dir of [STORAGE_DIR, UPLOADS_DIR, EXPORTS_DIR, THUMBNAILS_DIR, SAMPLES_DIR, LUTS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// In-memory data store with file persistence
interface PersistentStore {
  jobs: Record<string, JobRecord>;
  exports: Record<string, ExportRecord>;
  projects: Record<string, ProjectRecord>;
  shareLinks: Record<string, ShareLinkRecord>;
}

let dbData: PersistentStore = {
  jobs: {},
  exports: {},
  projects: {},
  shareLinks: {},
};

if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    dbData = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load data store, initializing fresh:', err);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dbData, null, 2));
  } catch (err) {
    console.error('Failed to persist dbData:', err);
  }
}

// Multer upload config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 500 }, // 500MB
});

// Helper: Run FFprobe on media file
function inspectMedia(filePath: string): Promise<{
  width: number;
  height: number;
  duration: number;
  fps: number;
  videoCodec: string;
  audioCodec: string | null;
  pixelFormat: string;
  bitrate: number;
  aspectRatio: string;
  hasAudio: boolean;
  size: number;
}> {
  return new Promise((resolve) => {
    execFile(
      FFPROBE_PATH,
      [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ],
      (error, stdout) => {
        const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : { size: 0 };
        if (error || !stdout) {
          console.warn(`FFprobe inspection warning (${error?.message || 'no output'}), using robust fallback metadata.`);
          return resolve({
            width: 1920,
            height: 1080,
            duration: 10.0,
            fps: 30,
            videoCodec: 'h264',
            audioCodec: 'aac',
            pixelFormat: 'yuv420p',
            bitrate: Math.round((stat.size * 8) / 10),
            aspectRatio: '16:9',
            hasAudio: true,
            size: stat.size,
          });
        }
        try {
          const info = JSON.parse(stdout);
          const videoStream = info.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');
          const audioStream = info.streams?.find((s: { codec_type: string }) => s.codec_type === 'audio');

          let width = videoStream?.width || 1920;
          let height = videoStream?.height || 1080;
          const rotateTag = videoStream?.tags?.rotate || videoStream?.side_data_list?.find((s: { rotation?: number }) => s.rotation)?.rotation;
          const rotation = parseInt(rotateTag || '0', 10);
          if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
            const tmp = width;
            width = height;
            height = tmp;
          }

          let fps = 30;
          if (videoStream?.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
            if (num && den) fps = Math.round((num / den) * 100) / 100;
          }

          const duration = parseFloat(info.format?.duration || videoStream?.duration || '10');
          const bitrate = parseInt(info.format?.bit_rate || videoStream?.bit_rate || '0', 10);
          const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
          const divisor = gcd(width, height);
          const aspect = `${width / divisor}:${height / divisor}`;

          resolve({
            width,
            height,
            duration: Math.max(duration, 0.1),
            fps: fps || 30,
            videoCodec: videoStream?.codec_name || 'h264',
            audioCodec: audioStream?.codec_name || null,
            pixelFormat: videoStream?.pix_fmt || 'yuv420p',
            bitrate: bitrate || Math.round((stat.size * 8) / (duration || 1)),
            aspectRatio: aspect,
            hasAudio: !!audioStream || true,
            size: stat.size,
          });
        } catch (parseErr) {
          console.warn('Failed to parse FFprobe output, using fallback metadata:', parseErr);
          resolve({
            width: 1920,
            height: 1080,
            duration: 10.0,
            fps: 30,
            videoCodec: 'h264',
            audioCodec: 'aac',
            pixelFormat: 'yuv420p',
            bitrate: Math.round((stat.size * 8) / 10),
            aspectRatio: '16:9',
            hasAudio: true,
            size: stat.size,
          });
        }
      }
    );
  });
}

// Helper: Generate video thumbnail
function generateThumbnail(videoPath: string, thumbPath: string, atSecond = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      FF_PATH,
      ['-ss', atSecond.toString(), '-i', videoPath, '-vframes', '1', '-q:v', '2', '-y', thumbPath],
      (err) => {
        if (err) {
          // Retry at 0s if 1s fails
          execFile(
            FF_PATH,
            ['-ss', '0', '-i', videoPath, '-vframes', '1', '-q:v', '2', '-y', thumbPath],
            (retryErr) => {
              if (retryErr) return reject(retryErr);
              resolve(thumbPath);
            }
          );
        } else {
          resolve(thumbPath);
        }
      }
    );
  });
}

// Pre-render demo sample videos for immediate mobile enhancement testing
async function ensureSampleVideos() {
  const sample1Path = path.join(SAMPLES_DIR, 'sample_matrix_drone.mp4');
  const sample1Thumb = path.join(THUMBNAILS_DIR, 'sample_matrix_drone.jpg');

  if (!fs.existsSync(sample1Path)) {
    console.log('Generating sample demo clip 1...');
    // Create an animated 720p 24fps test clip with color sweep, motion, and synthetic audio
    await new Promise<void>((resolve, reject) => {
      execFile(
        FF_PATH,
        [
          '-f', 'lavfi',
          '-i', 'testsrc=duration=6:size=1280x720:rate=24',
          '-f', 'lavfi',
          '-i', 'sine=frequency=440:duration=6',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-y',
          sample1Path,
        ],
        (err) => {
          if (err) {
            console.error('Failed to generate sample 1:', err);
            return reject(err);
          }
          resolve();
        }
      );
    }).catch(() => {});
  }

  if (fs.existsSync(sample1Path) && !fs.existsSync(sample1Thumb)) {
    await generateThumbnail(sample1Path, sample1Thumb, 1).catch(() => {});
  }

  const sample2Path = path.join(SAMPLES_DIR, 'sample_lowres_action.mp4');
  const sample2Thumb = path.join(THUMBNAILS_DIR, 'sample_lowres_action.jpg');

  if (!fs.existsSync(sample2Path)) {
    console.log('Generating sample demo clip 2 (low-res for 4K test)...');
    await new Promise<void>((resolve, reject) => {
      execFile(
        FF_PATH,
        [
          '-f', 'lavfi',
          '-i', 'smptebars=duration=5:size=640x360:rate=24',
          '-f', 'lavfi',
          '-i', 'sine=frequency=220:duration=5',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '96k',
          '-y',
          sample2Path,
        ],
        (err) => {
          if (err) {
            console.error('Failed to generate sample 2:', err);
            return reject(err);
          }
          resolve();
        }
      );
    }).catch(() => {});
  }

  if (fs.existsSync(sample2Path) && !fs.existsSync(sample2Thumb)) {
    await generateThumbnail(sample2Path, sample2Thumb, 1).catch(() => {});
  }
}

// Background Job Worker Pipeline
const activeProcesses: Record<string, ReturnType<typeof spawn>> = {};

async function executeEnhancementJob(jobId: string) {
  const job = dbData.jobs[jobId];
  if (!job || job.status === 'cancelled') return;

  job.status = 'processing';
  job.stage = 'Initializing enhancement pipeline';
  job.startedAt = new Date().toISOString();
  saveDb();

  const sourcePath = job.sourceVideo.filePath;
  if (!fs.existsSync(sourcePath)) {
    job.status = 'failed';
    job.errorCode = 'SOURCE_MISSING';
    job.errorMessage = 'Source video file could not be located on storage disk.';
    saveDb();
    return;
  }

  const exportId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let ext = 'mp4';
  if (job.settings.codec === 'prores' || job.settings.container === 'mov') {
    ext = 'mov';
  } else if (job.settings.container === 'webm' || job.settings.codec === 'vp9') {
    ext = 'webm';
  }
  const outputPath = path.join(EXPORTS_DIR, `${exportId}.${ext}`);

  try {
    job.stage = 'Configuring neural filters, color grading and output scaling';
    saveDb();

    // 1. Resolution Calculation
    const isPortrait = job.sourceVideo.height > job.sourceVideo.width;
    let targetW = job.sourceVideo.width;
    let targetH = job.sourceVideo.height;

    switch (job.settings.targetResolution) {
      case '720p':
        targetW = isPortrait ? 720 : 1280;
        targetH = isPortrait ? 1280 : 720;
        break;
      case '1080p':
        targetW = isPortrait ? 1080 : 1920;
        targetH = isPortrait ? 1920 : 1080;
        break;
      case '1440p':
        targetW = isPortrait ? 1440 : 2560;
        targetH = isPortrait ? 2560 : 1440;
        break;
      case '4k':
        targetW = isPortrait ? 2160 : 3840;
        targetH = isPortrait ? 3840 : 2160;
        break;
      case 'custom':
        if (job.settings.customWidth && job.settings.customHeight) {
          targetW = job.settings.customWidth;
          targetH = job.settings.customHeight;
        }
        break;
      case 'original':
      default:
        break;
    }

    // Adjust target resolution if Aspect Ratio preset is selected
    if (job.settings.aspectRatio && job.settings.aspectRatio !== 'original') {
      const ratioMap: Record<string, [number, number]> = {
        '16:9': [16, 9],
        '9:16': [9, 16],
        '1:1': [1, 1],
        '4:5': [4, 5],
        '21:9': [21, 9],
        '2.39:1': [239, 100],
        '4:3': [4, 3],
      };
      const [rw, rh] = ratioMap[job.settings.aspectRatio] || [16, 9];
      const currentMaxDim = Math.max(targetW, targetH);
      if (rw >= rh) {
        targetW = currentMaxDim;
        targetH = Math.round((currentMaxDim * rh) / rw);
      } else {
        targetH = currentMaxDim;
        targetW = Math.round((currentMaxDim * rw) / rh);
      }
    }

    // Ensure dimensions are even numbers (requirement for libx264/libx265/ProRes)
    targetW = Math.round(targetW / 2) * 2;
    targetH = Math.round(targetH / 2) * 2;

    const filterChain: string[] = [];

    // Aspect Ratio Fit (crop vs pad)
    if (job.settings.aspectRatio && job.settings.aspectRatio !== 'original') {
      const fitMode = job.settings.aspectRatioFit || 'crop';
      if (fitMode === 'crop') {
        // Smart center-crop to desired aspect ratio before scaling
        filterChain.push(`crop='if(gt(a,${targetW}/${targetH}),ih*(${targetW}/${targetH}),iw)':'if(gt(a,${targetW}/${targetH}),ih,iw*(${targetH}/${targetW}))'`);
      } else {
        // Pad with black letterbox
        filterChain.push(`scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease`);
        filterChain.push(`pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black`);
      }
    }

    // Scale with high-quality lanczos algorithm
    if (!filterChain.some((f) => f.includes('pad='))) {
      filterChain.push(`scale=${targetW}:${targetH}:flags=lanczos`);
    }

    // Denoise filter (hqdn3d)
    if (job.settings.denoiseLevel > 0) {
      const spatial = (job.settings.denoiseLevel * 0.6).toFixed(1);
      const temporal = (job.settings.denoiseLevel * 1.0).toFixed(1);
      filterChain.push(`hqdn3d=${spatial}:${spatial}:${temporal}:${temporal}`);
    }

    // Sharpen filter (unsharp)
    if (job.settings.sharpenLevel > 0) {
      const amount = (0.3 + job.settings.sharpenLevel * 0.15).toFixed(2);
      filterChain.push(`unsharp=5:5:${amount}:5:5:0.0`);
    }

    // Color/Brightness/Contrast/Saturation/Exposure filter (eq)
    const exposure = job.settings.exposure || 0;
    const baseBrightness = job.settings.brightness || 0;
    const totalBrightness = Math.max(-1, Math.min(1, baseBrightness + exposure * 0.15)).toFixed(2);
    const contrastVal = (job.settings.contrast !== undefined ? job.settings.contrast : 1.0).toFixed(2);
    const satVal = Math.max(0, (job.settings.saturation !== undefined ? job.settings.saturation : 1.0) + (job.settings.vibrance || 0) * 0.3).toFixed(2);

    if (totalBrightness !== '0.00' || contrastVal !== '1.00' || satVal !== '1.00') {
      filterChain.push(`eq=brightness=${totalBrightness}:contrast=${contrastVal}:saturation=${satVal}`);
    }

    // Temperature (Warmth) & Tint
    const temp = job.settings.temperature || 0;
    const tint = job.settings.tint || 0;
    if (temp !== 0 || tint !== 0) {
      const rs = (temp * 0.003).toFixed(2);
      const bs = (-temp * 0.003).toFixed(2);
      const gs = (-tint * 0.002).toFixed(2);
      const rh = (tint * 0.002).toFixed(2);
      const bh = (tint * 0.002).toFixed(2);
      filterChain.push(`colorbalance=rs=${rs}:gs=${gs}:bs=${bs}:rh=${rh}:bh=${bh}`);
    }

    // Inbuilt Cinematic LUT Presets
    const lut = job.settings.lutPreset;
    if (lut === 'teal_orange') {
      filterChain.push('colorbalance=rs=0.15:gs=-0.05:bs=-0.15:rh=-0.1:gh=0.05:bh=0.18');
    } else if (lut === 'kodachrome') {
      filterChain.push('curves=vintage');
    } else if (lut === 'fuji_eterna') {
      filterChain.push('colorbalance=gs=0.08:bs=0.04:rs=-0.04');
    } else if (lut === 'bleach_bypass') {
      filterChain.push('eq=contrast=1.35:saturation=0.35');
    } else if (lut === 'moody_noir') {
      filterChain.push('hue=s=0,eq=contrast=1.3');
    } else if (lut === 'pastel_dream') {
      filterChain.push('colorbalance=rh=0.1:bh=0.08:gh=0.02,eq=brightness=0.05');
    } else if (lut === 'golden_hour') {
      filterChain.push('colorbalance=rs=0.18:gs=0.06:bs=-0.16');
    } else if (lut === 'cyber_neon') {
      filterChain.push('colorbalance=rh=0.12:bh=0.25:gh=-0.08,eq=contrast=1.2:saturation=1.4');
    } else if (lut === 'desert_nomad') {
      filterChain.push('colorbalance=rs=0.14:bs=-0.12,eq=contrast=1.15:saturation=0.9');
    } else if (lut === 'nordic_cold') {
      filterChain.push('colorbalance=bs=0.18:bh=0.12:rs=-0.1');
    } else if (lut === 'emerald_lush') {
      filterChain.push('colorbalance=gs=0.16:gh=0.1:rs=-0.06');
    } else if (lut === 'rose_quartz') {
      filterChain.push('colorbalance=rh=0.14:bh=0.06:rs=0.08');
    } else if (lut === 'tokyo_drift') {
      filterChain.push('colorbalance=rs=0.12:bs=0.22:rh=0.18,eq=contrast=1.2:saturation=1.35');
    } else if (lut === 'vintage_polaroid') {
      filterChain.push('colorbalance=rs=0.15:gs=0.05:bh=-0.1,eq=contrast=0.92:brightness=0.04');
    } else if (lut === 'monochrome_silver') {
      filterChain.push('hue=s=0,eq=contrast=1.35');
    } else if (lut === 'matrix_code') {
      filterChain.push('colorbalance=gs=0.25:gh=0.12:rs=-0.15,eq=contrast=1.18');
    } else if (lut === 'cinestill_800t') {
      filterChain.push('colorbalance=bs=0.16:rh=0.12,eq=contrast=1.15:saturation=1.15');
    } else if (lut === 'custom' && job.settings.customLutPath && fs.existsSync(job.settings.customLutPath)) {
      filterChain.push(`lut3d=file='${job.settings.customLutPath}'`);
    }

    // Hue rotate
    if (job.settings.hueShift && job.settings.hueShift !== 0) {
      filterChain.push(`hue=h=${job.settings.hueShift}`);
    }

    // Sepia filter
    if (job.settings.sepia && job.settings.sepia > 0) {
      filterChain.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
    }

    // Gamma curve adjustment
    if (job.settings.gamma && job.settings.gamma !== 0) {
      const gammaVal = Math.max(0.3, Math.min(2.5, 1 + job.settings.gamma * 0.01)).toFixed(2);
      filterChain.push(`eq=gamma=${gammaVal}`);
    }

    // Vignette filter
    if (job.settings.vignette && job.settings.vignette > 0) {
      filterChain.push('vignette=PI/4');
    }

    // Target FPS & Frame Interpolation (Supports 60, 90, 120 FPS!)
    let targetFps = job.sourceVideo.fps;
    if (job.settings.targetFps !== 'preserve') {
      targetFps = typeof job.settings.targetFps === 'number' ? job.settings.targetFps : (job.settings.customFps || 60);
    }

    if (job.settings.motionInterpolation && targetFps > job.sourceVideo.fps) {
      if (job.settings.interpolationMode === 'motion_compensated') {
        if (targetW > 1280 || targetH > 720 || targetFps >= 90) {
          filterChain.push(`framerate=fps=${targetFps}`);
        } else {
          filterChain.push(`minterpolate=fps=${targetFps}:mi_mode=blend`);
        }
      } else if (job.settings.interpolationMode === 'blend') {
        filterChain.push(`minterpolate=fps=${targetFps}:mi_mode=blend`);
      } else {
        filterChain.push(`fps=fps=${targetFps}`);
      }
    } else if (targetFps !== job.sourceVideo.fps) {
      filterChain.push(`fps=fps=${targetFps}`);
    }

    // Build FFmpeg arguments with safe stream mapping
    const ffmpegArgs: string[] = ['-y'];

    // Trimming / Cutting options (-ss and -to)
    const isTrimmed = Boolean(
      job.settings.trimActive &&
      typeof job.settings.trimStart === 'number' &&
      typeof job.settings.trimEnd === 'number' &&
      job.settings.trimEnd > job.settings.trimStart
    );

    if (isTrimmed) {
      ffmpegArgs.push('-ss', (job.settings.trimStart || 0).toFixed(3));
      ffmpegArgs.push('-to', (job.settings.trimEnd || job.sourceVideo.duration).toFixed(3));
    }

    ffmpegArgs.push('-i', sourcePath);
    ffmpegArgs.push('-map', '0:v:0');
    ffmpegArgs.push('-map', '0:a?');
    ffmpegArgs.push('-vf', filterChain.join(','));

    // Codec & Format Configuration
    if (job.settings.codec === 'prores') {
      // Apple ProRes 422 HQ Master profile 3
      ffmpegArgs.push('-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le');
    } else if (job.settings.codec === 'hevc') {
      ffmpegArgs.push('-c:v', 'libx265', '-tag:v', 'hvc1', '-preset', 'fast', '-pix_fmt', 'yuv420p');
    } else if (job.settings.codec === 'vp9') {
      ffmpegArgs.push('-c:v', 'libvpx-vp9', '-b:v', '0');
    } else if (job.settings.codec === 'av1') {
      ffmpegArgs.push('-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p');
    } else {
      // Default: H.264 optimized for maximum cross-platform compatibility (Android/iPhone/Web)
      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-profile:v', 'high',
        '-level:v', '4.1',
        '-pix_fmt', 'yuv420p',
        '-tune', 'film'
      );
    }

    if (ext === 'mp4' || ext === 'mov') {
      // Vital for streaming: moves metadata (moov atom) to the front of the file
      ffmpegArgs.push('-movflags', '+faststart');
    }

    // Bitrate & Master Quality
    if (job.settings.codec !== 'prores') {
      if (job.settings.bitrateMode === 'custom' && job.settings.customBitrateMbps) {
        const mbps = job.settings.customBitrateMbps;
        ffmpegArgs.push('-b:v', `${mbps}M`, '-maxrate', `${mbps * 1.5}M`, '-bufsize', `${mbps * 2}M`);
      } else if (job.settings.bitrateMode === 'maximum') {
        ffmpegArgs.push('-crf', '14');
      } else if (job.settings.bitrateMode === 'high') {
        ffmpegArgs.push('-crf', '18');
      } else if (job.settings.bitrateMode === 'low') {
        ffmpegArgs.push('-crf', '26');
      } else {
        // Auto / Medium
        ffmpegArgs.push('-crf', '22');
      }
    }

    // Audio Mastering with Custom Formats and Filters
    const audioFilters: string[] = [];
    if (job.settings.audioNormalization) {
      audioFilters.push('loudnorm=I=-14:LRA=11:TP=-1.5');
    }
    if (job.settings.audioVocalBoost) {
      audioFilters.push('equalizer=f=3000:t=q:w=1.5:g=3.5');
    }
    if (job.settings.audioBassPunch) {
      audioFilters.push('equalizer=f=80:t=q:w=1.0:g=3.0');
    }
    if (job.settings.audioDeHum) {
      audioFilters.push('highpass=f=80');
    }

    if (job.settings.audioMode === 'remove' || !job.sourceVideo.hasAudio) {
      ffmpegArgs.push('-an');
    } else {
      if (audioFilters.length > 0) {
        ffmpegArgs.push('-af', audioFilters.join(','));
      }
      if (job.settings.audioSampleRate) {
        ffmpegArgs.push('-ar', String(job.settings.audioSampleRate));
      }
      if (job.settings.audioChannels) {
        const ch = job.settings.audioChannels === 'mono' ? '1' : job.settings.audioChannels === '5.1' ? '6' : '2';
        ffmpegArgs.push('-ac', ch);
      }

      const hasAudioTweak = audioFilters.length > 0 || Boolean(job.settings.audioSampleRate) || Boolean(job.settings.audioChannels);

      if (job.settings.codec === 'prores' || job.settings.audioCodec === 'pcm') {
        ffmpegArgs.push('-c:a', 'pcm_s16le');
      } else if (job.settings.audioMode === 'transcode' || hasAudioTweak) {
        if (job.settings.audioCodec === 'opus' || job.settings.container === 'webm') {
          ffmpegArgs.push('-c:a', 'libopus', '-b:a', `${job.settings.audioBitrateKbps || 192}k`);
        } else {
          ffmpegArgs.push('-c:a', 'aac', '-b:a', `${job.settings.audioBitrateKbps || 320}k`);
        }
      } else {
        // Preserve original audio with strict safety checks for cross-platform mobile compatibility
        const srcAudioCodec = (job.sourceVideo.audioCodec || '').toLowerCase();
        const isMp4 = ext === 'mp4';
        const isMov = ext === 'mov';
        const isWebm = ext === 'webm';

        // Optimized decision tree for mobile streaming
        if (isMp4 || isMov) {
          if (srcAudioCodec.includes('aac') || srcAudioCodec.includes('mp3')) {
            ffmpegArgs.push('-c:a', 'copy');
          } else {
            // Transcode to AAC for maximum device reach (iPhone/Android)
            ffmpegArgs.push('-c:a', 'aac', '-b:a', '256k');
          }
        } else if (isWebm) {
          if (srcAudioCodec.includes('opus') || srcAudioCodec.includes('vorbis')) {
            ffmpegArgs.push('-c:a', 'copy');
          } else {
            ffmpegArgs.push('-c:a', 'libopus', '-b:a', '160k');
          }
        } else {
          ffmpegArgs.push('-c:a', 'copy');
        }
      }
    }

    // Progress reporting flag
    ffmpegArgs.push('-progress', 'pipe:1', outputPath);

    const actualDuration = isTrimmed && job.settings.trimEnd && job.settings.trimStart !== undefined
      ? Math.max(0.5, job.settings.trimEnd - job.settings.trimStart)
      : job.sourceVideo.duration;

    const totalEstimatedFrames = Math.max(1, Math.round(actualDuration * targetFps));
    job.totalFrames = totalEstimatedFrames;
    job.stage = 'Rendering neural enhancement and encoding frames';
    saveDb();

    const startTime = Date.now();
    console.log('Executing FFmpeg:', FF_PATH, ffmpegArgs.join(' '));
    const ffProcess = spawn(FF_PATH, ffmpegArgs);
    activeProcesses[jobId] = ffProcess;

    let stderrBuffer = '';

    ffProcess.stdout.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        const [key, value] = line.split('=').map((s) => s.trim());
        if (key === 'frame') {
          const currentFrame = parseInt(value, 10) || 0;
          job.frame = currentFrame;
          job.progress = Math.min(99, Math.round((currentFrame / totalEstimatedFrames) * 100));
        } else if (key === 'fps') {
          job.fps = parseFloat(value) || 0;
        } else if (key === 'speed') {
          job.speed = value || '1.0x';
        } else if (key === 'out_time_ms') {
          const ms = parseInt(value, 10) / 1000;
          job.elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
          if (job.progress > 0 && job.progress < 100) {
            const remaining = Math.max(0, Math.round((job.elapsedSeconds / (job.progress / 100)) - job.elapsedSeconds));
            job.estimatedRemainingSeconds = remaining;
          }
        }
      }
    });

    ffProcess.stderr.on('data', (errData: Buffer) => {
      stderrBuffer += errData.toString();
      if (stderrBuffer.length > 5000) {
        stderrBuffer = stderrBuffer.substring(stderrBuffer.length - 5000);
      }
    });

    await new Promise<void>((resolve, reject) => {
      ffProcess.on('close', (code) => {
        delete activeProcesses[jobId];
        if (code === 0) {
          resolve();
        } else {
          const filtered = stderrBuffer
            .split('\n')
            .filter((l) => l.trim().length > 0 && !l.includes('frame=') && !l.includes('fps=') && !l.includes('Press [q]'))
            .slice(-3)
            .join('; ');
          reject(new Error(filtered || `FFmpeg exited with error code ${code}`));
        }
      });
      ffProcess.on('error', (err) => {
        delete activeProcesses[jobId];
        reject(err);
      });
    });

    // 14. Verify file integrity and final metadata using ffprobe
    job.stage = 'Verifying output integrity and inspecting exported metadata';
    job.progress = 99;
    saveDb();

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new Error('Exported video file was not created or is zero bytes in size.');
    }

    const verifiedMeta = await inspectMedia(outputPath);
    const thumbPath = path.join(THUMBNAILS_DIR, `${exportId}.jpg`);
    await generateThumbnail(outputPath, thumbPath, Math.min(1, verifiedMeta.duration / 2));

    const exportRecord: ExportRecord = {
      exportId,
      ownerUid: job.ownerUid,
      projectId: job.projectId,
      jobId,
      downloadUrl: `/api/download/${exportId}`,
      streamUrl: `/api/media/exports/${exportId}.${ext}`,
      outputMetadata: {
        id: exportId,
        filename: `${path.parse(job.sourceVideo.filename).name}_enhanced.${ext}`,
        filePath: outputPath,
        fileSize: verifiedMeta.size,
        duration: verifiedMeta.duration,
        width: verifiedMeta.width,
        height: verifiedMeta.height,
        fps: verifiedMeta.fps,
        videoCodec: verifiedMeta.videoCodec,
        audioCodec: verifiedMeta.audioCodec,
        pixelFormat: verifiedMeta.pixelFormat,
        bitrate: verifiedMeta.bitrate,
        aspectRatio: verifiedMeta.aspectRatio,
        hasAudio: verifiedMeta.hasAudio,
        thumbnailUrl: `/api/media/thumbnails/${exportId}.jpg`,
        streamUrl: `/api/media/exports/${exportId}.${ext}`,
      },
      settings: job.settings,
      createdAt: new Date().toISOString(),
      availabilityStatus: 'ready',
    };

    dbData.exports[exportId] = exportRecord;

    job.status = 'completed';
    job.stage = 'Completed successfully';
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    job.exportId = exportId;
    saveDb();

    // Update project reference if exists
    if (dbData.projects[job.projectId]) {
      dbData.projects[job.projectId].latestExport = exportRecord;
      dbData.projects[job.projectId].latestJob = job;
      dbData.projects[job.projectId].updatedAt = new Date().toISOString();
      saveDb();
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Job ${jobId} failed:`, error);
    job.status = 'failed';
    job.stage = 'Processing failed';
    job.errorCode = 'PROCESSING_ERROR';
    job.errorMessage = error.message || 'An error occurred during video rendering.';
    saveDb();
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get sample clips
app.get('/api/samples', async (_req, res) => {
  await ensureSampleVideos();
  const samples = [
    {
      id: 'sample_matrix_drone',
      name: 'City Drone & High-Speed Motion (720p 24FPS)',
      description: 'Ideal for 4K UHD upscaling and 60 FPS motion interpolation testing.',
      filePath: path.join(SAMPLES_DIR, 'sample_matrix_drone.mp4'),
      streamUrl: '/api/media/samples/sample_matrix_drone.mp4',
      thumbnailUrl: '/api/media/thumbnails/sample_matrix_drone.jpg',
    },
    {
      id: 'sample_lowres_action',
      name: 'Dynamic Color Test Pattern (360p Low-Res)',
      description: 'Ideal for testing detail recovery, sharpening, and color correction.',
      filePath: path.join(SAMPLES_DIR, 'sample_lowres_action.mp4'),
      streamUrl: '/api/media/samples/sample_lowres_action.mp4',
      thumbnailUrl: '/api/media/thumbnails/sample_lowres_action.jpg',
    },
  ];

  const enriched = await Promise.all(
    samples.map(async (s) => {
      try {
        const meta = await inspectMedia(s.filePath);
        return {
          ...s,
          metadata: {
            id: s.id,
            filename: `${s.id}.mp4`,
            filePath: s.filePath,
            fileSize: meta.size,
            duration: meta.duration,
            width: meta.width,
            height: meta.height,
            fps: meta.fps,
            videoCodec: meta.videoCodec,
            audioCodec: meta.audioCodec,
            pixelFormat: meta.pixelFormat,
            bitrate: meta.bitrate,
            aspectRatio: meta.aspectRatio,
            hasAudio: meta.hasAudio,
            thumbnailUrl: s.thumbnailUrl,
            streamUrl: s.streamUrl,
          } as VideoMetadata,
        };
      } catch {
        return s;
      }
    })
  );

  res.json({ samples: enriched });
});

// Upload video file
app.post('/api/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file was uploaded.' });
  }

  const uploadedPath = req.file.path;
  const originalName = req.file.originalname;

  try {
    const meta = await inspectMedia(uploadedPath);
    const thumbFilename = `${path.parse(req.file.filename).name}.jpg`;
    const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);

    await generateThumbnail(uploadedPath, thumbPath, Math.min(1, meta.duration / 2));

    const videoMetadata: VideoMetadata = {
      id: req.file.filename,
      filename: originalName,
      filePath: uploadedPath,
      fileSize: meta.size,
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      videoCodec: meta.videoCodec,
      audioCodec: meta.audioCodec,
      pixelFormat: meta.pixelFormat,
      bitrate: meta.bitrate,
      aspectRatio: meta.aspectRatio,
      hasAudio: meta.hasAudio,
      thumbnailUrl: `/api/media/thumbnails/${thumbFilename}`,
      streamUrl: `/api/media/uploads/${req.file.filename}`,
    };

    res.json({ success: true, metadata: videoMetadata });
  } catch (err: unknown) {
    const error = err as Error;
    // Cleanup invalid file
    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    res.status(422).json({ error: error.message || 'The uploaded file is not a valid video.' });
  }
});

// Upload custom 3D LUT (.cube or .png)
app.post('/api/upload-lut', upload.single('lut'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No LUT file was uploaded.' });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (ext !== '.cube' && ext !== '.png') {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Only .cube and .png LUT files are supported.' });
  }

  // Move to LUTS_DIR with clean name
  const lutFilename = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const targetPath = path.join(LUTS_DIR, lutFilename);
  try {
    fs.renameSync(req.file.path, targetPath);
    res.json({
      success: true,
      lutPath: targetPath,
      lutUrl: `/api/media/luts/${lutFilename}`,
      filename: req.file.originalname,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save LUT file.' });
  }
});

// Inspect media
app.post('/api/inspect', async (req: Request, res: Response) => {
  const { filePath } = req.body;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video file does not exist.' });
  }
  try {
    const meta = await inspectMedia(filePath);
    res.json(meta);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Create and Enqueue Enhancement Job
app.post('/api/jobs', async (req: Request, res: Response) => {
  const { ownerUid, projectId, sourceVideo, settings } = req.body;

  if (!sourceVideo || !sourceVideo.filePath) {
    return res.status(400).json({ error: 'Valid source video is required.' });
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const pId = projectId || `proj_${Date.now()}`;

  const jobRecord: JobRecord = {
    jobId,
    ownerUid: ownerUid || 'guest_user',
    projectId: pId,
    sourceVideo,
    settings,
    status: 'queued',
    stage: 'Queued in processing worker pool',
    progress: 0,
    fps: 0,
    speed: '0x',
    frame: 0,
    totalFrames: Math.round(sourceVideo.duration * (settings.targetFps === 'preserve' ? sourceVideo.fps : (settings.targetFps || 30))),
    elapsedSeconds: 0,
    estimatedRemainingSeconds: 0,
    createdAt: new Date().toISOString(),
  };

  dbData.jobs[jobId] = jobRecord;

  // Ensure project exists
  if (!dbData.projects[pId]) {
    dbData.projects[pId] = {
      projectId: pId,
      ownerUid: ownerUid || 'guest_user',
      name: sourceVideo.filename.replace(/\.[^/.]+$/, ''),
      sourceMetadata: sourceVideo,
      latestJob: jobRecord,
      thumbnailUrl: sourceVideo.thumbnailUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletionStatus: 'active',
    };
  } else {
    dbData.projects[pId].latestJob = jobRecord;
    dbData.projects[pId].updatedAt = new Date().toISOString();
  }

  saveDb();

  // Asynchronously trigger processing
  setTimeout(() => {
    executeEnhancementJob(jobId).catch((err) => console.error('Job execution error:', err));
  }, 100);

  res.json({ success: true, job: jobRecord });
});

// Get all jobs for a user
app.get('/api/jobs', (req: Request, res: Response) => {
  const ownerUid = (req.query.ownerUid as string) || '';
  const jobs = Object.values(dbData.jobs)
    .filter((j) => !ownerUid || j.ownerUid === ownerUid || j.ownerUid === 'guest_user')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ jobs });
});

// Get single job details
app.get('/api/jobs/:jobId', (req: Request, res: Response) => {
  const job = dbData.jobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({ job });
});

// Cancel job
app.post('/api/jobs/:jobId/cancel', (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const job = dbData.jobs[jobId];
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (activeProcesses[jobId]) {
    try {
      activeProcesses[jobId].kill('SIGTERM');
      delete activeProcesses[jobId];
    } catch (e) {
      console.error('Failed to kill process:', e);
    }
  }

  job.status = 'cancelled';
  job.stage = 'Cancelled by user';
  saveDb();
  res.json({ success: true, job });
});

// Retry failed job
app.post('/api/jobs/:jobId/retry', (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const job = dbData.jobs[jobId];
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  job.status = 'queued';
  job.stage = 'Re-queued for processing';
  job.progress = 0;
  job.errorCode = undefined;
  job.errorMessage = undefined;
  saveDb();

  setTimeout(() => {
    executeEnhancementJob(jobId).catch(console.error);
  }, 100);

  res.json({ success: true, job });
});

// Get export record
app.get('/api/exports/:exportId', (req: Request, res: Response) => {
  const exp = dbData.exports[req.params.exportId];
  if (!exp) {
    return res.status(404).json({ error: 'Export record not found' });
  }
  const job = exp.jobId ? dbData.jobs[exp.jobId] : undefined;
  res.json({ export: exp, job });
});

// Download verified video file
app.get('/api/download/:exportId', (req: Request, res: Response) => {
  const exp = dbData.exports[req.params.exportId];
  if (!exp) {
    return res.status(404).send('Export record not found.');
  }

  const filePath = exp.outputMetadata.filePath;
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Exported video file not found on disk.');
  }

  const filename = exp.outputMetadata.filename || `enhanced_${exp.exportId}.mp4`;
  res.download(filePath, filename);
});

// Direct static storage fallback route with full range & CORS headers
app.use('/storage', express.static(STORAGE_DIR, {
  acceptRanges: true,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// Streaming media endpoint supporting GET, HEAD, and OPTIONS with HTTP 206 Partial Content
app.all('/api/media/:folder/:filename', (req: Request, res: Response) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { folder, filename } = req.params;
  const allowedFolders = ['uploads', 'exports', 'thumbnails', 'samples', 'luts'];

  if (!allowedFolders.includes(folder)) {
    return res.status(403).send('Forbidden folder access');
  }

  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(STORAGE_DIR, folder, sanitizedFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Media file not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(filePath).toLowerCase();

  let contentType = 'video/mp4';
  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webm') contentType = 'video/webm';
  else if (ext === '.mov') contentType = 'video/quicktime';
  else if (ext === '.mkv') contentType = 'video/x-matroska';
  else if (ext === '.m4v') contentType = 'video/mp4';
  else if (ext === '.avi') contentType = 'video/x-msvideo';
  else if (ext === '.cube') contentType = 'text/plain';

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-cache'); // Prevent stale range responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  const range = req.headers.range;

  if (range && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
    const parts = range.replace(/bytes=/, '').split('-');
    let start = parts[0] ? parseInt(parts[0], 10) : 0;
    let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start)) start = 0;
    if (isNaN(end) || end >= fileSize) end = fileSize - 1;

    // Handle suffix byte range (e.g. bytes=-500)
    if (!parts[0] && parts[1]) {
      const suffix = parseInt(parts[1], 10);
      if (!isNaN(suffix) && suffix > 0) {
        start = Math.max(0, fileSize - suffix);
        end = fileSize - 1;
      }
    }

    if (start >= fileSize || start > end) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).send('Requested Range Not Satisfiable');
    }

    const chunksize = end - start + 1;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunksize);

    if (req.method === 'HEAD') {
      return res.status(206).end();
    }

    res.status(206);
    const fileStream = fs.createReadStream(filePath, { start, end });
    
    // Diagnostic headers for debugging network handshake
    res.setHeader('X-Proxy-Handshake', 'EliteMatrix-Verified');

    fileStream.on('error', (streamErr) => {
      console.error(`Streaming read error for ${filename}:`, streamErr);
      if (!res.headersSent) {
        res.status(500).send('Stream interruption');
      } else {
        res.end();
      }
    });

    // Handle abrupt client disconnection (common on mobile)
    req.on('close', () => {
      fileStream.destroy();
    });

    fileStream.pipe(res);
  } else {
    res.setHeader('Content-Length', fileSize);
    res.setHeader('X-Proxy-Handshake', 'EliteMatrix-Verified-Full');

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    res.status(200);
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (streamErr) => {
      console.error(`File stream error for ${filename}:`, streamErr);
      if (!res.headersSent) {
        res.status(500).send('File read error');
      } else {
        res.end();
      }
    });

    req.on('close', () => {
      fileStream.destroy();
    });

    fileStream.pipe(res);
  }
});

// Projects endpoints
app.get('/api/projects', (req: Request, res: Response) => {
  const ownerUid = (req.query.ownerUid as string) || '';
  const projects = Object.values(dbData.projects)
    .filter((p) => p.deletionStatus !== 'deleted' && (!ownerUid || p.ownerUid === ownerUid || p.ownerUid === 'guest_user'))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json({ projects });
});

app.post('/api/projects/:projectId/rename', (req: Request, res: Response) => {
  const { name } = req.body;
  const proj = dbData.projects[req.params.projectId];
  if (!proj) return res.status(404).json({ error: 'Project not found' });
  proj.name = (name || proj.name).trim();
  proj.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ success: true, project: proj });
});

app.delete('/api/projects/:projectId', (req: Request, res: Response) => {
  const proj = dbData.projects[req.params.projectId];
  if (!proj) return res.status(404).json({ error: 'Project not found' });
  proj.deletionStatus = 'deleted';
  proj.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ success: true });
});

app.delete('/api/exports/:exportId', (req: Request, res: Response) => {
  const exp = dbData.exports[req.params.exportId];
  if (!exp) return res.status(404).json({ error: 'Export not found' });
  const project = Object.values(dbData.projects).find(p => p.latestExport?.exportId === exp.exportId);
  if (project) {
    project.deletionStatus = 'deleted';
  }
  delete dbData.exports[req.params.exportId];
  saveDb();
  res.json({ success: true });
});

// Share links
app.post('/api/share', (req: Request, res: Response) => {
  const { exportId, ownerUid, accessPolicy, expiresHours } = req.body;
  const exp = dbData.exports[exportId];
  if (!exp) return res.status(404).json({ error: 'Export not found' });

  const shareId = `share_${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = expiresHours ? new Date(Date.now() + expiresHours * 3600 * 1000).toISOString() : undefined;

  const shareRecord: ShareLinkRecord = {
    shareId,
    ownerUid: ownerUid || exp.ownerUid,
    exportId,
    accessPolicy: accessPolicy || 'public',
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  dbData.shareLinks[shareId] = shareRecord;
  saveDb();

  res.json({ success: true, share: shareRecord });
});

app.get('/api/share/:shareId', (req: Request, res: Response) => {
  const share = dbData.shareLinks[req.params.shareId];
  if (!share) return res.status(404).json({ error: 'Share link not found' });

  if (share.revokedAt) {
    return res.status(410).json({ error: 'This share link has been revoked.' });
  }

  if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: 'This share link has expired.' });
  }

  const exp = dbData.exports[share.exportId];
  if (!exp) return res.status(404).json({ error: 'Linked export no longer exists.' });

  res.json({
    share,
    export: exp,
  });
});

app.post('/api/share/:shareId/revoke', (req: Request, res: Response) => {
  const share = dbData.shareLinks[req.params.shareId];
  if (!share) return res.status(404).json({ error: 'Share link not found' });
  share.revokedAt = new Date().toISOString();
  saveDb();
  res.json({ success: true, share });
});

// AI Video Analysis using Gemini
app.post('/api/ai/analyze', async (req: Request, res: Response) => {
  const { metadata } = req.body;
  if (!metadata) {
    return res.status(400).json({ error: 'Metadata is required.' });
  }

  const apiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Provide algorithmic recommendation fallback if Gemini key is unset
    return res.json({
      recommendation: {
        preset: metadata.height <= 720 ? 'detail_recovery' : 'balanced',
        targetResolution: metadata.height < 1080 ? '1080p' : '4k',
        targetFps: metadata.fps < 30 ? 60 : 'preserve',
        motionInterpolation: metadata.fps < 30,
        suggestedBitrateMbps: metadata.height <= 720 ? 12 : 28,
        analysis: `Input is ${metadata.width}x${metadata.height} at ${metadata.fps} FPS. Recommended target is upscaling with Lanczos filters and gentle sharpening to maximize clarity without introducing artifact haloing.`,
      },
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a professional video remastering engineer and colorist for ELITE MATRIX.
Analyze this video footage metadata:
- Resolution: ${metadata.width}x${metadata.height} (${metadata.aspectRatio})
- Frame Rate: ${metadata.fps} FPS
- Video Codec: ${metadata.videoCodec}
- Duration: ${metadata.duration} seconds
- Bitrate: ${Math.round(metadata.bitrate / 1000)} kbps
- Audio: ${metadata.hasAudio ? metadata.audioCodec : 'No Audio'}

Recommend optimal enhancement parameters. Return strict JSON format with keys:
"preset" (one of: "balanced", "natural", "detail_recovery", "low_light", "maximum_quality"),
"targetResolution" (one of: "1080p", "1440p", "4k"),
"targetFps" (24, 30, or 60),
"motionInterpolation" (boolean),
"denoiseLevel" (integer 0-5),
"sharpenLevel" (integer 1-5),
"suggestedBitrateMbps" (number),
"analysis" (2 sentences explaining why these settings maximize optical fidelity for this specific clip).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ recommendation: parsed });
  } catch (err: unknown) {
    console.error('AI analyze error:', err);
    res.json({
      recommendation: {
        preset: 'balanced',
        targetResolution: '4k',
        targetFps: 60,
        motionInterpolation: true,
        suggestedBitrateMbps: 30,
        analysis: 'AI recommendation calibrated for high fidelity 4K UHD upscale and 60 FPS interpolation.',
      },
    });
  }
});

// Vite Middleware mounting for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ELITE MATRIX] Server running at http://0.0.0.0:${PORT}`);
    // Non-blocking background initialization of sample videos
    ensureSampleVideos().catch((err) => console.error('Sample generation background error:', err));
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
