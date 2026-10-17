import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoPlayer } from './VideoPlayer';
import { Eye, Layers, SplitSquareVertical } from 'lucide-react';

interface ComparisonSliderProps {
  sourceUrl: string;
  enhancedUrl?: string;
  filterStyle?: React.CSSProperties;
  overlayStyle?: React.CSSProperties;
  vignetteStyle?: React.CSSProperties;
  sourceLabel?: string;
  enhancedLabel?: string;
  aspectRatio?: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  sourceUrl,
  enhancedUrl,
  filterStyle,
  overlayStyle,
  vignetteStyle,
  sourceLabel = 'Raw Source',
  enhancedLabel = 'Graded Real-Time',
  aspectRatio = '16:9',
}) => {
  const [activeMode, setActiveMode] = useState<'source' | 'enhanced'>('enhanced');
  const [splitMode, setSplitMode] = useState(false);
  const [splitPos, setSplitPos] = useState(50); // percentage
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDrag = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPos(pct);
  }, []);

  const onTouchMove = (e: React.TouchEvent) => {
    if (splitMode && e.touches[0]) {
      handleDrag(e.touches[0].clientX);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (splitMode && e.buttons === 1) {
      handleDrag(e.clientX);
    }
  };

  let aspectStyle = '16 / 9';
  if (aspectRatio && aspectRatio.includes(':')) {
    const [w, h] = aspectRatio.split(':');
    aspectStyle = `${w} / ${h}`;
  } else if (aspectRatio && aspectRatio.includes('/')) {
    aspectStyle = aspectRatio;
  }

  // Target video URL for enhanced comparison (either rendered output or same source with real-time CSS/SVG filter)
  const targetEnhancedUrl = enhancedUrl || sourceUrl;

  return (
    <div className="space-y-2 select-none">
      {splitMode ? (
        /* Draggable Before/After Split Container */
        <div
          ref={containerRef}
          onTouchMove={onTouchMove}
          onMouseMove={onMouseMove}
          style={{ aspectRatio: aspectStyle }}
          className="relative w-full overflow-hidden rounded-2xl border border-[var(--border-subtle,#2b2b2b)] bg-black shadow-lg cursor-ew-resize touch-none"
        >
          {/* Enhanced/Graded video on bottom layer */}
          <div className="absolute inset-0 w-full h-full">
            <video
              src={targetEnhancedUrl}
              playsInline
              preload="auto"
              crossOrigin="anonymous"
              autoPlay
              loop
              muted
              style={filterStyle}
              className="w-full h-full object-contain pointer-events-none"
            />
            {overlayStyle && (
              <div className="absolute inset-0 pointer-events-none" style={overlayStyle} />
            )}
            {vignetteStyle && (
              <div className="absolute inset-0 pointer-events-none" style={vignetteStyle} />
            )}
          </div>

          {/* Original video clipped on top layer */}
          <div
            className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none z-10"
            style={{ width: `${splitPos}%` }}
          >
            <video
              src={sourceUrl}
              playsInline
              preload="auto"
              crossOrigin="anonymous"
              autoPlay
              loop
              muted
              style={{
                width: containerRef.current?.clientWidth || '100%',
                maxWidth: 'none',
                height: '100%',
              }}
              className="object-contain"
            />
          </div>

          {/* Draggable Vertical Divider Handle */}
          <div
            className="absolute inset-y-0 w-0.5 bg-[var(--accent,#C7F464)] pointer-events-none z-20 shadow-[0_0_8px_var(--accent-glow,rgba(199,244,100,0.8))]"
            style={{ left: `${splitPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--bg-primary,#171717)] border-2 border-[var(--accent,#C7F464)] flex items-center justify-center shadow-lg">
              <SplitSquareVertical className="w-4 h-4 text-[var(--accent,#C7F464)]" />
            </div>
          </div>

          {/* Clean Apple-style Labels */}
          <div className="absolute bottom-3 left-3 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded text-[10px] font-semibold text-white pointer-events-none z-30">
            {sourceLabel}
          </div>
          <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded text-[10px] font-semibold text-[var(--accent,#C7F464)] pointer-events-none z-30">
            {enhancedLabel}
          </div>
        </div>
      ) : (
        /* Segmented A/B Switcher Video */
        <div className="relative overflow-hidden rounded-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMode}
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.9 }}
              transition={{ duration: 0.12 }}
              className="relative"
            >
              <VideoPlayer
                src={activeMode === 'source' ? sourceUrl : targetEnhancedUrl}
                aspectRatio={aspectRatio}
                videoStyle={activeMode === 'enhanced' ? filterStyle : undefined}
                overlayStyle={activeMode === 'enhanced' ? overlayStyle : undefined}
                vignetteStyle={activeMode === 'enhanced' ? vignetteStyle : undefined}
              />
            </motion.div>
          </AnimatePresence>

          {/* Floating active label */}
          <div className="absolute top-3 left-3 px-2 py-1 bg-[var(--bg-primary,#171717)]/85 backdrop-blur-md border border-[var(--border-subtle,#3f3f3f)] rounded-lg text-[11px] font-semibold text-[var(--text-primary,#F5F4F0)] pointer-events-none z-30">
            {activeMode === 'source' ? sourceLabel : enhancedLabel}
          </div>
        </div>
      )}

      {/* Switcher & Split Toggle Controls */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl text-xs font-medium">
        <button
          type="button"
          onClick={() => {
            setSplitMode(false);
            setActiveMode('source');
          }}
          className={`py-2 px-2 rounded-lg min-h-[44px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            !splitMode && activeMode === 'source'
              ? 'bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] border border-[var(--border-strong,#383838)] shadow-sm font-semibold'
              : 'text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Original</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSplitMode(false);
            setActiveMode('enhanced');
          }}
          className={`py-2 px-2 rounded-lg min-h-[44px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            !splitMode && activeMode === 'enhanced'
              ? 'bg-[var(--bg-primary,#171717)] text-[var(--accent,#C7F464)] border border-[var(--accent-glow,rgba(199,244,100,0.5))] shadow-sm font-semibold'
              : 'text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[var(--accent,#C7F464)]" />
          <span>Real-Time</span>
        </button>

        <button
          type="button"
          onClick={() => setSplitMode((prev) => !prev)}
          className={`py-2 px-2 rounded-lg min-h-[44px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            splitMode
              ? 'bg-[var(--bg-primary,#171717)] text-[var(--accent,#C7F464)] border border-[var(--accent,#C7F464)]/50 shadow-sm font-semibold'
              : 'text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)]'
          }`}
        >
          <SplitSquareVertical className="w-3.5 h-3.5 text-[var(--accent,#C7F464)]" />
          <span>Split Screen</span>
        </button>
      </div>
    </div>
  );
};
