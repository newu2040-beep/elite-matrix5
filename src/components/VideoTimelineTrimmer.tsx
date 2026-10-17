import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Scissors, RotateCcw, Play, Pause, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface VideoTimelineTrimmerProps {
  duration: number; // in seconds
  trimStart: number;
  trimEnd: number;
  trimActive: boolean;
  onTrimChange: (start: number, end: number, active: boolean) => void;
  onSeek?: (time: number) => void;
  currentTime?: number;
}

export const VideoTimelineTrimmer: React.FC<VideoTimelineTrimmerProps> = ({
  duration,
  trimStart,
  trimEnd,
  trimActive,
  onTrimChange,
  onSeek,
  currentTime = 0,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'playhead' | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [splitPoint, setSplitPoint] = useState<number | null>(null);

  // Format seconds to mm:ss.cc
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00.0';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const currentDuration = Math.max(0.1, (trimActive ? trimEnd - trimStart : duration) || duration);

  // Calculate percentage positions
  const startPercent = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPercent = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handlePointerDown = (type: 'start' | 'end' | 'playhead', e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(type);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.(10); } catch {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;

    if (isDragging === 'start') {
      const newStart = Math.min(targetTime, trimEnd - 0.5);
      onTrimChange(Math.max(0, newStart), trimEnd, true);
      onSeek?.(newStart);
    } else if (isDragging === 'end') {
      const newEnd = Math.max(targetTime, trimStart + 0.5);
      onTrimChange(trimStart, Math.min(duration, newEnd), true);
      onSeek?.(newEnd);
    } else if (isDragging === 'playhead') {
      onSeek?.(targetTime);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(null);
    }
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    onSeek?.(targetTime);
  };

  // Set start to current playhead
  const handleSetStartToPlayhead = () => {
    const newStart = Math.min(currentTime, trimEnd - 0.5);
    onTrimChange(Math.max(0, newStart), trimEnd, true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.(15); } catch {}
    }
  };

  // Set end to current playhead
  const handleSetEndToPlayhead = () => {
    const newEnd = Math.max(currentTime, trimStart + 0.5);
    onTrimChange(trimStart, Math.min(duration, newEnd), true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.(15); } catch {}
    }
  };

  // Split at playhead
  const handleSplitAtPlayhead = () => {
    setSplitPoint(currentTime);
    setSplitMode(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.([20, 40, 20]); } catch {}
    }
  };

  // Choose segment after split
  const handleKeepSegment = (segment: 'head' | 'tail') => {
    if (splitPoint === null) return;
    if (segment === 'head') {
      onTrimChange(0, splitPoint, true);
      onSeek?.(0);
    } else {
      onTrimChange(splitPoint, duration, true);
      onSeek?.(splitPoint);
    }
    setSplitMode(false);
  };

  // Reset trim
  const handleResetTrim = () => {
    onTrimChange(0, duration, false);
    setSplitMode(false);
    setSplitPoint(null);
    onSeek?.(0);
  };

  return (
    <div className="bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl p-3.5 space-y-3">
      {/* Header with status & duration readout */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-[var(--accent,#C7F464)]" />
          <span className="font-semibold text-[var(--text-primary,#F5F4F0)]">
            {trimActive ? 'Trimmed Selection Active' : 'Trim & Split Timeline'}
          </span>
          {trimActive && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--accent-subtle,rgba(199,244,100,0.12))] text-[var(--accent,#C7F464)] font-bold">
              Trimmed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-tabular">
          <span className="text-[var(--text-muted,#888888)] text-[11px]">
            Output: <strong className="text-[var(--accent,#C7F464)] font-bold">{formatTime(currentDuration)}</strong> / {formatTime(duration)}
          </span>
          {trimActive && (
            <button
              type="button"
              onClick={handleResetTrim}
              className="text-[11px] text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Full</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Timeline Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-12 bg-[var(--bg-surface-elevated,#262626)] rounded-xl overflow-hidden cursor-pointer select-none border border-[var(--border-strong,#383838)]"
      >
        {/* Filmstrip tick pattern background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none flex justify-between px-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-[1px] h-full bg-white/40" />
          ))}
        </div>

        {/* Dimmed Out-of-bounds regions */}
        {trimActive && (
          <>
            <div
              className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none"
              style={{ width: `${startPercent}%` }}
            />
            <div
              className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none"
              style={{ width: `${100 - endPercent}%` }}
            />
          </>
        )}

        {/* Active In-Range Segment */}
        <div
          className={`absolute top-0 bottom-0 border-y-2 pointer-events-none ${
            trimActive
              ? 'border-[var(--accent,#C7F464)] bg-[var(--accent-subtle,rgba(199,244,100,0.1))]'
              : 'border-transparent'
          }`}
          style={{
            left: `${startPercent}%`,
            width: `${Math.max(1, endPercent - startPercent)}%`,
          }}
        />

        {/* Start (In-point) Handle */}
        <div
          onPointerDown={(e) => handlePointerDown('start', e)}
          className="absolute top-0 bottom-0 w-4 -ml-2 z-10 flex items-center justify-center cursor-ew-resize group"
          style={{ left: `${startPercent}%` }}
        >
          <div className="w-2.5 h-8 rounded-l-md bg-[var(--accent,#C7F464)] shadow-md group-hover:scale-110 transition-transform flex items-center justify-center">
            <div className="w-[1.5px] h-4 bg-[#121808]" />
          </div>
        </div>

        {/* End (Out-point) Handle */}
        <div
          onPointerDown={(e) => handlePointerDown('end', e)}
          className="absolute top-0 bottom-0 w-4 -ml-2 z-10 flex items-center justify-center cursor-ew-resize group"
          style={{ left: `${endPercent}%` }}
        >
          <div className="w-2.5 h-8 rounded-r-md bg-[var(--accent,#C7F464)] shadow-md group-hover:scale-110 transition-transform flex items-center justify-center">
            <div className="w-[1.5px] h-4 bg-[#121808]" />
          </div>
        </div>

        {/* Current Playhead Scrubber */}
        <div
          onPointerDown={(e) => handlePointerDown('playhead', e)}
          className="absolute top-0 bottom-0 w-3 -ml-1.5 z-20 flex flex-col items-center justify-between cursor-ew-resize pointer-events-auto"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-2 h-2 rotate-45 bg-white shadow-sm" />
          <div className="w-[2px] h-full bg-white shadow" />
          <div className="w-2 h-2 rotate-45 bg-white shadow-sm" />
        </div>

        {/* Split point visual indicator */}
        {splitPoint !== null && (
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-red-400 z-15 border-dashed"
            style={{ left: `${(splitPoint / duration) * 100}%` }}
          />
        )}
      </div>

      {/* Split Selection Prompt if active */}
      {splitMode && splitPoint !== null && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-red-300">
              Split at {formatTime(splitPoint)} — Choose Clip to Keep:
            </span>
            <button
              type="button"
              onClick={() => setSplitMode(false)}
              className="text-[10px] text-[var(--text-muted,#888888)] hover:text-white"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleKeepSegment('head')}
              className="py-1.5 px-2 rounded-lg bg-[var(--bg-surface-elevated,#252525)] hover:border-[var(--accent,#C7F464)] border border-[var(--border-subtle,#333)] text-xs font-semibold text-[var(--text-primary,#F5F4F0)] cursor-pointer"
            >
              Keep Part 1 (0:00 - {formatTime(splitPoint)})
            </button>
            <button
              type="button"
              onClick={() => handleKeepSegment('tail')}
              className="py-1.5 px-2 rounded-lg bg-[var(--bg-surface-elevated,#252525)] hover:border-[var(--accent,#C7F464)] border border-[var(--border-subtle,#333)] text-xs font-semibold text-[var(--text-primary,#F5F4F0)] cursor-pointer"
            >
              Keep Part 2 ({formatTime(splitPoint)} - {formatTime(duration)})
            </button>
          </div>
        </motion.div>
      )}

      {/* Quick Trim Action Bar */}
      <div className="grid grid-cols-4 gap-1.5 text-xs font-tabular">
        <button
          type="button"
          onClick={handleSetStartToPlayhead}
          className="p-1.5 rounded-lg bg-[var(--bg-surface-elevated,#252525)] border border-[var(--border-subtle,#2f2f2f)] hover:border-[var(--accent,#C7F464)] text-[11px] font-semibold text-[var(--text-primary,#F5F4F0)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
        >
          <span>[ Set Start</span>
        </button>

        <button
          type="button"
          onClick={handleSetEndToPlayhead}
          className="p-1.5 rounded-lg bg-[var(--bg-surface-elevated,#252525)] border border-[var(--border-subtle,#2f2f2f)] hover:border-[var(--accent,#C7F464)] text-[11px] font-semibold text-[var(--text-primary,#F5F4F0)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
        >
          <span>Set End ]</span>
        </button>

        <button
          type="button"
          onClick={handleSplitAtPlayhead}
          className="p-1.5 rounded-lg bg-[var(--bg-surface-elevated,#252525)] border border-[var(--border-subtle,#2f2f2f)] hover:border-[var(--accent,#C7F464)] text-[11px] font-semibold text-[var(--text-primary,#F5F4F0)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
        >
          <Scissors className="w-3 h-3 text-red-400" />
          <span>Split</span>
        </button>

        <button
          type="button"
          onClick={handleResetTrim}
          className="p-1.5 rounded-lg bg-[var(--bg-surface-elevated,#252525)] border border-[var(--border-subtle,#2f2f2f)] hover:border-[var(--accent,#C7F464)] text-[11px] font-semibold text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
