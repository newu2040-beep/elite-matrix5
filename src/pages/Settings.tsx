import React, { useState } from 'react';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useTheme, PASTEL_THEMES, PastelPalette } from '../context/ThemeContext';
import { useDesktopMode } from '../context/DesktopModeContext';
import { useDeviceCapabilities } from '../lib/deviceCapabilities';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  Shield,
  FileText,
  Sliders,
  HardDrive,
  Trash2,
  Check,
  Palette,
  Monitor,
  Zap,
  Cpu,
  Smartphone,
  Download,
} from 'lucide-react';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { sendCompleteNotification, requestNotificationPermission } from '../lib/notifications';

export const Settings: React.FC = () => {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const { theme, palette, setColorMode, setPalette } = useTheme();
  const { isDesktopMode } = useDesktopMode();
  const { showToast } = useToast();
  const deviceCaps = useDeviceCapabilities();

  // Export default preferences state
  const [defaultResolution, setDefaultResolution] = useState(() => {
    return localStorage.getItem('elitematrix_pref_resolution') || '4k';
  });
  const [defaultFps, setDefaultFps] = useState(() => {
    return localStorage.getItem('elitematrix_pref_fps') || '60';
  });
  const [defaultCodec, setDefaultCodec] = useState(() => {
    return localStorage.getItem('elitematrix_pref_codec') || 'hevc';
  });
  const [prefSaved, setPrefSaved] = useState(false);

  // Custom Gemini API Key state
  const [customApiKey, setCustomApiKey] = useState(() => {
    return localStorage.getItem('elitematrix_custom_gemini_api_key') || '';
  });
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Policy modals
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const handleSavePreferences = () => {
    localStorage.setItem('elitematrix_pref_resolution', defaultResolution);
    localStorage.setItem('elitematrix_pref_fps', defaultFps);
    localStorage.setItem('elitematrix_pref_codec', defaultCodec);
    setPrefSaved(true);
    showToast('Default export preferences saved', 'success');
    setTimeout(() => setPrefSaved(false), 2000);
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('elitematrix_custom_gemini_api_key', customApiKey.trim());
    setApiKeySaved(true);
    showToast('Custom Gemini API key saved', 'success');
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#171717)] text-[var(--text-primary,#F5F4F0)] flex flex-col pb-24">
      <TopBar title="Settings" />

      <main className={`flex-1 w-full mx-auto px-4 py-4 space-y-5 ${isDesktopMode ? 'max-w-4xl' : 'max-w-lg'}`}>
        {/* Apple-Style Pastel Themes & Appearance Section */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Pastel Aesthetic Themes</h2>
            </div>
            <span className="text-[11px] text-[var(--text-muted,#888888)] font-medium capitalize">
              {palette} · {theme}
            </span>
          </div>

          {/* Pastel Palettes Swatch Picker */}
          <div className="space-y-1.5">
            <span className="text-xs text-[var(--text-muted,#888888)]">Apple Studio Palette</span>
            <div className="grid grid-cols-2 gap-2">
              {PASTEL_THEMES.map((t) => {
                const isSelected = palette === t.id;
                return (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setPalette(t.id);
                      showToast(`Theme: ${t.name} applied`, 'info');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[56px] flex items-center gap-3 ${
                      isSelected
                        ? 'bg-[var(--bg-primary,#171717)] border-[var(--accent,#C7F464)]/70 shadow-sm'
                        : 'bg-[var(--bg-primary,#171717)]/60 border-[var(--border-subtle,#262626)] hover:border-[var(--border-strong,#383838)]'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full shrink-0 shadow-sm flex items-center justify-center border border-white/20"
                      style={{ backgroundColor: t.previewAccent }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#121808] stroke-[3]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[var(--accent,#C7F464)]' : 'text-[var(--text-primary,#F5F4F0)]'}`}>
                        {t.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted,#888888)] truncate">{t.subtitle}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Light / Dark Mode Toggle */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle,#2b2b2b)]">
            <span className="text-xs text-[var(--text-muted,#888888)]">Color Mode</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setColorMode('dark')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] ${
                  theme === 'dark'
                    ? 'bg-[var(--bg-primary,#171717)] text-[var(--accent,#C7F464)] border-[var(--accent,#C7F464)]/50 shadow-sm'
                    : 'bg-[var(--bg-primary,#171717)]/50 text-[var(--text-muted,#888888)] border-[var(--border-subtle,#2f2f2f)] hover:text-[var(--text-primary,#F5F4F0)]'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Obsidian Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setColorMode('light')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] ${
                  theme === 'light'
                    ? 'bg-[var(--bg-primary,#171717)] text-[var(--accent,#C7F464)] border-[var(--accent,#C7F464)]/50 shadow-sm'
                    : 'bg-[var(--bg-primary,#171717)]/50 text-[var(--text-muted,#888888)] border-[var(--border-subtle,#2f2f2f)] hover:text-[var(--text-primary,#F5F4F0)]'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Soft Pastel Light</span>
              </button>
            </div>
          </div>
        </section>

        {/* Real Device Hardware & Display Capabilities */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Hardware & Screen Capabilities</h2>
            </div>
            <span className="text-[10px] text-[var(--accent,#C7F464)] font-tabular font-semibold">
              Live Benchmark
            </span>
          </div>

          <div className="space-y-2 font-tabular text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#262626)]">
              <span className="text-[var(--text-muted,#888888)]">Screen Refresh Rate</span>
              <span className="font-bold text-[var(--accent,#C7F464)]">
                {deviceCaps.displayLabel}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#262626)]">
              <span className="text-[var(--text-muted,#888888)]">High Refresh Support</span>
              <span className="font-semibold text-[var(--text-primary,#F5F4F0)]">
                {deviceCaps.is120HzSupported ? '120 FPS ProMotion Native' : deviceCaps.is90HzSupported ? '90 FPS Native' : '60 FPS Standard (90/120 Export Ready)'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#262626)]">
              <span className="text-[var(--text-muted,#888888)]">Color Space</span>
              <span className="font-semibold text-[var(--text-primary,#F5F4F0)]">{deviceCaps.colorGamut}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#262626)]">
              <span className="text-[var(--text-muted,#888888)]">Dynamic Range</span>
              <span className="font-semibold text-[var(--text-primary,#F5F4F0)]">
                {deviceCaps.isHdrSupported ? 'HDR10 / Dolby Vision' : 'SDR Dynamic Range'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#262626)] space-y-1">
              <span className="text-[10px] text-[var(--text-muted,#888888)] uppercase">Hardware GPU Engine</span>
              <p className="text-[11px] font-semibold text-[var(--text-primary,#F5F4F0)] truncate">
                {deviceCaps.gpuRenderer}
              </p>
            </div>
          </div>
        </section>

        {/* Push Notifications & Apple Audio Chime Section */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[var(--accent,#C7F464)] text-sm">🔔</span>
              <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Push Notifications & Audio Alerts</h2>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#262626)] text-[var(--accent,#C7F464)] font-medium capitalize">
              {typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'Unsupported'}
            </span>
          </div>

          <p className="text-xs text-[var(--text-muted,#888888)] leading-relaxed">
            Receive instant push notifications with a crystalline Apple-style success chime and haptic pulse when your video enhancement completes.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={async () => {
                const perm = await requestNotificationPermission();
                showToast(`Notification permission: ${perm}`, perm === 'granted' ? 'success' : 'info');
              }}
              className="p-2.5 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#282828)] hover:border-[var(--accent,#C7F464)] text-xs font-semibold text-[var(--text-primary,#F5F4F0)] text-center transition-colors cursor-pointer"
            >
              Request Permission
            </button>

            <button
              type="button"
              onClick={() => {
                sendCompleteNotification('Test Alert: Video Processing Done! 🎉', {
                  body: 'EliteMatrix neural export finished with crystalline audio chime.',
                });
                showToast('Chime & notification triggered!', 'success');
              }}
              className="p-2.5 rounded-xl bg-[var(--accent-subtle,rgba(199,244,100,0.12))] border border-[var(--accent-glow,rgba(199,244,100,0.3))] text-xs font-semibold text-[var(--accent,#C7F464)] text-center transition-colors cursor-pointer"
            >
              Test Sound & Alert
            </button>
          </div>
        </section>

        {/* Default Export Master Preferences */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Default Export Configuration</h2>
            </div>
            {prefSaved && (
              <span className="text-xs text-[var(--accent,#C7F464)] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted,#888888)]">Default Target Resolution</span>
              <select
                value={defaultResolution}
                onChange={(e) => setDefaultResolution(e.target.value)}
                className="bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2f2f2f)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary,#F5F4F0)]"
              >
                <option value="4k">4K UHD (3840×2160)</option>
                <option value="1440p">1440p QHD</option>
                <option value="1080p">1080p FHD</option>
                <option value="720p">720p HD</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted,#888888)]">Default Frame Rate</span>
              <select
                value={defaultFps}
                onChange={(e) => setDefaultFps(e.target.value)}
                className="bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2f2f2f)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary,#F5F4F0)]"
              >
                <option value="120">120 FPS (Apple ProMotion)</option>
                <option value="90">90 FPS (High Refresh)</option>
                <option value="60">60 FPS (Smooth)</option>
                <option value="30">30 FPS</option>
                <option value="24">24 FPS (Cinematic)</option>
                <option value="preserve">Preserve Source</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted,#888888)]">Default Master Codec</span>
              <select
                value={defaultCodec}
                onChange={(e) => setDefaultCodec(e.target.value)}
                className="bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2f2f2f)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary,#F5F4F0)]"
              >
                <option value="prores">Apple ProRes 422 HQ Master (.mov)</option>
                <option value="hevc">H.265 / HEVC Ultra</option>
                <option value="h264">H.264 / AVC Universal</option>
                <option value="vp9">VP9 (WebM)</option>
              </select>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSavePreferences}
              className="w-full h-11 mt-2 rounded-xl bg-[var(--bg-surface-elevated,#2a2a2a)] hover:bg-[var(--border-strong,#333333)] border border-[var(--border-strong,#3f3f3f)] text-xs font-semibold text-[var(--accent,#C7F464)] transition-colors cursor-pointer"
            >
              Save Default Preferences
            </motion.button>
          </div>
        </section>

        {/* Custom Gemini API Key */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--accent,#C7F464)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Custom Gemini API Key</h2>
            </div>
            {apiKeySaved && (
              <span className="text-xs text-[var(--accent,#C7F464)] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--text-muted,#888888)] leading-relaxed">
            If public AI video enhancement quota is reached, enter your personal Google Gemini API key here for unlimited real-time neural upscaling and color calibration.
          </p>

          <div className="space-y-2.5 pt-1">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              className="w-full bg-[var(--bg-primary,#171717)] border border-[var(--border-subtle,#2f2f2f)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-primary,#F5F4F0)] placeholder:text-[var(--text-muted,#666666)] focus:outline-none focus:border-[var(--accent,#C7F464)] font-mono"
            />

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveApiKey}
              className="w-full h-10 rounded-xl bg-[var(--bg-surface-elevated,#2a2a2a)] hover:bg-[var(--border-strong,#333333)] border border-[var(--border-strong,#3f3f3f)] text-xs font-semibold text-[var(--accent,#C7F464)] transition-colors cursor-pointer"
            >
              Save Custom API Key
            </motion.button>
          </div>
        </section>

        {/* Account Section */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-[var(--accent,#C7F464)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Google Account & Profile</h2>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[var(--bg-primary,#171717)] rounded-xl border border-[var(--border-subtle,#2f2f2f)]">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full border border-[var(--border-strong,#3f3f3f)] object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[var(--bg-surface-elevated,#2a2a2a)] border border-[var(--border-strong,#3f3f3f)] flex items-center justify-center text-sm font-bold text-[var(--accent,#C7F464)]">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary,#F5F4F0)] truncate">{user?.displayName || 'Studio Creator'}</p>
              <p className="text-[11px] text-[var(--text-muted,#888888)] truncate">{user?.email || 'Authenticated User'}</p>
              <p className="text-[10px] text-[var(--text-muted,#666666)] font-tabular mt-0.5 truncate">
                UID: {user?.uid || 'guest_user'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="flex-1 h-10 rounded-xl bg-[var(--bg-surface-elevated,#2a2a2a)] border border-[var(--border-strong,#3f3f3f)] hover:border-[var(--accent,#C7F464)] text-xs font-medium text-[var(--text-primary,#F5F4F0)] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Switch Google Account</span>
            </button>

            <button
              type="button"
              onClick={signOutUser}
              className="px-4 h-10 rounded-xl bg-[var(--bg-primary,#171717)] border border-[var(--border-strong,#3f3f3f)] hover:text-red-400 text-xs font-medium text-[var(--text-muted,#888888)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </section>

        {/* App Installation */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[var(--accent,#C7F464)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">App Installation</h2>
          </div>
          <PWAInstallButton />
        </section>

        {/* Storage and Privacy Policy */}
        <section className="bg-[var(--bg-surface,#202020)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[var(--accent,#C7F464)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary,#F5F4F0)]">Storage & Security Policy</h2>
          </div>

          <div className="space-y-2 text-xs text-[var(--text-muted,#888888)] leading-relaxed">
            <p>
              Media files and neural exports are processed locally in isolated FFmpeg execution threads. Real-time preview uses zero-latency client acceleration.
            </p>
            <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle,#2f2f2f)]">
              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="text-xs text-[var(--text-muted,#888888)] hover:text-[var(--accent,#C7F464)] flex items-center gap-1 underline cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Privacy Policy</span>
              </button>

              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="text-xs text-[var(--text-muted,#888888)] hover:text-[var(--accent,#C7F464)] flex items-center gap-1 underline cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Terms of Service</span>
              </button>
            </div>
          </div>
        </section>

        {/* Privacy Policy Modal */}
        <AnimatePresence>
          {privacyOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm max-h-[80vh] overflow-y-auto bg-[var(--bg-surface,#222222)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-5 space-y-3 text-xs"
              >
                <h3 className="text-sm font-bold text-[var(--text-primary,#F5F4F0)]">Privacy Policy</h3>
                <div className="space-y-2 text-[var(--text-muted,#888888)] leading-relaxed">
                  <p>
                    All video processing, upscaling, color grading, and frame synthesis run strictly according to your selected parameters.
                  </p>
                  <p>
                    Your media is private, never uploaded to third-party public repositories, and can be removed at any time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(false)}
                  className="w-full h-10 mt-3 rounded-xl bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-bold text-xs cursor-pointer"
                >
                  Close Privacy Policy
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Terms Modal */}
        <AnimatePresence>
          {termsOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm max-h-[80vh] overflow-y-auto bg-[var(--bg-surface,#222222)] border border-[var(--border-subtle,#2f2f2f)] rounded-2xl p-5 space-y-3 text-xs"
              >
                <h3 className="text-sm font-bold text-[var(--text-primary,#F5F4F0)]">Terms of Service</h3>
                <div className="space-y-2 text-[var(--text-muted,#888888)] leading-relaxed">
                  <p>
                    By using ELITE MATRIX Studio, you confirm that you own or have obtained appropriate licenses to remaster, grade, and transcode uploaded video footage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTermsOpen(false)}
                  className="w-full h-10 mt-3 rounded-xl bg-[var(--accent,#C7F464)] text-[var(--accent-text,#121808)] font-bold text-xs cursor-pointer"
                >
                  Close Terms
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Developer Credit */}
        <div className="pt-2 pb-4 text-center">
          <p className="text-xs text-[var(--text-muted,#888888)] flex items-center justify-center gap-1.5 font-medium">
            <span>Made with</span>
            <span className="text-red-500">❤️</span>
            <span>by</span>
            <span className="font-semibold text-[var(--accent,#C7F464)]">Rahul Shah</span>
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};
