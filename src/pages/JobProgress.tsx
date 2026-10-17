import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { JobRecord } from '../types/video';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Clock,
  Gauge,
  Film,
  ArrowRight,
  Zap,
  Bell,
  BellRing,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  sendCompleteNotification,
  getNotificationStatus,
  requestNotificationPermission,
} from '../lib/notifications';

export const JobProgress: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [job, setJob] = useState<JobRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [notifiedComplete, setNotifiedComplete] = useState(false);
  const [notifState, setNotifState] = useState(getNotificationStatus());

  useEffect(() => {
    if (!jobId) return;

    let isMounted = true;

    const pollJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          throw new Error('Job not found');
        }
        const data = await res.json();
        if (isMounted) {
          setJob(data.job);
          setLoading(false);

          if (data.job.status === 'completed' && !notifiedComplete) {
            setNotifiedComplete(true);
            sendCompleteNotification('Video Master Enhancement Complete! ✨', {
              body: `${data.job.sourceVideo.filename} is ready to view & download.`,
            });
            showToast('Master video enhancement completed!', 'success');
          }
        }
      } catch (err) {
        console.error('Error polling job:', err);
        if (isMounted) setLoading(false);
      }
    };

    pollJob();
    const interval = setInterval(pollJob, 1000); // 1-second real-time poll

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [jobId, notifiedComplete, showToast]);

  const handleCancel = async () => {
    if (!jobId) return;
    setCancelling(true);
    try {
      await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
      showToast('Processing cancelled', 'info');
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setCancelling(false);
    }
  };

  const handleRetry = async () => {
    if (!jobId) return;
    setRetrying(true);
    try {
      await fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
      showToast('Enhancement job re-queued in worker pool', 'info');
    } catch (err) {
      console.error('Retry error:', err);
    } finally {
      setRetrying(false);
    }
  };

  if (loading || !job) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col">
        <TopBar title="Processing" showBack />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-9 h-9 border-2 border-[var(--accent,#C7F464)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--text-muted,#888888)] font-tabular">Connecting to worker telemetry...</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  const isFinished = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const isCancelled = job.status === 'cancelled';
  const isProcessing = ['queued', 'processing', 'finalizing'].includes(job.status);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col pb-24"
    >
      <TopBar title="Processing Status" showBack />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Main Progress Status Card */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl p-5 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-muted,#888888)] font-tabular">Job: {job.jobId}</span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                isFinished
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isFailed
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : isCancelled
                  ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                  : 'bg-[var(--accent-subtle,rgba(199,244,100,0.1))] text-[var(--accent,#C7F464)] border border-[var(--accent-glow,rgba(199,244,100,0.3))]'
              }`}
            >
              {job.status}
            </span>
          </div>

          {/* Large percentage display with fluid micro-counter */}
          <div className="text-center py-2 space-y-1">
            <div className="text-5xl font-extrabold font-tabular tracking-tight text-[var(--text-primary,#F5F4F0)] flex items-center justify-center gap-1">
              <span>{job.progress}</span>
              <span className="text-3xl text-[var(--accent,#C7F464)]">%</span>
            </div>
            <p className="text-xs text-[var(--text-muted,#888888)] font-medium animate-pulse">
              {job.stage}
            </p>
          </div>

          {/* Progress bar with fluid spring animation & active shimmer */}
          <div className="w-full h-3 bg-[var(--bg-primary,#171717)] rounded-full overflow-hidden p-0.5 border border-[var(--border-subtle,#2b2b2b)] relative">
            <motion.div
              className={`h-full rounded-full transition-all relative overflow-hidden ${
                isFailed ? 'bg-red-500' : isFinished ? 'bg-emerald-400' : 'bg-[var(--accent,#C7F464)]'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(3, job.progress)}%` }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {isProcessing && (
                <div className="absolute inset-0 animate-shimmer" />
              )}
            </motion.div>
          </div>

          {/* Verified Real-Time Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-tabular pt-1">
            <div className="p-3 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl space-y-0.5">
              <span className="text-[11px] text-[var(--text-muted,#888888)] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--text-muted,#888888)]" /> Elapsed Time
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">{job.elapsedSeconds}s</p>
            </div>

            <div className="p-3 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl space-y-0.5">
              <span className="text-[11px] text-[var(--text-muted,#888888)] flex items-center gap-1">
                <Zap className="w-3 h-3 text-[var(--accent,#C7F464)]" /> Est. Remaining
              </span>
              <p className="text-sm font-semibold text-[var(--accent,#C7F464)]">
                {job.estimatedRemainingSeconds > 0 ? `${job.estimatedRemainingSeconds}s` : 'Finalizing...'}
              </p>
            </div>

            <div className="p-3 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl space-y-0.5">
              <span className="text-[11px] text-[var(--text-muted,#888888)] flex items-center gap-1">
                <Gauge className="w-3 h-3 text-[var(--text-muted,#888888)]" /> Worker Speed
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">
                {job.fps > 0 ? `${job.fps} FPS (${job.speed})` : 'Encoding'}
              </p>
            </div>

            <div className="p-3 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl space-y-0.5">
              <span className="text-[11px] text-[var(--text-muted,#888888)] flex items-center gap-1">
                <Film className="w-3 h-3 text-[var(--text-muted,#888888)]" /> Frames Rendered
              </span>
              <p className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">
                {job.frame} / {job.totalFrames}
              </p>
            </div>
          </div>

          {/* Error Message if failed */}
          {isFailed && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{job.errorCode || 'Render Pipeline Error'}</p>
                <p className="mt-0.5 leading-relaxed">{job.errorMessage}</p>
              </div>
            </motion.div>
          )}

          {/* Action CTAs with Tactile Feedback */}
          <div className="space-y-2 pt-2">
            {isFinished && job.exportId && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/exports/${job.exportId}`)}
                className="w-full h-12 rounded-xl bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-[var(--accent-glow,rgba(199,244,100,0.2))] transition-all cursor-pointer"
              >
                <span>View Master Video & Full Telemetry</span>
                <ArrowRight className="w-4 h-4 stroke-[2.4]" />
              </motion.button>
            )}

            {isProcessing && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full h-11 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-strong,#3f3f3f)] text-[var(--text-muted,#888888)] hover:text-red-400 hover:border-red-400/40 font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>{cancelling ? 'Terminating Process...' : 'Cancel Processing'}</span>
              </motion.button>
            )}

            {(isFailed || isCancelled) && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleRetry}
                disabled={retrying}
                className="w-full h-11 rounded-xl bg-[var(--bg-surface-elevated,#2a2a2a)] border border-[var(--border-strong,#3f3f3f)] text-[var(--text-primary,#F5F4F0)] hover:text-[var(--accent,#C7F464)] font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Re-queuing in Worker Pool...' : 'Retry Enhancement'}</span>
              </motion.button>
            )}
          </div>
        </section>

        {/* Push Notification Alert Banner */}
        {isProcessing && notifState.supported && notifState.permission !== 'granted' && (
          <section className="p-4 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-subtle,rgba(199,244,100,0.1))] flex items-center justify-center text-[var(--accent,#C7F464)] shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary,#F5F4F0)]">Enable Push Notifications</p>
                <p className="text-[11px] text-[var(--text-muted,#888888)]">Get an Apple audio chime & alert when export finishes</p>
              </div>
            </div>
            <button
              onClick={async () => {
                const res = await requestNotificationPermission();
                setNotifState(getNotificationStatus());
                if (res === 'granted') {
                  showToast('Push notifications enabled with audio chime!', 'success');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-bold text-[11px] shrink-0 cursor-pointer hover:opacity-90"
            >
              Enable
            </button>
          </section>
        )}

        {isProcessing && notifState.permission === 'granted' && (
          <section className="px-4 py-2.5 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl flex items-center gap-2 text-[11px] text-[var(--text-muted,#888888)]">
            <BellRing className="w-3.5 h-3.5 text-[var(--accent,#C7F464)] shrink-0" />
            <span>Push notifications active — sound & haptic chime ready.</span>
          </section>
        )}

        {/* Source Footage Reference */}
        <section className="p-4 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl space-y-2 text-xs">
          <p className="font-semibold text-[var(--text-muted,#888888)]">Active Processing Manifest</p>
          <div className="space-y-1.5 font-tabular text-[var(--text-muted,#888888)]">
            <div className="flex justify-between border-b border-[var(--border-subtle,#2b2b2b)] pb-1">
              <span className="text-[var(--text-muted,#666666)]">Source Clip</span>
              <span className="text-[var(--text-primary,#F5F4F0)] truncate max-w-[200px]">{job.sourceVideo.filename}</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border-subtle,#2b2b2b)] pb-1">
              <span className="text-[var(--text-muted,#666666)]">Target Output</span>
              <span className="text-[var(--text-primary,#F5F4F0)]">
                {job.settings.targetResolution.toUpperCase()} ·{' '}
                {job.settings.targetFps === 'preserve' ? `${job.sourceVideo.fps} FPS` : `${job.settings.targetFps} FPS`}{' '}
                · {job.settings.codec.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-[var(--text-muted,#666666)]">Interpolation</span>
              <span className="text-[var(--accent,#C7F464)]">
                {job.settings.motionInterpolation ? `${job.settings.interpolationMode} (Active)` : 'Preserve Source'}
              </span>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </motion.div>
  );
};
