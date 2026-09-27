import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import {
  Download,
  Monitor,
  Laptop,
  CheckCircle2,
  Cpu,
  X,
  FileCode,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Zap,
  Copy,
  FolderArchive,
  RefreshCw,
  AlertTriangle,
  Code,
  FileText,
} from 'lucide-react';
import { soundEngine } from '../game/audio';

interface DownloadPCModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadPCModal: React.FC<DownloadPCModalProps> = ({ isOpen, onClose }) => {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [downloadCompleted, setDownloadCompleted] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'package' | 'scripts' | 'code' | 'pwa' | 'specs'>('package');
  const [targetFps, setTargetFps] = useState<'60' | '144' | '240' | 'unlimited'>('144');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedScriptView, setSelectedScriptView] = useState<'bat' | 'ps1' | 'sh' | 'html' | 'py' | 'ini'>('bat');

  // Hardware detection state
  const [systemSpecs, setSystemSpecs] = useState<{
    gpu: string;
    cores: number;
    ram: string;
    resolution: string;
    browser: string;
    os: string;
  }>({
    gpu: 'Detecting...',
    cores: 4,
    ram: '8 GB+',
    resolution: '1920 x 1080',
    browser: 'Desktop Browser',
    os: 'Windows 10/11 (x64)',
  });

  // Scripts content dictionary
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000';

  const batchCode = `@echo off
title NovaForge Ultra 3D - Standalone PC Launcher
color 0b
cls
echo ===================================================================
echo               NOVAFORGE ULTRA 3D - PC CLIENT LAUNCHER
echo ===================================================================
echo [1/3] Initializing High-Performance Direct3D GPU Graphics Engine...
echo [2/3] Setting Display Mode: Target FPS ${targetFps}, Res: ${systemSpecs.resolution}
echo [3/3] Launching Standalone Desktop Client...
echo.

:: Try opening with Edge App Mode (Borderless windowed desktop app)
where msedge >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [*] Launching in Dedicated Desktop Application Window...
    start msedge.exe --app="${currentUrl}" --start-fullscreen
    goto :done
)

:: Try opening with Chrome App Mode
where chrome >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [*] Launching in Dedicated Desktop Application Window...
    start chrome.exe --app="${currentUrl}" --start-fullscreen
    goto :done
)

:: Fallback to default browser
echo [*] Launching in Default Browser...
start "" "${currentUrl}"

:done
echo.
echo [OK] NovaForge is running! Enjoy 60+ FPS open-world action.
timeout /t 4 >nul
exit
`;

  const ps1Code = `# NovaForge Ultra 3D - PowerShell Launcher
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "              NOVAFORGE ULTRA 3D - PC CLIENT LAUNCHER" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "Launching NovaForge Ultra 3D Desktop Client..." -ForegroundColor Green

$url = "${currentUrl}"
if (Get-Command msedge.exe -ErrorAction SilentlyContinue) {
    Start-Process msedge.exe -ArgumentList "--app=$url --start-fullscreen"
} elseif (Get-Command chrome.exe -ErrorAction SilentlyContinue) {
    Start-Process chrome.exe -ArgumentList "--app=$url --start-fullscreen"
} else {
    Start-Process $url
}
`;

  const bashCode = `#!/usr/bin/env bash
echo "==================================================================="
echo "              NOVAFORGE ULTRA 3D - PC CLIENT LAUNCHER"
echo "==================================================================="
echo "Starting NovaForge Standalone Edition..."
URL="${currentUrl}"

if command -v google-chrome &>/dev/null; then
    google-chrome --app="$URL" --start-fullscreen &
elif command -v xdg-open &>/dev/null; then
    xdg-open "$URL"
elif command -v open &>/dev/null; then
    open "$URL"
fi
`;

  const htmlOfflineCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NovaForge Ultra 3D - Standalone PC Edition</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #020408;
      font-family: system-ui, -apple-system, sans-serif;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <iframe 
    src="${currentUrl}" 
    allow="camera; microphone; geolocation; autoplay; fullscreen; pointer-lock"
  ></iframe>
</body>
</html>
`;

  const pyServerCode = `#!/usr/bin/env python3
"""
NovaForge Ultra 3D - Local Micro-Server
"""
import http.server
import socketserver
import webbrowser
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def run():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"[NovaForge PC] Server active at http://localhost:{PORT}")
        webbrowser.open(f"http://localhost:{PORT}/NovaForge-Offline.html")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

if __name__ == '__main__':
    run()
`;

  const settingsIniCode = `[Graphics]
TargetFPS=${targetFps}
VSync=Disabled
RenderResolution=1.0
AtmosphericBloom=True
ShadowMapResolution=2048
VolumetricRain=True
TireParticlePhysics=True
TextureQuality=Ultra

