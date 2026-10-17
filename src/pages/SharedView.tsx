import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoPlayer } from '../components/VideoPlayer';
import { ExportRecord, ShareLinkRecord } from '../types/video';
import { Download, Film, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export const SharedView: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();

  const [shareData, setShareData] = useState<{ share: ShareLinkRecord; export: ExportRecord } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!shareId) return;

    fetch(`/api/share/${shareId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Shared link not found or expired.');
        }
        return res.json();
      })
      .then((data) => {
        setShareData(data);
      })
      .catch((err) => {
        setErrorMsg(err.message);
      })
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-2 border-[var(--accent,#C7F464)] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-[var(--text-muted,#888888)]">Loading shared master video...</p>
      </div>
    );
  }

  if (errorMsg || !shareData) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <h2 className="text-base font-semibold">Share Link Inactive</h2>
        <p className="text-xs text-[var(--text-muted,#888888)]">{errorMsg || 'This link has expired or has been revoked by the owner.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-semibold text-xs rounded-xl cursor-pointer"
        >
          Go to ELITE MATRIX Studio
        </button>
      </div>
    );
  }

  const exp = shareData.export;
  const meta = exp.outputMetadata;

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col">
      <header className="h-14 bg-[var(--bg-primary,#171717)]/90 backdrop-blur-xl border-b border-[var(--border-subtle,#2f2f2f)] px-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="font-bold tracking-tight text-base text-[var(--text-primary,#F5F4F0)] flex items-center gap-1.5 cursor-pointer"
        >
          <span>ELITE MATRIX</span>
          <span className="text-xs font-normal text-[var(--text-muted,#888888)]">/ Shared Video</span>
        </button>

        <button
          onClick={() => navigate('/')}
          className="text-xs font-semibold text-[var(--accent,#C7F464)] hover:underline cursor-pointer"
        >
          Open Studio
        </button>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 space-y-5">
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--text-primary,#F5F4F0)] truncate max-w-[240px]">
              {meta.filename}
            </span>
            <span className="text-[var(--accent,#C7F464)] font-semibold text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Master Output</span>
            </span>
          </div>

          <VideoPlayer
            src={exp.streamUrl}
            aspectRatio={meta.aspectRatio}
          />
        </section>

        {/* Technical specs */}
        <section className="p-4 bg-[var(--bg-surface,#222222)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl space-y-3">
          <h2 className="text-xs font-semibold text-[var(--text-muted,#888888)] uppercase tracking-wider">
            Verified Media Specifications
          </h2>

          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-tabular">
            <div>
              <span className="text-[11px] text-[var(--text-muted,#888888)]">Resolution</span>
              <p className="font-semibold text-[var(--text-primary,#F5F4F0)]">{meta.width} × {meta.height}</p>
            </div>
            <div>
              <span className="text-[11px] text-[var(--text-muted,#888888)]">Frame Rate</span>
              <p className="font-semibold text-[var(--accent,#C7F464)]">{meta.fps} FPS</p>
            </div>
            <div>
              <span className="text-[11px] text-[var(--text-muted,#888888)]">Codec</span>
              <p className="font-semibold text-[var(--text-primary,#F5F4F0)]">{meta.videoCodec.toUpperCase()}</p>
            </div>
            <div>
              <span className="text-[11px] text-[var(--text-muted,#888888)]">File Size</span>
              <p className="font-semibold text-[var(--text-primary,#F5F4F0)]">{formatFileSize(meta.fileSize)}</p>
            </div>
          </div>
        </section>

        {/* Download action */}
        <a
          href={exp.downloadUrl}
          download
          className="w-full h-12 rounded-xl bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shadow-md cursor-pointer"
        >
          <Download className="w-4 h-4 stroke-[2.4]" />
          <span>Download Master Video ({formatFileSize(meta.fileSize)})</span>
        </a>
      </main>
    </div>
  );
};
