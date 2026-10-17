import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { VideoMetadata, JobRecord, ProjectRecord } from '../types/video';
import { useDeviceCapabilities } from '../lib/deviceCapabilities';
import {
  Upload,
  Film,
  Play,
  Sparkles,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  Monitor,
  Zap,
  Palette,
  Ratio,
} from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deviceCaps = useDeviceCapabilities();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<JobRecord[]>([]);
  const [recentProjects, setRecentProjects] = useState<ProjectRecord[]>([]);
  const [sampleClips, setSampleClips] = useState<{ id: string; name: string; description: string; metadata?: VideoMetadata }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const fetchWithRetry = async (url: string, retries = 2): Promise<Response> => {
          try {
            const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
            if (!res.ok && retries > 0) throw new Error('Retry');
            return res;
          } catch (err) {
            if (retries > 0) return fetchWithRetry(url, retries - 1);
            throw err;
          }
        };

        const [jobsRes, projRes, samplesRes] = await Promise.all([
          fetchWithRetry(`/api/jobs?ownerUid=${user?.uid || ''}`),
          fetchWithRetry(`/api/projects?ownerUid=${user?.uid || ''}`),
          fetchWithRetry('/api/samples'),
        ]);

        if (isMounted) {
          if (jobsRes.ok) {
            const data = await jobsRes.json();
            setActiveJobs(data.jobs.filter((j: JobRecord) => ['queued', 'processing', 'finalizing'].includes(j.status)));
          }
          if (projRes.ok) {
            const data = await projRes.json();
            setRecentProjects(data.projects.slice(0, 5));
          }
          if (samplesRes.ok) {
            const data = await samplesRes.json();
            setSampleClips(data.samples || []);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload and inspect video.');
      }

      const data = await res.json();
      sessionStorage.setItem('elitematrix_active_video', JSON.stringify(data.metadata));
      showToast('Footage inspected & loaded into Studio', 'success');
      navigate('/enhance');
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setUploadError(msg);
      showToast(msg, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      uploadFile(file);
    }
  };

  const handleSelectSample = (sample: { metadata?: VideoMetadata }) => {
    if (sample.metadata) {
      sessionStorage.setItem('elitematrix_active_video', JSON.stringify(sample.metadata));
      showToast(`Loaded "${sample.metadata.filename}"`, 'info');
      navigate('/enhance');
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col pb-24"
    >
      <TopBar />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* Apple-Style Hero Card with Fluid Upload Zone */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative bg-[var(--bg-surface,#202020)] border rounded-2xl p-5 space-y-4 transition-all duration-200 ${
            isDragOver
              ? 'border-[var(--accent,#C7F464)] bg-[var(--accent-subtle,rgba(199,244,100,0.1))] shadow-lg'
              : 'border-[var(--border-subtle,#2b2b2b)] hover:border-[var(--border-strong,#383838)]'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-[var(--accent,#C7F464)] uppercase font-tabular flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" />
                <span>{deviceCaps.displayLabel}</span>
              </span>
              <span className="text-[11px] text-[var(--text-muted,#888888)] font-tabular">
                4K UHD · {deviceCaps.is120HzSupported ? '120 FPS' : deviceCaps.is90HzSupported ? '90 FPS' : '60 FPS'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary,#F5F4F0)]">
              Video Remaster Studio
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted,#888888)] leading-relaxed">
              Upscale footage up to 4K, synthesize true 60/90/120 FPS frames, apply real-time cinematic LUTs, adjust social aspect ratios, and export Apple ProRes 422 HQ masters.
            </p>
          </div>

          {/* Primary Action Button with Spring Feedback */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/avi"
              className="hidden"
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-12 rounded-xl bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 shadow-md shadow-[var(--accent-glow,rgba(199,244,100,0.2))] transition-all disabled:opacity-50 select-none cursor-pointer"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--accent-text,#121808)] border-t-transparent rounded-full animate-spin" />
                  <span>Inspecting Media Streams...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 stroke-[2.4]" />
                  <span>Select Video from Device</span>
                </>
              )}
            </motion.button>
          </div>

          {uploadError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </motion.div>
          )}

          {/* Instant Test Clips */}
          <div className="pt-2 border-t border-[var(--border-subtle,#2b2b2b)] space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted,#888888)]">
              <span>Or test with pre-rendered footage</span>
              <span className="font-tabular text-[10px] text-[var(--text-muted,#666666)]">Real Video Streams</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {sampleClips.map((sample) => (
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className="w-full p-2.5 bg-[var(--bg-primary,#171717)] hover:bg-[var(--bg-surface-elevated,#242424)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl text-left flex items-center justify-between gap-3 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface,#222222)] border border-[var(--border-strong,#333333)] flex items-center justify-center text-[var(--accent,#C7F464)] shrink-0 group-hover:scale-105 transition-transform">
                      <Film className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)] truncate group-hover:text-[var(--accent,#C7F464)] transition-colors">
                        {sample.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted,#888888)] truncate">{sample.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted,#888888)] group-hover:text-[var(--text-primary,#F5F4F0)] group-hover:translate-x-0.5 transition-all shrink-0" />
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* Active Processing Jobs */}
        {activeJobs.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent,#C7F464)]" />
                <span>Active Processing Jobs</span>
              </h2>
              <span className="font-tabular text-xs text-[var(--accent,#C7F464)] font-semibold px-2 py-0.5 bg-[var(--accent-subtle,rgba(199,244,100,0.1))] rounded-full">
                {activeJobs.length} Rendering
              </span>
            </div>

            <div className="space-y-2">
              {activeJobs.map((job) => (
                <motion.div
                  key={job.jobId}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/jobs/${job.jobId}`)}
                  className="p-4 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] hover:border-[var(--border-strong,#383838)] rounded-xl cursor-pointer space-y-2.5 transition-all shadow-md group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary,#F5F4F0)] truncate max-w-[200px] group-hover:text-[var(--accent,#C7F464)] transition-colors">
                      {job.sourceVideo.filename}
                    </span>
                    <span className="font-tabular text-[var(--accent,#C7F464)] font-bold text-sm">
                      {job.progress}%
                    </span>
                  </div>

                  {/* Smooth spring progress bar */}
                  <div className="w-full h-2 bg-[var(--bg-primary,#171717)] rounded-full overflow-hidden p-0.5 border border-[var(--border-subtle,#2b2b2b)]">
                    <motion.div
                      className="h-full bg-[var(--accent,#C7F464)] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(2, job.progress)}%` }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted,#888888)]">
                    <span className="truncate max-w-[220px]">{job.stage}</span>
                    <span className="font-tabular">
                      {job.fps > 0 ? `${job.fps} fps · ` : ''}
                      {job.elapsedSeconds}s
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Projects */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Recent Projects</h2>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs text-[var(--text-muted,#888888)] hover:text-[var(--accent,#C7F464)] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="p-6 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-2xl text-center space-y-2">
              <Film className="w-6 h-6 text-[var(--text-muted,#888888)] mx-auto opacity-70" />
              <p className="text-xs text-[var(--text-muted,#888888)]">No enhanced video projects yet.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-[var(--accent,#C7F464)] hover:underline cursor-pointer"
              >
                Upload your first video
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentProjects.map((proj) => (
                <motion.div
                  key={proj.projectId}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    sessionStorage.setItem('elitematrix_active_video', JSON.stringify(proj.sourceMetadata));
                    if (proj.latestExport) {
                      navigate(`/exports/${proj.latestExport.exportId}`);
                    } else if (proj.latestJob) {
                      navigate(`/jobs/${proj.latestJob.jobId}`);
                    } else {
                      navigate('/enhance');
                    }
                  }}
                  className="p-3 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] hover:border-[var(--border-strong,#383838)] rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2b2b2b)] overflow-hidden shrink-0 relative flex items-center justify-center">
                      {proj.thumbnailUrl ? (
                        <img
                          src={proj.thumbnailUrl}
                          alt={proj.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Film className="w-5 h-5 text-[var(--text-muted,#888888)]" />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 fill-white text-white" />
                      </div>
                    </div>

                    <div className="truncate space-y-0.5">
                      <p className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)] truncate group-hover:text-[var(--accent,#C7F464)] transition-colors">
                        {proj.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted,#888888)] font-tabular">
                        <span>{proj.sourceMetadata.width}×{proj.sourceMetadata.height}</span>
                        <span>·</span>
                        <span>{formatDuration(proj.sourceMetadata.duration)}</span>
                        <span>·</span>
                        <span className={proj.latestExport ? 'text-emerald-400 font-medium' : 'text-[var(--text-muted,#888888)]'}>
                          {proj.latestExport ? 'Enhanced' : 'Source'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[var(--text-muted,#888888)] group-hover:text-[var(--text-primary,#F5F4F0)] group-hover:translate-x-0.5 transition-all shrink-0" />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Feature Highlights Grid */}
        <section className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl space-y-1">
            <span className="text-[var(--accent,#C7F464)] font-semibold flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>Real-Time Grading</span>
            </span>
            <p className="text-[11px] text-[var(--text-muted,#888888)]">Exposure, warmth, tint, and 10 cinematic film LUTs.</p>
          </div>

          <div className="p-3 bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2b2b2b)] rounded-xl space-y-1">
            <span className="text-[var(--accent,#C7F464)] font-semibold flex items-center gap-1.5">
              <Ratio className="w-3.5 h-3.5" />
              <span>Aspect Sizes</span>
            </span>
            <p className="text-[11px] text-[var(--text-muted,#888888)]">16:9, 9:16 Reels, 1:1 Square, 4:5, and 2.39:1 Cinema.</p>
          </div>
        </section>
      </main>

      <BottomNav />
    </motion.div>
  );
};
