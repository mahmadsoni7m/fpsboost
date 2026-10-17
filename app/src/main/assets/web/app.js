(() => {
  const $ = id => document.getElementById(id);
  const fileInput = $('file'), video = $('video'), canvas = $('canvas'), ctx = canvas.getContext('2d', {alpha:false});
  let sourceUrl = null, raf = 0, recording = false, outputUrl = null;
  const controls = ['brightness','contrast','saturation','sharp'];
  controls.forEach(id => $(id).addEventListener('input', () => {
    $(id+'Val').textContent = $(id).value + '%';
    drawFrame();
  }));
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0]; if (!file) return;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = URL.createObjectURL(file); video.src = sourceUrl;
    $('fileInfo').classList.remove('hidden');
    $('fileInfo').textContent = `${file.name} · ${(file.size/1024/1024).toFixed(1)} MB · original remains unchanged`;
    $('previewWrap').classList.remove('hidden'); $('export').disabled = false;
    $('download').classList.add('hidden'); video.load();
    video.onloadedmetadata = () => {
      canvas.width = Math.min(video.videoWidth || 1280, 1920);
      canvas.height = Math.round(canvas.width * (video.videoHeight || 720) / (video.videoWidth || 1280));
      drawFrame();
    };
    video.onerror = () => setStatus('This video format cannot be decoded by this device/browser.');
  });
  function drawFrame() {
    if (!video.videoWidth || !canvas.width) return;
    const b = Number($('brightness').value), c = Number($('contrast').value), s = Number($('saturation').value);
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    // Subtle edge overlay gives a sharpening-style appearance; it is not AI restoration.
    const sharp = Number($('sharp').value)/100;
    if (sharp > 0.01) {
      ctx.globalAlpha = Math.min(sharp * .38, .22);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
  }
  video.addEventListener('play', () => { cancelAnimationFrame(raf); const loop = () => { drawFrame(); if (!video.paused && !video.ended) raf = requestAnimationFrame(loop); }; loop(); });
  $('play').addEventListener('click', async () => {
    if (video.paused) { try { await video.play(); $('play').textContent='Ⅱ'; } catch(e) { setStatus('Tap play again to start preview.'); } }
    else { video.pause(); $('play').textContent='▶'; }
  });
  video.addEventListener('pause', () => $('play').textContent='▶');
  function setStatus(t) { $('status').textContent = t; }
  $('export').addEventListener('click', async () => {
    if (!video.src || recording) return;
    const streamCapture = canvas.captureStream ? canvas.captureStream(Number($('fps').value)) : null;
    if (!streamCapture || !window.MediaRecorder) { setStatus('Export recording is not supported in this browser. Try a recent Chrome/WebView.'); $('progressArea').classList.remove('hidden'); return; }
    const mime = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    if (!mime) { setStatus('No supported WebM recorder found on this device.'); $('progressArea').classList.remove('hidden'); return; }
    recording = true; $('export').disabled = true; $('progressArea').classList.remove('hidden'); $('download').classList.add('hidden');
    $('progressBar').style.width='0%'; $('progressPct').textContent='0%'; $('progressText').textContent='Recording enhanced video…';
    let chunks = []; const kbps = Number($('quality').value)*1000;
    let recorder;
    try { recorder = new MediaRecorder(streamCapture, {mimeType:mime, videoBitsPerSecond:kbps}); }
    catch(e) { recording=false; $('export').disabled=false; setStatus('Recorder could not start on this device.'); return; }
    recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onerror = () => { recording=false; $('export').disabled=false; setStatus('Recording failed. Try a lower FPS or shorter clip.'); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, {type:mime}); if (outputUrl) URL.revokeObjectURL(outputUrl); outputUrl = URL.createObjectURL(blob);
      const a = $('download'); a.href=outputUrl; a.download='clarityboost-enhanced.webm'; a.classList.remove('hidden');
      // Keep the completed Blob available for Android's native Save dialog.
      window.__clarityBoostExportBlob = blob;
      window.__clarityBoostExportName = 'clarityboost-enhanced.webm';
      $('progressBar').style.width='100%'; $('progressPct').textContent='100%'; $('progressText').textContent='Export ready';
      setStatus(`Output ${(blob.size/1024/1024).toFixed(1)} MB · WebM · source untouched. Tap Save enhanced video to save it.`);
      streamCapture.getTracks().forEach(t => t.stop()); recording=false; $('export').disabled=false;
    };
    const oldTime = video.currentTime, wasPlaying = !video.paused;
    video.pause(); video.currentTime = 0;
    await new Promise(resolve => { if (video.readyState >= 2) resolve(); else video.oncanplay = resolve; });
    drawFrame(); recorder.start(500);
    const duration = video.duration || 1; video.play().catch(()=>{});
    const timer = setInterval(() => {
      const p = Math.min(99, Math.round(video.currentTime/duration*100));
      $('progressBar').style.width=p+'%'; $('progressPct').textContent=p+'%';
      if (video.ended || video.currentTime >= duration) {
        clearInterval(timer); video.pause(); if (recorder.state !== 'inactive') recorder.stop();
        video.currentTime = Math.min(oldTime, duration); if (wasPlaying) video.play().catch(()=>{});
      }
    }, 200);
  });

  $('download').addEventListener('click', async (event) => {
    const blob = window.__clarityBoostExportBlob;
    if (window.AndroidSave && blob) {
      event.preventDefault();
      try {
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        window.AndroidSave.saveBase64(btoa(binary), window.__clarityBoostExportName || 'clarityboost-enhanced.webm');
      } catch (e) {
        setStatus('Could not prepare file for Android save dialog. Try exporting a shorter clip.');
      }
    }
  });

  window.addEventListener('beforeunload', () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); if (outputUrl) URL.revokeObjectURL(outputUrl); });
})();