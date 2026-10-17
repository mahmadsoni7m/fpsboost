# ClarityBoost — Offline Video Enhancer

ClarityBoost is an offline-first Android + web starter project. The Android app loads its UI from local assets; video preview and browser-side processing do not upload videos to a server.

## What works in this starter
- Select a local video and preview it.
- Local canvas-based enhancement controls (brightness, contrast, saturation and sharpening-style edge overlay).
- Record/export the processed preview locally as WebM where the browser supports `MediaRecorder`.
- Select a target capture frame rate (30/60/120 FPS). This controls canvas capture rate; it does **not** perform AI frame interpolation or guarantee true 120-fps source motion.
- Original file is never overwritten.
- GitHub Actions workflow builds a debug APK.

## Important limitations
This is a functional offline prototype, not a full AI super-resolution engine. No AI model is bundled, so it does not claim to restore missing details or do neural 30→120 FPS interpolation. The WebView/browser decides which recording codecs and frame rates it can actually sustain. Android WebView commonly exports WebM, not MP4. The export may be larger or smaller depending on source and settings.

For real on-device AI upscaling/interpolation, add a licensed, device-compatible TFLite/ONNX model and a native MediaCodec/MediaMuxer pipeline. A 120-FPS output setting alone cannot create authentic intermediate motion.

## Build APK on GitHub
1. Create a GitHub repository and upload the contents of this ZIP to its root.
2. Open **Actions** and allow workflows if prompted.
3. Run **Build Android APK** (or push to `main`).
4. Download the `ClarityBoost-debug-apk` artifact from the completed workflow.

## Build locally
Requires JDK 17 and Android SDK. Run:
```bash
./gradlew assembleDebug
```
On Windows: `gradlew.bat assembleDebug`

## Web version
Open `web/index.html` in a modern browser. For best browser support, serve the folder from localhost or GitHub Pages; processing remains on the device. GitHub Pages is static hosting, not a video-processing server.
