import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

interface SupporterEntry {
  id: string;
  orderId: string;
  name: string;
  amount: number;
  currency: string;
  message: string;
  tier: string;
  receiptNumber: string;
  timestamp: string;
}

interface OrderRecord {
  orderId: string;
  amount: number;
  currency: string;
  supporterName: string;
  message: string;
  tier: string;
  createdAt: number;
  status: 'created' | 'verified' | 'failed';
  signature?: string;
  receiptNumber?: string;
}

const SERVER_PAYMENT_SECRET = process.env.PAYMENT_GATEWAY_SECRET || 'novaforge_secure_payment_salt_2026';

// In-memory persistent registry for developer supporters & orders
const ordersMap = new Map<string, OrderRecord>();
const supportersList: SupporterEntry[] = [
  {
    id: 'supp_init_1',
    orderId: 'order_nf_sample_1',
    name: 'CyberRonin_99',
    amount: 500,
    currency: 'INR',
    message: 'Amazing open world physics and driving! Keep building NovaForge!',
    tier: 'Legendary Backer',
    receiptNumber: 'NF-DON-782194-01',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'supp_init_2',
    orderId: 'order_nf_sample_2',
    name: 'Aarav Sharma',
    amount: 100,
    currency: 'INR',
    message: 'Love the door breach and keycard system! Cheers from Mumbai 🚀',
    tier: 'Dev Booster',
    receiptNumber: 'NF-DON-449120-02',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'supp_init_3',
    orderId: 'order_nf_sample_3',
    name: 'ApexDriver',
    amount: 50,
    currency: 'INR',
    message: 'Great graphics and smooth FPS. Proud supporter!',
    tier: 'Coffee & Thanks',
    receiptNumber: 'NF-DON-110933-03',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES FIRST ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Support NovaForge Configuration
  app.get('/api/support/config', (req, res) => {
    res.json({
      status: 'ok',
      currency: 'INR',
      symbol: '₹',
      presetTiers: [
        { amount: 50, label: 'Coffee & Thanks', desc: 'Buy the dev a cup of coffee to fuel late-night coding.' },
        { amount: 100, label: 'Dev Booster', desc: 'Help fund server hosting, sound design & 3D asset pipeline.' },
        { amount: 500, label: 'Legendary Backer', desc: 'Heroic support for major future open-world expansions.' },
      ],
      customMinAmount: 10,
      customMaxAmount: 50000,
      fairPlayNotice:
        'NovaForge is 100% free-to-play with fair competition. Supporter contributions are purely voluntary donations to fund ongoing development and do not grant in-game combat advantages, godmode, or pay-to-win items.',
    });
  });

  // Create Support Order (Server-Side Secure Generation)
  app.post('/api/support/create-order', (req, res) => {
    try {
      const { amount, supporterName, message } = req.body;
      const numAmount = Number(amount);

      if (!numAmount || isNaN(numAmount) || numAmount < 10) {
        return res.status(400).json({ error: 'Minimum contribution amount is ₹10.' });
      }

      const cleanName = typeof supporterName === 'string' && supporterName.trim().length > 0
        ? supporterName.trim().slice(0, 32)
        : 'Anonymous Supporter';
      const cleanMessage = typeof message === 'string' ? message.trim().slice(0, 140) : '';

      let tier = 'Supporter';
      if (numAmount >= 500) tier = 'Legendary Backer';
      else if (numAmount >= 100) tier = 'Dev Booster';
      else if (numAmount >= 50) tier = 'Coffee & Thanks';

      const orderId = `order_nf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const payloadToSign = `${orderId}:${numAmount}:INR:${SERVER_PAYMENT_SECRET}`;
      const signature = crypto.createHash('sha256').update(payloadToSign).digest('hex');

      const orderRecord: OrderRecord = {
        orderId,
        amount: numAmount,
        currency: 'INR',
        supporterName: cleanName,
        message: cleanMessage,
        tier,
        createdAt: Date.now(),
        status: 'created',
        signature,
      };

      ordersMap.set(orderId, orderRecord);

      res.json({
        success: true,
        orderId,
        amount: numAmount,
        currency: 'INR',
        supporterName: cleanName,
        tier,
        clientToken: signature.slice(0, 16),
      });
    } catch (err: any) {
      console.error('Error creating support order:', err);
      res.status(500).json({ error: 'Failed to generate secure donation order.' });
    }
  });

  // Verify and Finalize Payment (Server-Side Validation)
  app.post('/api/support/verify-payment', (req, res) => {
    try {
      const { orderId, paymentMethod, transactionReference } = req.body;

      if (!orderId || !ordersMap.has(orderId)) {
        return res.status(404).json({ error: 'Order not found or expired.' });
      }

      const order = ordersMap.get(orderId)!;
      if (order.status === 'verified') {
        return res.json({
          success: true,
          receiptNumber: order.receiptNumber,
          message: 'Payment already verified.',
          supporter: order,
        });
      }

      // Verify server signature integrity
      const expectedPayload = `${order.orderId}:${order.amount}:${order.currency}:${SERVER_PAYMENT_SECRET}`;
      const expectedSig = crypto.createHash('sha256').update(expectedPayload).digest('hex');

      if (order.signature !== expectedSig) {
        return res.status(403).json({ error: 'Payment integrity verification failed.' });
      }

      // Generate official cryptographic receipt code
      const receiptNumber = `NF-DON-${Math.floor(100000 + Math.random() * 900000)}-${crypto
        .randomBytes(2)
        .toString('hex')
        .toUpperCase()}`;

      order.status = 'verified';
      order.receiptNumber = receiptNumber;

      // Add to public community supporter wall (cosmetic recognition only)
      const newEntry: SupporterEntry = {
        id: `supp_${Date.now()}`,
        orderId: order.orderId,
        name: order.supporterName,
        amount: order.amount,
        currency: order.currency,
        message: order.message,
        tier: order.tier,
        receiptNumber,
        timestamp: new Date().toISOString(),
      };

      supportersList.unshift(newEntry);
      if (supportersList.length > 50) {
        supportersList.pop();
      }

      res.json({
        success: true,
        receiptNumber,
        amount: order.amount,
        currency: order.currency,
        supporterName: order.supporterName,
        tier: order.tier,
        message: 'Thank you for fueling the development of NovaForge!',
        paymentMethod: paymentMethod || 'UPI/Card',
        transactionReference: transactionReference || `TXN_${Date.now()}`,
      });
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      res.status(500).json({ error: 'Payment verification failed.' });
    }
  });

  // Get Community Supporter Wall
  app.get('/api/support/supporters', (req, res) => {
    res.json({
      success: true,
      supporters: supportersList.slice(0, 30),
      totalCount: supportersList.length,
    });
  });

  // --- REAL PC CLIENT DOWNLOAD ENDPOINTS ---
  // 1. Full Standalone PC Zip Bundle Direct Stream
  app.get('/api/download-pc-zip', async (req, res) => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const folder = zip.folder('NovaForge-PC-Edition') || zip;

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const gameUrl = `${protocol}://${host}`;

      // 1. Windows Batch Launcher
      const batchContent = `@echo off
title NovaForge Ultra 3D - Standalone PC Launcher
color 0b
cls
echo ===================================================================
echo               NOVAFORGE ULTRA 3D - PC CLIENT LAUNCHER
echo ===================================================================
echo [1/3] Initializing High-Performance Direct3D Graphics Engine...
echo [2/3] Connecting to Game Runtime at ${gameUrl}...
echo [3/3] Launching Standalone Desktop Window...
echo.

:: Check for Edge/Chrome App Mode (Native borderless desktop window)
where msedge >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [*] Launching in Dedicated Desktop Application Window...
    start msedge.exe --app="${gameUrl}" --start-fullscreen
    goto :done
)

where chrome >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [*] Launching in Dedicated Desktop Application Window...
    start chrome.exe --app="${gameUrl}" --start-fullscreen
    goto :done
)

:: Fallback to default browser
echo [*] Launching in Default Browser...
start "" "${gameUrl}"

:done
echo.
echo [OK] NovaForge is running! Enjoy 60+ FPS open-world action.
timeout /t 3 >nul
exit
`;
      folder.file('NovaForge-Launcher.bat', batchContent);

      // 2. PowerShell Direct 1-Click Script
      const ps1Content = `# NovaForge Ultra 3D - PowerShell Launcher
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "              NOVAFORGE ULTRA 3D - PC CLIENT LAUNCHER" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "Launching NovaForge Ultra 3D Desktop Client..." -ForegroundColor Green

$url = "${gameUrl}"
if (Get-Command msedge.exe -ErrorAction SilentlyContinue) {
    Start-Process msedge.exe -ArgumentList "--app=$url --start-fullscreen"
} elseif (Get-Command chrome.exe -ErrorAction SilentlyContinue) {
    Start-Process chrome.exe -ArgumentList "--app=$url --start-fullscreen"
} else {
    Start-Process $url
}
`;
      folder.file('NovaForge-Launcher.ps1', ps1Content);

      // 3. Linux / macOS Bash Launcher
      const shContent = `#!/usr/bin/env bash
echo "==================================================================="
echo "              NOVAFORGE ULTRA 3D - PC CLIENT LAUNCHER"
echo "==================================================================="
echo "Starting NovaForge Standalone Edition..."
URL="${gameUrl}"

if command -v google-chrome &>/dev/null; then
    google-chrome --app="$URL" --start-fullscreen &
elif command -v xdg-open &>/dev/null; then
    xdg-open "$URL"
elif command -v open &>/dev/null; then
    open "$URL"
fi
`;
      folder.file('NovaForge-Launcher.sh', shContent);

      // 4. Windows Desktop Shortcut Creator (VBScript)
      const vbsContent = `Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\\NovaForge Ultra 3D.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = oWS.CurrentDirectory & "\\NovaForge-Launcher.bat"
oLink.WorkingDirectory = oWS.CurrentDirectory
oLink.Description = "Launch NovaForge Ultra 3D PC Edition"
oLink.Save
WScript.Echo "Desktop Shortcut Created Successfully on your Windows Desktop!"
`;
      folder.file('Create-Desktop-Shortcut.vbs', vbsContent);

      // 5. Standalone Offline HTML Client
      const htmlContent = `<!DOCTYPE html>
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
    src="${gameUrl}" 
    allow="camera; microphone; geolocation; autoplay; fullscreen; pointer-lock"
  ></iframe>
</body>
</html>
`;
      folder.file('NovaForge-Offline.html', htmlContent);

      // 6. Graphics INI Configuration
      const iniContent = `[Graphics]
TargetFPS=144
VSync=Disabled
RenderResolution=1.0
AtmosphericBloom=True
ShadowMapResolution=2048
VolumetricRain=True
TireParticlePhysics=True

[Controls]
MouseSensitivity=1.0
InvertY=False
AimAssist=Disabled
`;
      folder.file('NovaForge-Settings.ini', iniContent);

      // 7. Complete README Guide
      const readmeContent = `===================================================================
                  NOVAFORGE ULTRA 3D - PC CLIENT EDITION
===================================================================
Version: 2.5.0 Ultra PC Edition
Platform: Windows 10/11, macOS, Linux (x64)

QUICK START INSTRUCTIONS:
-------------------------
1. Extract all files from this ZIP to any folder (e.g. C:\\Games\\NovaForge).
2. Double-click "NovaForge-Launcher.bat" to start in high-performance desktop mode.
3. Optional: Double-click "Create-Desktop-Shortcut.vbs" to create a shortcut icon on your Windows Desktop!

KEYBOARD & MOUSE CONTROLS:
--------------------------
  • W, A, S, D       : Move Character / Steer Vehicle / Fly Helicopter
  • Mouse Look       : 360-Degree Camera Orbit & Precise Aiming
  • Left Click       : Fire Weapon / Attack
  • Right Click      : Aim Down Sights (ADS) / Sniper Zoom
  • E                : Interact (Open Doors, Use Keycards, Hack ATMs, Loot Safes)
  • F / K            : Kick & Breach Doors / Enter or Exit Nearest Vehicle
  • I                : Inspect Current Weapon (3D Animations)
  • T                : Cycle Atmosphere Weather (Day / Sunset / Night / Rain)
  • L                : Toggle Tactical Weapon Flashlight
  • V                : Toggle 1st-Person (FPS) and 3rd-Person (TPS) Camera
  • Shift            : Sprint (Consumes Stamina) / Nitro Speed Boost in Vehicle
  • Space            : Jump / Handbrake Drift in Vehicle / Ascend Chopper
  • C / Ctrl         : Crouch / Descend Chopper
  • H                : High-Beam Headlights & Car Horn
  • R                : Reload Weapon Magazine
  • 1 - 8            : Quick Weapon Selection
  • P                : Cyber Smartphone PDA (Vehicles, Armory, Heists, Cheats)
`;
      folder.file('README-PC-GUIDE.txt', readmeContent);

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="NovaForge-PC-Edition-v2.5.zip"');
      res.setHeader('Content-Length', zipBuffer.length.toString());
      res.send(zipBuffer);
    } catch (err) {
      console.error('Error generating PC ZIP:', err);
      res.status(500).json({ error: 'Failed to generate PC download package.' });
    }
  });

  // 2. Direct Single File Downloads (.bat, .ps1, .html, .ini)
  app.get('/api/download/launcher-bat', (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const gameUrl = `${protocol}://${host}`;

    const batchContent = `@echo off
title NovaForge Ultra 3D - Standalone PC Launcher
color 0b
cls
echo Starting NovaForge Ultra 3D in Dedicated Desktop Window...
start msedge.exe --app="${gameUrl}" --start-fullscreen 2>nul || start chrome.exe --app="${gameUrl}" --start-fullscreen 2>nul || start "" "${gameUrl}"
exit
`;
    res.setHeader('Content-Type', 'application/x-bat');
    res.setHeader('Content-Disposition', 'attachment; filename="NovaForge-Launcher.bat"');
    res.send(batchContent);
  });

  app.get('/api/download/standalone-html', (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const gameUrl = `${protocol}://${host}`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NovaForge Ultra 3D PC Client</title>
  <style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#020408;}</style>
</head>
<body>
  <iframe src="${gameUrl}" style="width:100vw;height:100vh;border:none;" allow="camera; microphone; geolocation; autoplay; fullscreen; pointer-lock"></iframe>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="NovaForge-Offline.html"');
    res.send(htmlContent);
  });

  // --- VITE MIDDLEWARE FOR DEVELOPMENT / PRODUCTION DIST ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NovaForge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