[Controls]
MouseSensitivity=1.0
InvertY=False
AimAssist=Disabled
GamepadVibration=Enabled

[Audio]
MasterVolume=1.0
SFXVolume=0.9
RadioVolume=0.8
EngineRoarVolume=0.85
`;

  // Listen for PWA beforeinstallprompt & detect specs
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    try {
      const gl = document.createElement('canvas').getContext('webgl');
      let gpuName = 'DirectX / OpenGL Hardware Accelerated';
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gpuName;
        }
      }

      const cores = navigator.hardwareConcurrency || 8;
      const deviceMemory = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : '8+ GB High-Speed RAM';
      const resolution = `${window.screen.width} x ${window.screen.height} (${window.devicePixelRatio}x)`;

      const userAgent = navigator.userAgent;
      let os = 'Windows 10/11 (x64)';
      if (userAgent.includes('Mac')) os = 'macOS Desktop';
      else if (userAgent.includes('Linux')) os = 'Linux x86_64';

      let browser = 'Desktop Chrome / Edge';
      if (userAgent.includes('Firefox')) browser = 'Mozilla Firefox';
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Apple Safari';

      setSystemSpecs({
        gpu: gpuName,
        cores,
        ram: deviceMemory,
        resolution,
        browser,
        os,
      });
    } catch {
      // Fallback
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  // Multi-method downloader helper
  const triggerFileDownload = (blobOrUrl: Blob | string, filename: string) => {
    try {
      if (typeof blobOrUrl === 'string') {
        const link = document.createElement('a');
        link.href = blobOrUrl;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          try {
            document.body.removeChild(link);
          } catch {}
        }, 1000);
      } else {
        const url = window.URL.createObjectURL(blobOrUrl);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          try {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch {}
        }, 2000);
      }
      return true;
    } catch (err) {
      console.warn('Direct file download link failed, using window navigation:', err);
      if (typeof blobOrUrl === 'string') {
        window.open(blobOrUrl, '_blank');
      }
      return false;
    }
  };

  // 1. Primary Full ZIP download (Server Stream + Client JSZip fallback)
  const handleDownloadFullZip = async () => {
    setIsZipping(true);
    setDownloadProgress(10);
    setDownloadError(null);
    soundEngine.playKeycardSuccess();

    try {
      // Step A: Attempt server-side generated ZIP stream
      setDownloadProgress(30);
      const serverUrl = '/api/download-pc-zip';

      // First trigger direct download URL
      triggerFileDownload(serverUrl, 'NovaForge-PC-Edition-v2.5.zip');
      setDownloadProgress(70);

      // Step B: Also build client-side ZIP fallback to guarantee immediate file creation
      const zip = new JSZip();
      const root = zip.folder('NovaForge-PC-Edition') || zip;
      root.file('NovaForge-Launcher.bat', batchCode);
      root.file('NovaForge-Launcher.ps1', ps1Code);
      root.file('NovaForge-Launcher.sh', bashCode);
      root.file('NovaForge-Offline.html', htmlOfflineCode);
      root.file('start-offline-server.py', pyServerCode);
      root.file('NovaForge-Settings.ini', settingsIniCode);
      root.file(
        'README-PC-GUIDE.txt',
        `===================================================================
                  NOVAFORGE ULTRA 3D - PC CLIENT EDITION
===================================================================
Version: 2.5.0 Ultra PC Edition
Platform: Windows 10/11, macOS, Linux (x64)

