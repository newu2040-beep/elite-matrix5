import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EnhancementSettings, SocialProfileType } from '../types/video';
import { DeviceCapabilities } from '../lib/deviceCapabilities';
import {
  Sparkles,
  Zap,
  Check,
  X,
  Share2,
  Tv,
  Smartphone,
  Instagram,
  Twitter,
  Film,
  ShieldCheck,
  Monitor,
} from 'lucide-react';

interface SocialMediaAiOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceCaps: DeviceCapabilities;
  onApplyProfile: (newSettings: Partial<EnhancementSettings>, profileName: string) => void;
  currentSettings: EnhancementSettings;
}

interface SocialProfileConfig {
  id: SocialProfileType;
  title: string;
  platform: string;
  icon: string;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5' | '2.39:1';
  targetResolution: '1080p' | '1440p' | '4k';
  fps: 24 | 30 | 60 | 120;
  codec: 'h264' | 'hevc' | 'prores';
  container: 'mp4' | 'mov';
  audioBitrateKbps: number;
  audioNormalization: boolean;
  audioVocalBoost: boolean;
  description: string;
  colorPresetNotes: string;
}

export const SocialMediaAiOptimizerModal: React.FC<SocialMediaAiOptimizerModalProps> = ({
  isOpen,
  onClose,
  deviceCaps,
  onApplyProfile,
  currentSettings,
}) => {
  if (!isOpen) return null;

  // Determine hardware max safe resolution:
  // If display width/height or device limit is standard mobile, cap at 1080p or 1440p to prevent playback frame drops
  const hardwareMaxRes: '1080p' | '1440p' | '4k' =
    deviceCaps.maxTextureSize >= 8192 && !deviceCaps.isMobile
      ? '4k'
      : deviceCaps.maxTextureSize >= 4096
      ? '1440p'
      : '1080p';

  const PROFILES: SocialProfileConfig[] = [
    {
      id: 'tiktok_reels',
      title: 'TikTok & IG Reels',
      platform: 'TikTok / Instagram',
      icon: '📱',
      aspectRatio: '9:16',
      targetResolution: '1080p',
      fps: deviceCaps.refreshRate >= 60 ? 60 : 30,
      codec: 'h264',
      container: 'mp4',
      audioBitrateKbps: 320,
      audioNormalization: true,
      audioVocalBoost: true,
      description: '1080×1920 9:16 vertical fullscreen, calibrated vibrance & vocal clarity for mobile speakers.',
      colorPresetNotes: '+12% Vibrance, Dialogue Clarity Boost, EBU -14 LUFS',
    },
    {
      id: 'youtube_4k',
      title: 'YouTube 4K & Cinema',
      platform: 'YouTube',
      icon: '📺',
      aspectRatio: '16:9',
      // Hardware-safe resolution:
      targetResolution: hardwareMaxRes === '4k' ? '4k' : hardwareMaxRes,
      fps: deviceCaps.is120HzSupported ? 120 : 60,
      codec: 'hevc',
      container: 'mp4',
      audioBitrateKbps: 320,
      audioNormalization: true,
      audioVocalBoost: false,
      description: 'Ultra-crisp 16:9 widescreen with HEVC high efficiency & maximum dynamic detail.',
      colorPresetNotes: 'Detail Recovery, Sharpness 5/10, Rec.709 Natural',
    },
    {
      id: 'youtube_shorts',
      title: 'YouTube Shorts',
      platform: 'YouTube',
      icon: '⚡',
      aspectRatio: '9:16',
      targetResolution: '1080p',
      fps: 60,
      codec: 'h264',
      container: 'mp4',
      audioBitrateKbps: 320,
      audioNormalization: true,
      audioVocalBoost: true,
      description: 'High-bitrate vertical 9:16 optimized for instant buffering and high retention.',
      colorPresetNotes: 'Vibrant pop, contrast 1.08, high profile faststart',
    },
    {
      id: 'instagram_square',
      title: 'Instagram Feed (1:1)',
      platform: 'Instagram',
      icon: '📸',
      aspectRatio: '1:1',
      targetResolution: '1080p',
      fps: 30,
      codec: 'h264',
      container: 'mp4',
      audioBitrateKbps: 256,
      audioNormalization: true,
      audioVocalBoost: false,
      description: '1080×1080 square format with warm cinematic tone for grid aesthetic.',
      colorPresetNotes: 'Balanced Warmth, 30 FPS optimal for IG feed algorithm',
    },
    {
      id: 'instagram_portrait',
      title: 'Instagram Portrait (4:5)',
      platform: 'Instagram',
      icon: '🖼️',
      aspectRatio: '4:5',
      targetResolution: '1080p',
      fps: 30,
      codec: 'h264',
      container: 'mp4',
      audioBitrateKbps: 256,
      audioNormalization: true,
      audioVocalBoost: false,
      description: '1080×1350 portrait ratio taking up maximum vertical space in the mobile feed.',
      colorPresetNotes: 'Soft highlights roll-off, 4:5 vertical presence',
    },
    {
      id: 'twitter_x',
      title: 'X / Twitter HD',
      platform: 'X (Twitter)',
      icon: '🐦',
      aspectRatio: '16:9',
      targetResolution: '1080p',
      fps: 60,
      codec: 'h264',
      container: 'mp4',
      audioBitrateKbps: 192,
      audioNormalization: true,
      audioVocalBoost: true,
      description: 'Ultra-compatible H.264 profile to prevent Twitter compression degradation.',
      colorPresetNotes: 'Strict 1080p H.264 Level 4.2 compliance',
    },
    {
      id: 'cinematic_master',
      title: 'Apple ProRes 422 HQ Cinema',
      platform: 'Cinema / Film Festival',
      icon: '🎬',
      aspectRatio: '2.39:1',
      targetResolution: hardwareMaxRes === '4k' ? '4k' : '1440p',
      fps: 24,
      codec: 'prores',
      container: 'mov',
      audioBitrateKbps: 512,
      audioNormalization: false,
      audioVocalBoost: false,
      description: '2.39:1 Anamorphic scope with 24fps film cadence & uncompressed studio PCM audio.',
      colorPresetNotes: 'Teal & Orange grading, 10-bit YUV422, Lossless PCM',
    },
  ];

  const handleSelectProfile = (profile: SocialProfileConfig) => {
    // Check hardware safety:
    let safeRes = profile.targetResolution;
    if (safeRes === '4k' && hardwareMaxRes === '1080p') {
      safeRes = '1080p';
    }

    const newSettings: Partial<EnhancementSettings> = {
      socialProfile: profile.id,
      aspectRatio: profile.aspectRatio,
      aspectRatioFit: 'crop',
      targetResolution: safeRes,
      targetFps: profile.fps,
      codec: profile.codec,
      container: profile.container,
      bitrateMode: profile.codec === 'prores' ? 'prores_hq' : 'high',
      audioMode: 'transcode',
      audioCodec: profile.codec === 'prores' ? 'pcm' : 'aac',
      audioBitrateKbps: profile.audioBitrateKbps,
      audioNormalization: profile.audioNormalization,
      audioVocalBoost: profile.audioVocalBoost,
      motionInterpolation: profile.fps > 30,
      preset: 'custom',
    };

    if (profile.id === 'tiktok_reels' || profile.id === 'youtube_shorts') {
      newSettings.vibrance = 0.12;
      newSettings.contrast = 1.08;
      newSettings.exposure = 0.05;
    } else if (profile.id === 'cinematic_master') {
      newSettings.lutPreset = 'teal_orange';
      newSettings.lutIntensity = 85;
      newSettings.vignette = 15;
    }

    onApplyProfile(newSettings, profile.title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-[var(--bg-surface,#202020)] border border-[var(--border-strong,#383838)] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle,#2b2b2b)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[var(--accent,#C7F464)]" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary,#F5F4F0)]">Auto AI Social Media Optimizer</h3>
              <p className="text-[11px] text-[var(--text-muted,#888888)]">Hardware-validated encoding for every platform</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] hover:bg-[var(--bg-surface-elevated,#252525)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hardware Safety Verification Bar */}
        <div className="px-4 py-2.5 bg-[var(--bg-primary,#171717)] border-b border-[var(--border-subtle,#2b2b2b)] flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-[var(--accent,#C7F464)]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-semibold">Hardware Benchmark:</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-muted,#888888)] font-tabular">
            <span>Max Safe Res: <strong className="text-[var(--text-primary,#F5F4F0)]">{hardwareMaxRes.toUpperCase()}</strong></span>
            <span>•</span>
            <span>Display: <strong className="text-[var(--text-primary,#F5F4F0)]">{deviceCaps.refreshRate}Hz</strong></span>
          </div>
        </div>

        {/* Platform Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {PROFILES.map((profile) => {
            const isSelected = currentSettings.socialProfile === profile.id;

            return (
              <motion.button
                whileTap={{ scale: 0.98 }}
                key={profile.id}
                type="button"
                onClick={() => handleSelectProfile(profile)}
                className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? 'bg-[var(--accent-subtle,rgba(199,244,100,0.1))] border-[var(--accent,#C7F464)] shadow-md'
                    : 'bg-[var(--bg-primary,#171717)] border-[var(--border-subtle,#282828)] hover:border-[var(--border-strong,#3f3f3f)]'
                }`}
              >
                <div className="text-2xl p-1 bg-[var(--bg-surface-elevated,#252525)] rounded-xl shrink-0">
                  {profile.icon}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${isSelected ? 'text-[var(--accent,#C7F464)]' : 'text-[var(--text-primary,#F5F4F0)]'}`}>
                      {profile.title}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-surface-elevated,#252525)] text-[var(--accent,#C7F464)] font-tabular font-semibold">
                      {profile.aspectRatio} · {profile.fps} FPS
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted,#888888)] leading-relaxed">
                    {profile.description}
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-[10px] text-[var(--accent,#C7F464)] font-tabular">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated,#252525)]">
                      {profile.targetResolution.toUpperCase()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated,#252525)]">
                      {profile.codec.toUpperCase()}
                    </span>
                    <span className="text-[var(--text-muted,#888888)] truncate">
                      {profile.colorPresetNotes}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pt-1">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[var(--accent,#C7F464)] text-[#121808] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[var(--border-strong,#3f3f3f)]" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
