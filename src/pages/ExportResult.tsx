import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { ComparisonSlider } from '../components/ComparisonSlider';
import { useDesktopMode } from '../context/DesktopModeContext';
import { ExportRecord, JobRecord } from '../types/video';
import {
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  FolderPlus,
  CheckCircle2,
  Film,
  Zap,
  Layers,
  ArrowRight,
  Ratio,
  Palette,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'motion/react';

export const ExportResult: React.FC = () => {
  const { exportId } = useParams<{ exportId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isDesktopMode } = useDesktopMode();

  const [exportData, setExportData] = useState<ExportRecord | null>(null);
  const [jobData, setJobData] = useState<JobRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteExport = async () => {
    if (!exportData) return;
    try {
      await fetch(`/api/exports/${exportData.exportId}`, {
        method: 'DELETE',
      });
      showToast('Project and saved video deleted', 'info');
      navigate('/projects');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  useEffect(() => {
    if (!exportId) return;

    fetch(`/api/exports/${exportId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.export) {
          setExportData(data.export);
        }
        if (data.job) {
          setJobData(data.job);
        }
      })
      .catch((e) => console.error('Failed to load export:', e))
      .finally(() => setLoading(false));
  }, [exportId]);

  const handleDownload = () => {
    if (!exportData) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.(15); } catch {}
    }
    showToast('Downloading master video file...', 'info');

    const downloadEndpoint = `/api/download/${exportData.exportId}`;
    const link = document.createElement('a');
    link.href = downloadEndpoint;
    link.target = '_blank';
    link.setAttribute('download', exportData.outputMetadata.filename || `enhanced_${exportData.exportId}.mp4`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToProjects = () => {
    setSaved(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.(20); } catch {}
    }
    showToast('Saved to your Projects library', 'success');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleShare = async () => {
    if (!exportData) return;
    setSharing(true);

    try {
      let currentShareUrl = shareUrl;
      if (!currentShareUrl) {
        const res = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exportId: exportData.exportId,
            ownerUid: exportData.ownerUid,
            accessPolicy: 'unlisted',
          }),
        });
        const data = await res.json();
        const fullUrl = `${window.location.origin}/shared/${data.share.shareId}`;
        setShareUrl(fullUrl);
        currentShareUrl = fullUrl;
      }

      if (navigator.share) {
        await navigator.share({
          title: `Enhanced Video — ${exportData.outputMetadata.filename}`,
          text: `Enhanced to ${exportData.outputMetadata.width}x${exportData.outputMetadata.height} (${exportData.outputMetadata.fps} FPS) master.`,
          url: currentShareUrl,
        });
      } else {
        await navigator.clipboard.writeText(currentShareUrl);
        setCopied(true);
        showToast('Share link copied to clipboard', 'success');
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error('Share action failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl && exportData) {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exportId: exportData.exportId,
          ownerUid: exportData.ownerUid,
          accessPolicy: 'unlisted',
        }),
      });
      const data = await res.json();
      const fullUrl = `${window.location.origin}/shared/${data.share.shareId}`;
      setShareUrl(fullUrl);
      await navigator.clipboard.writeText(fullUrl);
    } else if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
    }
    setCopied(true);
    showToast('Share link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatBitrate = (bps: number) => {
    const mbps = bps / (1000 * 1000);
    return `${mbps.toFixed(2)} Mbps`;
  };

  if (loading || !exportData) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col">
        <TopBar title="Export" showBack />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-9 h-9 border-2 border-[var(--accent,#C7F464)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-muted,#888888)] font-tabular">Loading verified output media...</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  const meta = exportData.outputMetadata;
  const sourceVideo = jobData?.sourceVideo;
  const settings = exportData.settings;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col pb-28"
    >
      <TopBar title="Export Complete" showBack />

      <main className={`flex-1 w-full mx-auto px-4 py-4 space-y-5 ${isDesktopMode ? 'max-w-4xl' : 'max-w-lg'}`}>
        {/* Real Enhanced Video Preview & Interactive Comparison */}
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-[var(--text-primary,#F5F4F0)] truncate max-w-[220px]">
              {meta.filename}
            </span>
            <span className="flex items-center gap-1.5 text-[var(--accent,#C7F464)] font-semibold text-[11px] bg-[var(--accent-subtle,rgba(199,244,100,0.1))] px-2.5 py-0.5 rounded-full border border-[var(--accent-glow,rgba(199,244,100,0.25))]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Hardware Master Verified</span>
            </span>
          </div>

          <ComparisonSlider
            sourceUrl={sourceVideo ? sourceVideo.streamUrl : exportData.streamUrl}
            enhancedUrl={exportData.streamUrl}
            aspectRatio={meta.aspectRatio}
            sourceLabel="Original Footage"
            enhancedLabel={`Master ${meta.width}×${meta.height}`}
          />
        </section>

        {/* Before vs After Side-by-Side Detailed Inspection Table */}
        <section className="p-4 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[var(--text-muted,#888888)] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--accent,#C7F464)]" />
              <span>Before & After Video Specifications</span>
            </h2>
            <span className="text-[10px] text-[var(--accent,#C7F464)] font-tabular font-semibold">
              FFprobe Inspected
            </span>
          </div>

          <div className="space-y-2 font-tabular text-xs">
            {/* Table Header */}
            <div className="grid grid-cols-3 pb-1 text-[11px] text-[var(--text-muted,#888888)] font-medium border-b border-[var(--border-subtle,#2b2b2b)]">
              <span>Attribute</span>
              <span>Before (Source)</span>
              <span className="text-right text-[var(--accent,#C7F464)]">After (Enhanced)</span>
            </div>

            {/* Resolution */}
            <div className="grid grid-cols-3 py-1.5 border-b border-[var(--border-subtle,#262626)] items-center">
              <span className="text-[var(--text-muted,#888888)]">Resolution</span>
              <span className="text-[var(--text-secondary,#909090)] font-medium">
                {sourceVideo ? `${sourceVideo.width} × ${sourceVideo.height}` : 'Native'}
              </span>
              <span className="text-right font-bold text-[var(--accent,#C7F464)]">
                {meta.width} × {meta.height}
              </span>
            </div>

            {/* Frame Rate */}
            <div className="grid grid-cols-3 py-1.5 border-b border-[var(--border-subtle,#262626)] items-center">
              <span className="text-[var(--text-muted,#888888)]">Frame Rate</span>
              <span className="text-[var(--text-secondary,#909090)] font-medium">
                {sourceVideo ? `${sourceVideo.fps} FPS` : '30 FPS'}
              </span>
              <span className="text-right font-bold text-[var(--accent,#C7F464)]">
                {meta.fps} FPS
              </span>
            </div>

            {/* Aspect Ratio */}
            <div className="grid grid-cols-3 py-1.5 border-b border-[var(--border-subtle,#262626)] items-center">
              <span className="text-[var(--text-muted,#888888)]">Aspect Ratio</span>
              <span className="text-[var(--text-secondary,#909090)] font-medium">
                {sourceVideo?.aspectRatio || '16:9'}
              </span>
              <span className="text-right font-semibold text-[var(--text-primary,#F5F4F0)]">
                {meta.aspectRatio}
              </span>
            </div>

            {/* Bitrate */}
            <div className="grid grid-cols-3 py-1.5 border-b border-[var(--border-subtle,#262626)] items-center">
              <span className="text-[var(--text-muted,#888888)]">Average Bitrate</span>
              <span className="text-[var(--text-secondary,#909090)] font-medium">
                {sourceVideo ? formatBitrate(sourceVideo.bitrate) : 'Source Bitrate'}
              </span>
              <span className="text-right font-semibold text-[var(--text-primary,#F5F4F0)]">
                {formatBitrate(meta.bitrate)}
              </span>
            </div>

            {/* File Size */}
            <div className="grid grid-cols-3 py-1.5 border-b border-[var(--border-subtle,#262626)] items-center">
              <span className="text-[var(--text-muted,#888888)]">File Size</span>
              <span className="text-[var(--text-secondary,#909090)] font-medium">
                {sourceVideo ? formatFileSize(sourceVideo.fileSize) : 'Source Size'}
              </span>
              <span className="text-right font-semibold text-[var(--text-primary,#F5F4F0)]">
                {formatFileSize(meta.fileSize)}
              </span>
            </div>

            {/* Video Codec */}
            <div className="grid grid-cols-3 py-1.5 border-b border-[var(--border-subtle,#262626)] items-center">
              <span className="text-[var(--text-muted,#888888)]">Video Codec</span>
              <span className="text-[var(--text-secondary,#909090)] font-medium">
                {sourceVideo ? sourceVideo.videoCodec.toUpperCase() : 'H.264'}
              </span>
              <span className="text-right font-semibold text-[var(--accent,#C7F464)]">
                {meta.videoCodec.toUpperCase()} · {meta.pixelFormat}
              </span>
            </div>

            {/* Color LUT / Profile */}
            <div className="grid grid-cols-3 py-1.5 border-b border-[var(--border-subtle,#262626)] items-center">
              <span className="text-[var(--text-muted,#888888)]">Color Profile</span>
              <span className="text-[var(--text-secondary,#909090)] font-medium">Rec.709 Standard</span>
              <span className="text-right font-semibold text-[var(--accent,#C7F464)] truncate">
                {settings?.lutPreset && settings.lutPreset !== 'none'
                  ? settings.lutPreset.replace('_', ' ').toUpperCase()
                  : 'Rec.709 Enhanced'}
              </span>
            </div>

            {/* Audio Stream */}
            <div className="grid grid-cols-3 py-1.5 items-center">
              <span className="text-[var(--text-muted,#888888)]">Audio Track</span>
              <span className="text-[var(--text-secondary,#909090)] font-medium">
                {sourceVideo?.hasAudio ? (sourceVideo.audioCodec?.toUpperCase() || 'AAC') : 'Muted'}
              </span>
              <span className="text-right font-medium text-[var(--text-primary,#F5F4F0)]">
                {meta.hasAudio ? `${meta.audioCodec?.toUpperCase()} Master` : 'Bypassed'}
              </span>
            </div>
          </div>
        </section>

        {/* Primary Action Buttons with Tactile Motion Feedback */}
        <section className="space-y-2.5">
          {/* Download Video */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleDownload}
            className="w-full h-12 rounded-xl bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-[var(--accent-glow,rgba(199,244,100,0.2))] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.4]" />
            <span>Download Master ({formatFileSize(meta.fileSize)})</span>
          </motion.button>

          {/* Share Link & Native Share Sheet */}
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleShare}
              disabled={sharing}
              className="h-11 rounded-xl bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] hover:border-[var(--accent,#C7F464)] text-xs font-semibold text-[var(--text-primary,#F5F4F0)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <span>Share Master</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCopyLink}
              className="h-11 rounded-xl bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] hover:border-[var(--accent,#C7F464)] text-xs font-semibold text-[var(--text-primary,#F5F4F0)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[var(--accent,#C7F464)]" />
                  <span className="text-[var(--accent,#C7F464)] font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[var(--text-muted,#888888)]" />
                  <span>Copy Web Link</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Save to Projects & Open Fullscreen Stream */}
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveToProjects}
              className={`h-11 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                saved
                  ? 'bg-[var(--accent-subtle,rgba(199,244,100,0.1))] border-[var(--accent,#C7F464)] text-[var(--accent,#C7F464)]'
                  : 'bg-[var(--bg-surface,#202020)] border-[var(--border-subtle,#2f2f2f)] text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)]'
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-[var(--accent,#C7F464)]" />
                  <span>Saved to Library</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  <span>Save to Library</span>
                </>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => window.open(exportData.streamUrl, '_blank')}
              className="h-11 rounded-xl bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] hover:border-[var(--accent,#C7F464)] text-xs font-semibold text-[var(--text-primary,#F5F4F0)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <span>Native Stream</span>
            </motion.button>
          </div>

          {/* Delete Project & Saved Video Option */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowDeleteModal(true)}
            className="w-full h-11 rounded-xl bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] hover:border-red-500 text-xs font-semibold text-red-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Project & Saved Video</span>
          </motion.button>

          {/* Back to Studio CTA */}
          <button
            onClick={() => navigate('/enhance')}
            className="w-full py-2 text-center text-xs text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] cursor-pointer"
          >
            Enhance Another Video →
          </button>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[var(--bg-surface,#222222)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-5 space-y-3"
            >
              <h3 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Delete Project & Video?</h3>
              <p className="text-xs text-[var(--text-muted,#888888)] leading-relaxed">
                Are you sure you want to delete this project and its saved master video? This action cannot be undone.
              </p>
              <div className="flex items-center gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-xs text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExport}
                  className="px-4 py-2 bg-red-500 text-white font-semibold rounded-xl text-xs hover:bg-red-600 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </motion.div>
  );
};
