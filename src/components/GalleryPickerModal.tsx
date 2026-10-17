import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoMetadata } from '../types/video';
import {
  FolderOpen,
  Camera,
  Film,
  HardDrive,
  Upload,
  X,
  Check,
  Sparkles,
  Info,
  Clock,
  Layers,
} from 'lucide-react';

interface GalleryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (video: VideoMetadata) => void;
  currentVideoId?: string;
  sampleClips: { id: string; name: string; description: string; metadata?: VideoMetadata }[];
  onUploadFile: (file: File) => Promise<void>;
  isUploading: boolean;
}

export const GalleryPickerModal: React.FC<GalleryPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectVideo,
  currentVideoId,
  sampleClips,
  onUploadFile,
  isUploading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'device' | 'samples' | 'info'>('device');
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleNativePicker = async () => {
    // If modern File System Access API is supported, use showOpenFilePicker
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as unknown as { showOpenFilePicker: (opt: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
          types: [
            {
              description: 'Video Files',
              accept: {
                'video/*': ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi'],
              },
            },
          ],
          multiple: false,
        });
        if (handle) {
          const file = await handle.getFile();
          await onUploadFile(file);
          onClose();
        }
        return;
      } catch (err) {
        // User cancelled or fallback
        if ((err as Error).name !== 'AbortError') {
          fileInputRef.current?.click();
        }
        return;
      }
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadFile(file);
      onClose();
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      await onUploadFile(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-[var(--bg-surface,#202020)] border border-[var(--border-strong,#383838)] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle,#2b2b2b)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-4 h-4 text-[var(--accent,#C7F464)]" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary,#F5F4F0)]">Gallery & Media Access</h3>
              <p className="text-[11px] text-[var(--text-muted,#888888)]">Full device gallery & studio clips</p>
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border-subtle,#2b2b2b)] px-4 bg-[var(--bg-primary,#171717)] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('device')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'device'
                ? 'border-[var(--accent,#C7F464)] text-[var(--accent,#C7F464)]'
                : 'border-transparent text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Device Storage</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`py-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'samples'
                ? 'border-[var(--accent,#C7F464)] text-[var(--accent,#C7F464)]'
                : 'border-transparent text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Studio Clips ({sampleClips.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'device' && (
            <div className="space-y-3">
              {/* Drag and Drop / Picker Box */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={handleNativePicker}
                className={`p-6 border-2 border-dashed rounded-2xl text-center flex flex-col items-center justify-center space-y-3 transition-colors cursor-pointer ${
                  dragActive
                    ? 'border-[var(--accent,#C7F464)] bg-[var(--accent-subtle,rgba(199,244,100,0.08))]'
                    : 'border-[var(--border-strong,#383838)] hover:border-[var(--accent,#C7F464)]/70 bg-[var(--bg-primary,#171717)]'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[var(--bg-surface-elevated,#262626)] flex items-center justify-center text-[var(--accent,#C7F464)] shadow-sm">
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-[var(--accent,#C7F464)] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)]">
                    {isUploading ? 'Extracting Technical Metadata...' : 'Tap to Access Device Video Gallery'}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted,#888888)]">
                    Supports MP4, MOV (ProRes), WebM, MKV up to 8K
                  </p>
                </div>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Action Buttons for Mobile Camera & Filesystem */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleNativePicker}
                  disabled={isUploading}
                  className="p-3 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] hover:border-[var(--accent,#C7F464)] flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-primary,#F5F4F0)] cursor-pointer transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-[var(--accent,#C7F464)]" />
                  <span>Choose Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-3 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] hover:border-[var(--accent,#C7F464)] flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-primary,#F5F4F0)] cursor-pointer transition-colors"
                >
                  <Camera className="w-4 h-4 text-[var(--accent,#C7F464)]" />
                  <span>Record Video</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="space-y-2">
              <p className="text-[11px] text-[var(--text-muted,#888888)]">
                Studio reference clips with diverse dynamic ranges and camera profiles:
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {sampleClips.map((sample) => {
                  const isCurrent = sample.metadata?.id === currentVideoId;
                  const meta = sample.metadata;

                  return (
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      key={sample.id}
                      onClick={() => {
                        if (meta) {
                          onSelectVideo(meta);
                          onClose();
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-[var(--accent-subtle,rgba(199,244,100,0.1))] border-[var(--accent,#C7F464)] shadow-sm'
                          : 'bg-[var(--bg-primary,#171717)] border-[var(--border-subtle,#282828)] hover:border-[var(--border-strong,#3f3f3f)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)] truncate">
                            {sample.name}
                          </p>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-muted,#888888)] line-clamp-1">
                          {sample.description}
                        </p>
                        {meta && (
                          <div className="flex items-center gap-2 text-[10px] text-[var(--accent,#C7F464)] font-tabular">
                            <span>{meta.width}×{meta.height}</span>
                            <span>•</span>
                            <span>{meta.fps} FPS</span>
                            <span>•</span>
                            <span>{meta.duration.toFixed(1)}s</span>
                            <span>•</span>
                            <span>{(meta.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isCurrent ? (
                          <Check className="w-4 h-4 text-[var(--accent,#C7F464)] stroke-[3]" />
                        ) : (
                          <Film className="w-4 h-4 text-[var(--text-muted,#888888)]" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