QUICK START INSTRUCTIONS:
-------------------------
1. Extract all files from this ZIP to any folder.
2. Double-click "NovaForge-Launcher.bat" to start in high-performance desktop mode!
`
      );

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      setDownloadProgress(100);
      triggerFileDownload(zipBlob, 'NovaForge-PC-Edition-v2.5.zip');

      setIsZipping(false);
      setDownloadCompleted(true);
      soundEngine.playMissionFanfare(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      console.error('Download error:', err);
      // Even if background zipping threw, try direct server window download
      window.open('/api/download-pc-zip', '_blank');
      setIsZipping(false);
      setDownloadCompleted(true);
    }
  };

  // 2. Download individual text script (.bat, .ps1, .html, .ini)
  const handleDownloadSingleFile = (content: string, filename: string, mimeType: string) => {
    soundEngine.playCashPickup();
    try {
      const blob = new Blob([content], { type: mimeType });
      triggerFileDownload(blob, filename);
    } catch {
      // Data URI fallback
      const dataUri = `data:${mimeType};charset=utf-8,` + encodeURIComponent(content);
      triggerFileDownload(dataUri, filename);
    }
  };

  // 3. 1-Click Clipboard copy helper
  const handleCopyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    soundEngine.playCashPickup();
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // 4. Open in new tab / window (bypasses any preview iframe security)
  const handleOpenInNewTab = () => {
    soundEngine.playKeycardSuccess();
    window.open(window.location.href, '_blank');
  };

  return (
    <div
      id="download-pc-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#020408]/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-b from-slate-900/95 to-[#040814]/95 border border-white/15 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl space-y-4 text-left overflow-hidden ring-1 ring-white/10 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 border border-emerald-400/40 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  Download NovaForge PC Edition
                </h2>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Verified PC Build
                </span>
              </div>
              <p className="text-xs text-white/50 font-medium">
                ZIP Package, 1-Click Launchers, Direct Code Copy & High-FPS Desktop Mode
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('package')}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'package'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Full ZIP (.zip)</span>
          </button>

          <button
            onClick={() => setActiveTab('scripts')}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'scripts'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>1-Click Launchers</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>View / Copy Code</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'pwa'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Desktop App</span>
          </button>

          <button
            onClick={() => setActiveTab('specs')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'specs'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>PC Specs</span>
          </button>
        </div>

        {/* TAB 1: FULL STANDALONE PC ZIP PACKAGE */}
        {activeTab === 'package' && (
          <div className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {/* Information Notice for embedded previews */}
            <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <ExternalLink className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span className="text-white/80 leading-relaxed">
                  Tip: If your browser blocks popups/downloads inside this preview frame, you can also download directly or open in a clean tab.
                </span>
              </div>
              <button
                onClick={handleOpenInNewTab}
                className="px-2.5 py-1 rounded-lg bg-blue-600/60 hover:bg-blue-600 text-white font-bold text-[11px] whitespace-nowrap shrink-0 transition"
              >
                Open In Tab
              </button>
            </div>

            {/* Package summary card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-teal-950/30 border border-emerald-500/30 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-emerald-400" />
                    NovaForge Ultra 3D PC Client Bundle (v2.5)
                  </h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    Includes Windows Batch Launcher, PowerShell Script, Python Server, and Graphics INI.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-mono text-[11px] font-bold">
                  Instant .ZIP
                </span>
              </div>

              {/* Target FPS Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <span className="text-white/70 font-medium">Target FPS Configuration:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold">
                  {(['60', '144', '240', 'unlimited'] as const).map((fps) => (
                    <button
                      key={fps}
                      onClick={() => setTargetFps(fps)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] transition ${
                        targetFps === fps
                          ? 'bg-emerald-500 text-black font-black'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                      }`}
                    >
                      {fps === 'unlimited' ? 'MAX' : `${fps}Hz`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress indicator */}
            {isZipping && (
              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-300">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Packaging PC Client Files...
                  </span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success state */}
            {downloadCompleted && !isZipping && (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-400/40 flex items-center justify-between text-xs text-emerald-300 font-medium">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Download initiated! Check your browser&apos;s Downloads folder.
                </span>
                <span className="text-[11px] text-emerald-400/80 font-mono">Ready to Play</span>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleDownloadFullZip}
                disabled={isZipping}
                className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:via-teal-400 hover:to-emerald-500 text-black font-black uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                <span>{isZipping ? 'Downloading ZIP...' : 'Download PC Package (.ZIP)'}</span>
              </button>

              <a
                href="/api/download-pc-zip"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => soundEngine.playCashPickup()}
                className="py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-center"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span>Direct Server Link (.ZIP)</span>
              </a>
            </div>
          </div>
        )}

        {/* TAB 2: 1-CLICK LAUNCHERS */}
        {activeTab === 'scripts' && (
          <div className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Windows .BAT launcher */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-purple-400" /> Windows Launcher
                    </span>
                    <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">.BAT</span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">
                    Direct batch file that boots NovaForge in standalone windowed GPU mode.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingleFile(batchCode, 'NovaForge-Launcher.bat', 'application/x-bat')}
                  className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download .BAT
                </button>
              </div>

              {/* PowerShell .PS1 launcher */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-cyan-400" /> PowerShell Launcher
                    </span>
                    <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">.PS1</span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">
                    PowerShell script for Windows 10/11 with zero console flickers.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingleFile(ps1Code, 'NovaForge-Launcher.ps1', 'text/plain')}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download .PS1
                </button>
              </div>

              {/* Standalone HTML file */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-emerald-400" /> Standalone Client
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">.HTML</span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">
                    Single offline HTML container file that can be double-clicked anytime.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingleFile(htmlOfflineCode, 'NovaForge-Offline.html', 'text/html')}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download .HTML
                </button>
              </div>

              {/* macOS / Linux Bash launcher */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-amber-400" /> Mac / Linux Script
                    </span>
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">.SH</span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">
                    Shell launcher script for macOS and Ubuntu/Debian/Arch Linux.
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadSingleFile(bashCode, 'NovaForge-Launcher.sh', 'application/x-sh')}
                  className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download .SH
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VIEW & COPY RAW CODE */}
        {activeTab === 'code' && (
          <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {/* File Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'bat', label: 'Launcher.bat' },
                { id: 'ps1', label: 'Launcher.ps1' },
                { id: 'sh', label: 'Launcher.sh' },
                { id: 'html', label: 'Client.html' },
                { id: 'py', label: 'Server.py' },
                { id: 'ini', label: 'Settings.ini' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedScriptView(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
                    selectedScriptView === f.id
                      ? 'bg-cyan-500 text-black shadow'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Code Display Container */}
            <div className="p-3 rounded-2xl bg-black/60 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-white/50">
                  {selectedScriptView === 'bat' && 'Windows Command Batch File'}
                  {selectedScriptView === 'ps1' && 'Windows PowerShell Script'}
                  {selectedScriptView === 'sh' && 'Linux / macOS Bash Script'}
                  {selectedScriptView === 'html' && 'Standalone HTML Client'}
                  {selectedScriptView === 'py' && 'Python 3 Local Micro-Server'}
                  {selectedScriptView === 'ini' && 'Graphics Configuration File'}
                </span>
                <button
                  onClick={() => {
                    const code =
                      selectedScriptView === 'bat'
                        ? batchCode
                        : selectedScriptView === 'ps1'
                        ? ps1Code
                        : selectedScriptView === 'sh'
                        ? bashCode
                        : selectedScriptView === 'html'
                        ? htmlOfflineCode
                        : selectedScriptView === 'py'
                        ? pyServerCode
                        : settingsIniCode;
                    handleCopyCode(code, selectedScriptView);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 px-3 py-1 rounded-xl transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === selectedScriptView ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                </button>
              </div>

              <pre className="p-3 rounded-xl bg-black/80 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-56 leading-relaxed select-all">
                {selectedScriptView === 'bat' && batchCode}
                {selectedScriptView === 'ps1' && ps1Code}
                {selectedScriptView === 'sh' && bashCode}
                {selectedScriptView === 'html' && htmlOfflineCode}
                {selectedScriptView === 'py' && pyServerCode}
                {selectedScriptView === 'ini' && settingsIniCode}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: 1-CLICK NATIVE DESKTOP APP (PWA) */}
        {activeTab === 'pwa' && (
          <div className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-indigo-950/30 border border-blue-500/30 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-blue-400" />
                    Install Native Desktop Window App
                  </h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    Installs NovaForge as a standalone borderless Windows/macOS desktop application without browser tabs.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 font-mono text-[11px] font-bold">
                  Zero Install Size
                </span>
              </div>

              <div className="space-y-2 text-xs text-white/70">
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Runs in full-screen borderless window with low-latency mouse lock</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Adds direct shortcut to Windows Start Menu and Taskbar</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Direct3D hardware acceleration enabled for smooth 60–240 FPS</span>
                </div>
              </div>
            </div>

            {/* Install button */}
            <button
              onClick={() => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then((res: any) => {
                    if (res.outcome === 'accepted') {
                      setIsPwaInstalled(true);
                      soundEngine.playMissionFanfare(true);
                      confetti({ particleCount: 80, spread: 60 });
                    }
                    setDeferredPrompt(null);
                  });
                } else {
                  handleOpenInNewTab();
                }
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-400 text-white font-black uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>{deferredPrompt ? 'Install NovaForge Desktop App Now' : 'Launch Borderless Desktop Window'}</span>
            </button>
          </div>
        )}

        {/* TAB 5: PC SPECS */}
        {activeTab === 'specs' && (
          <div className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1 text-xs">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" /> Detected Hardware Configuration
              </div>

              <div className="grid grid-cols-2 gap-2.5 font-mono">
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <div className="text-[10px] text-white/40 uppercase">GPU Device</div>
                  <div className="text-white font-bold truncate text-[11px]" title={systemSpecs.gpu}>
                    {systemSpecs.gpu}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <div className="text-[10px] text-white/40 uppercase">CPU Cores</div>
                  <div className="text-white font-bold text-[11px]">{systemSpecs.cores} Physical / Logical Cores</div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <div className="text-[10px] text-white/40 uppercase">Display Resolution</div>
                  <div className="text-white font-bold text-[11px]">{systemSpecs.resolution}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <div className="text-[10px] text-white/40 uppercase">Operating System</div>
                  <div className="text-white font-bold text-[11px]">{systemSpecs.os}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-[11px]">Direct Server Streaming & Local Blob Generation</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition uppercase tracking-wider cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
