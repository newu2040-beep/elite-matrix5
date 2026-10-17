import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useDesktopMode } from '../context/DesktopModeContext';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectRecord } from '../types/video';
import {
  Search,
  Film,
  Download,
  Trash2,
  Edit2,
  Play,
  ChevronRight,
} from 'lucide-react';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isDesktopMode } = useDesktopMode();

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enhanced' | 'processing'>('all');

  // Rename modal state
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [newName, setNewName] = useState('');

  // Delete modal state
  const [deletingProject, setDeletingProject] = useState<ProjectRecord | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects?ownerUid=${user?.uid || ''}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleRename = async () => {
    if (!editingProject || !newName.trim()) return;
    try {
      await fetch(`/api/projects/${editingProject.projectId}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      showToast('Project renamed', 'success');
      setEditingProject(null);
      fetchProjects();
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    try {
      await fetch(`/api/projects/${deletingProject.projectId}`, {
        method: 'DELETE',
      });
      showToast('Project deleted', 'info');
      setDeletingProject(null);
      fetchProjects();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'enhanced') return !!p.latestExport;
    if (statusFilter === 'processing') return p.latestJob && ['queued', 'processing', 'finalizing'].includes(p.latestJob.status);
    return true;
  });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col pb-24">
      <TopBar title="Projects" />

      <main className={`flex-1 w-full mx-auto px-4 py-4 space-y-4 ${isDesktopMode ? 'max-w-4xl' : 'max-w-lg'}`}>
        {/* Search bar & filter tabs */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted,#888888)] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search projects by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-[var(--bg-surface,#222222)] border border-[var(--border-subtle,#2f2f2f)] rounded-xl text-xs text-[var(--text-primary,#F5F4F0)] placeholder-[var(--text-muted,#666666)] focus:outline-none focus:border-[var(--accent,#C7F464)]"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-surface,#222222)] rounded-xl border border-[var(--border-subtle,#2f2f2f)] text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 rounded-lg min-h-[36px] font-medium transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] font-semibold shadow-sm' : 'text-[var(--text-muted,#888888)]'
              }`}
            >
              All ({projects.length})
            </button>
            <button
              onClick={() => setStatusFilter('enhanced')}
              className={`flex-1 py-1.5 rounded-lg min-h-[36px] font-medium transition-colors cursor-pointer ${
                statusFilter === 'enhanced' ? 'bg-[var(--bg-primary,#171717)] text-[var(--accent,#C7F464)] font-semibold shadow-sm' : 'text-[var(--text-muted,#888888)]'
              }`}
            >
              Enhanced ({projects.filter((p) => p.latestExport).length})
            </button>
            <button
              onClick={() => setStatusFilter('processing')}
              className={`flex-1 py-1.5 rounded-lg min-h-[36px] font-medium transition-colors cursor-pointer ${
                statusFilter === 'processing' ? 'bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] font-semibold shadow-sm' : 'text-[var(--text-muted,#888888)]'
              }`}
            >
              Processing
            </button>
          </div>
        </div>

        {/* Project List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted,#888888)]">
            <div className="w-6 h-6 border-2 border-[var(--accent,#C7F464)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading project library...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-8 bg-[var(--bg-surface,#222222)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl text-center space-y-2">
            <Film className="w-8 h-8 text-[var(--text-muted,#888888)] mx-auto opacity-70" />
            <p className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)]">No projects found</p>
            <p className="text-[11px] text-[var(--text-muted,#888888)]">Upload or select a video to start your first enhancement.</p>
            <button
              onClick={() => navigate('/enhance')}
              className="mt-2 px-4 py-2 bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-semibold rounded-xl text-xs cursor-pointer"
            >
              Open Studio
            </button>
          </div>
        ) : (
          <div className={isDesktopMode ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-3"}>
            {filteredProjects.map((proj) => {
              const hasExport = !!proj.latestExport;
              const isProcessing = proj.latestJob && ['queued', 'processing', 'finalizing'].includes(proj.latestJob.status);

              return (
                <div
                  key={proj.projectId}
                  className="p-3.5 bg-[var(--bg-surface,#222222)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl space-y-3"
                >
                  <div
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
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2f2f2f)] overflow-hidden shrink-0 relative flex items-center justify-center">
                      {proj.thumbnailUrl ? (
                        <img
                          src={proj.thumbnailUrl}
                          alt={proj.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Film className="w-5 h-5 text-[var(--text-muted,#888888)]" />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 fill-white text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)] truncate group-hover:text-[var(--accent,#C7F464)] transition-colors">
                        {proj.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted,#888888)] font-tabular mt-0.5">
                        <span>{proj.sourceMetadata.width}×{proj.sourceMetadata.height}</span>
                        <span>·</span>
                        <span>{formatDuration(proj.sourceMetadata.duration)}</span>
                        <span>·</span>
                        <span className={hasExport ? 'text-emerald-400 font-medium' : isProcessing ? 'text-[var(--accent,#C7F464)]' : 'text-[var(--text-muted,#888888)]'}>
                          {hasExport ? 'Master Ready' : isProcessing ? 'Rendering' : 'Draft'}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[var(--text-muted,#888888)] group-hover:text-[var(--text-primary,#F5F4F0)] group-hover:translate-x-0.5 transition-all" />
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle,#2a2a2a)] text-xs">
                    <span className="text-[10px] text-[var(--text-muted,#666666)] font-tabular">
                      Updated {new Date(proj.updatedAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingProject(proj);
                          setNewName(proj.name);
                        }}
                        className="p-1.5 text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] rounded-lg hover:bg-[var(--bg-primary,#171717)] transition-colors cursor-pointer"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {hasExport && (
                        <button
                          onClick={() => {
                            if (proj.latestExport) {
                              const link = document.createElement('a');
                              link.href = proj.latestExport.downloadUrl;
                              link.setAttribute('download', proj.latestExport.outputMetadata.filename);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              showToast('Downloading export...', 'info');
                            }
                          }}
                          className="p-1.5 text-[var(--text-muted,#888888)] hover:text-[var(--accent,#C7F464)] rounded-lg hover:bg-[var(--bg-primary,#171717)] transition-colors cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => setDeletingProject(proj)}
                        className="p-1.5 text-[var(--text-muted,#888888)] hover:text-red-400 rounded-lg hover:bg-[var(--bg-primary,#171717)] transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rename Modal */}
        <AnimatePresence>
          {editingProject && (
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
                className="w-full max-w-sm bg-[var(--bg-surface,#222222)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-5 space-y-4"
              >
                <h3 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Rename Project</h3>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-10 px-3 bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2f2f2f)] rounded-xl text-xs text-[var(--text-primary,#F5F4F0)] focus:outline-none focus:border-[var(--accent,#C7F464)]"
                  placeholder="Enter project name..."
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setEditingProject(null)}
                    className="px-4 py-2 text-xs text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRename}
                    className="px-4 py-2 bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    Save Name
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deletingProject && (
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
                <h3 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Delete Project?</h3>
                <p className="text-xs text-[var(--text-muted,#888888)] leading-relaxed">
                  Are you sure you want to delete &ldquo;{deletingProject.name}&rdquo;? This will remove the project from your library.
                </p>
                <div className="flex items-center gap-2 justify-end pt-2">
                  <button
                    onClick={() => setDeletingProject(null)}
                    className="px-4 py-2 text-xs text-[var(--text-muted,#888888)] hover:text-[var(--text-primary,#F5F4F0)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white font-semibold rounded-xl text-xs hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
};
