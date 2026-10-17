import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  AlertCircle,
  RotateCcw,
  RotateCw,
  PictureInPicture,
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  aspectRatio?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  videoStyle?: React.CSSProperties;
  overlayStyle?: React.CSSProperties;
  vignetteStyle?: React.CSSProperties;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  aspectRatio = '16:9',
  autoPlay = false,
  loop = false,
  className = '',
  videoStyle,
  overlayStyle,
  vignetteStyle,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [pipSupported, setPipSupported] = useState(false);
  const [recentAction, setRecentAction] = useState<'play' | 'pause' | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined' && 'pictureInPictureEnabled' in document) {
      setPipSupported(document.pictureInPictureEnabled);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setRecentAction('play');
      setTimeout(() => setRecentAction(null), 600);
    };
    const handlePause = () => {
      setIsPlaying(false);
      setRecentAction('pause');
      setTimeout(() => setRecentAction(null), 600);
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      setHasError(false);
    };
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    let retried = false;
    const handleError = () => {
      if (!retried && video) {
        retried = true;
        const cleanSrc = src.split('?')[0];
        video.src = `${cleanSrc}?retry=${Date.now()}`;
        video.load();
        video.play().catch(() => {
          setHasError(true);
          setIsLoading(false);
        });
      } else {
        setHasError(true);
        setIsLoading(false);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
    };
  }, [src]);

  // Fluid auto-hide controls during playback
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isPlaying, currentTime]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleReloadStream = () => {
    setHasError(false);
    setIsLoading(true);
    if (videoRef.current) {
      // Add timestamp to bust any cached failed response
      const cleanSrc = src.split('?')[0];
      videoRef.current.src = `${cleanSrc}?t=${Date.now()}`;
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  const skipSeconds = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.min(Math.max(0, videoRef.current.currentTime + seconds), duration || 100);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP not available', e);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  let aspectStyle = '16 / 9';
  if (aspectRatio && aspectRatio.includes(':')) {
    const [w, h] = aspectRatio.split(':');
    aspectStyle = `${w} / ${h}`;
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-[#111111] overflow-hidden rounded-2xl border border-[#2b2b2b] select-none group shadow-lg ${className}`}
      style={{ aspectRatio: aspectStyle }}
      onClick={() => setShowControls((prev) => !prev)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        autoPlay={autoPlay}
        loop={loop}
        style={videoStyle}
        className="w-full h-full object-contain"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
      />

      {/* Real-time LUT Blend Overlay */}
      {overlayStyle && (
        <div className="absolute inset-0 pointer-events-none" style={overlayStyle} />
      )}

      {/* Real-time Vignette Overlay */}
      {vignetteStyle && (
        <div className="absolute inset-0 pointer-events-none" style={vignetteStyle} />
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
          <div className="w-9 h-9 rounded-full border-2 border-[#C7F464] border-t-transparent animate-spin" />
        </div>
      )}

      {/* Playback Error with Retry button */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 px-4 text-center z-20 space-y-2">
          <AlertCircle className="w-8 h-8 text-[#EF4444]" />
          <p className="text-sm font-semibold text-[#F5F4F0]">Unable to stream media</p>
          <p className="text-xs text-[#888888]">Network or format handshake issue.</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleReloadStream();
            }}
            className="mt-2 px-3.5 py-1.5 rounded-xl bg-[#C7F464] text-[#121808] font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:opacity-90 shadow-md"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Stream</span>
          </button>
        </div>
      )}

      {/* Floating Center Indicator Animation */}
      <AnimatePresence>
        {recentAction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center pointer-events-none border border-white/10"
          >
            {recentAction === 'play' ? (
              <Play className="w-7 h-7 text-[#C7F464] fill-current ml-0.5" />
            ) : (
              <Pause className="w-7 h-7 text-[#F5F4F0]" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Centered Play button when paused */}
      {!isPlaying && !isLoading && !hasError && !recentAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          aria-label="Play video"
          className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-[#171717]/85 backdrop-blur-md border border-[#3f3f3f] flex items-center justify-center text-[#F5F4F0] hover:scale-105 active:scale-95 transition-transform shadow-xl"
        >
          <Play className="w-6 h-6 ml-0.5 fill-current text-[#C7F464]" />
        </button>
      )}

      {/* Touch-Friendly Player Bottom Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-200 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrubber slider with fluid hover */}
        <div className="flex items-center gap-2 mb-2 px-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Video scrubber timeline"
            className="w-full cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-[#F5F4F0]">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="p-1 min-w-[38px] min-h-[38px] flex items-center justify-center hover:text-[#C7F464] transition-colors rounded-lg active:scale-90"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            {/* Quick skip 5s buttons */}
            <button
              onClick={() => skipSeconds(-5)}
              aria-label="Back 5 seconds"
              className="p-1 min-w-[34px] min-h-[34px] flex items-center justify-center text-[#888888] hover:text-[#F5F4F0] transition-colors rounded-lg active:scale-90"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => skipSeconds(5)}
              aria-label="Forward 5 seconds"
              className="p-1 min-w-[34px] min-h-[34px] flex items-center justify-center text-[#888888] hover:text-[#F5F4F0] transition-colors rounded-lg active:scale-90"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="p-1 min-w-[34px] min-h-[34px] flex items-center justify-center hover:text-[#C7F464] transition-colors rounded-lg active:scale-90"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-[#EF4444]" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <span className="font-tabular text-[11px] text-[#888888] ml-1">
              <span className="text-[#F5F4F0] font-medium">{formatTime(currentTime)}</span> / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {pipSupported && (
              <button
                onClick={togglePiP}
                aria-label="Picture in Picture"
                className="p-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-[#888888] hover:text-[#C7F464] transition-colors rounded-lg"
              >
                <PictureInPicture className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              aria-label="Toggle Fullscreen"
              className="p-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-[#888888] hover:text-[#C7F464] transition-colors rounded-lg active:scale-90"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
