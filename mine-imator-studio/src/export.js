/* ============================================================
   export.js — video (MediaRecorder), PNG frame sequence (ZIP),
   and project files. No server involved: everything is local.
   ============================================================ */
import JSZip from 'jszip';

export function pickVideoMime() {
  const list = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=h264',
    'video/mp4',
  ];
  for (const m of list) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return '';
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/** even-sized target resolution derived from the canvas aspect ratio */
export function targetSize(canvas, heightOption) {
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  const h = heightOption === 'src' ? canvas.clientHeight : Number(heightOption);
  let w = Math.round((h * aspect) / 2) * 2;
  let hh = Math.round(h / 2) * 2;
  w = Math.max(64, Math.min(w, 3840));
  hh = Math.max(64, Math.min(hh, 2160));
  return { w, h: hh };
}

/* ------------------------------------------------------------------ */
/**
 * Records the animation in real time from the canvas.
 * opts: { canvas, fps, totalFrames, setFrame(i), onProgress, cancelled() }
 */
export async function recordVideo(opts) {
  const { canvas, fps = 24, totalFrames, setFrame, onProgress = () => {}, cancelled = () => false } = opts;
  const mime = pickVideoMime();
  if (!mime) throw new Error('المتصفح لا يدعم تسجيل الفيديو / browser cannot record video');

  const stream = canvas.captureStream(fps);
  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  const done = new Promise((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime.split(';')[0] }));
    rec.onerror = (e) => reject(e.error || new Error('recorder error'));
  });

  rec.start(200);
  const t0 = performance.now();
  let frame = 0;
  while (frame < totalFrames) {
    if (cancelled()) break;
    const elapsed = (performance.now() - t0) / 1000;
    frame = Math.min(totalFrames - 1, Math.floor(elapsed * fps));
    setFrame(frame);
    onProgress(frame / totalFrames);
    await nextFrame();
  }
  // let the last frame land in the stream
  await sleep(Math.ceil(1000 / fps) + 60);
  rec.stop();
  stream.getTracks().forEach((t) => t.stop());
  const blob = await done;
  onProgress(1);
  return { blob, mime, ext: mime.includes('mp4') ? 'mp4' : 'webm' };
}

/* ------------------------------------------------------------------ */
/** renders every frame and packs the PNGs into a single ZIP */
export async function exportFrames(opts) {
  const {
    canvas, renderer, from = 0, to, step = 1, name = 'frames',
    coverFrame = 0, onProgress = () => {}, cancelled = () => false, renderScene,
  } = opts;
  const zip = new JSZip();
  const folder = zip.folder('frames');
  const pad = String(to).length + 1;
  let n = 0;
  const total = Math.floor((to - from) / step) + 1;
  for (let f = from; f <= to; f += step) {
    if (cancelled()) return null;
    renderScene(f, true);
    const dataUrl = canvas.toDataURL('image/png');
    folder.file(`${name}_${String(f).padStart(pad, '0')}.png`, dataUrl.split(',')[1], { base64: true });
    n++;
    onProgress(n / total);
    if (n % 3 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  // handy cover image next to the frames
  renderScene(coverFrame, true);
  zip.file(`${name}_cover.png`, canvas.toDataURL('image/png').split(',')[1], { base64: true });
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (m) => onProgress(m.percent / 100));
  return blob;
}

/** single PNG snapshot of the current view */
export function snapshot(canvas, filename = 'mine-imator-studio.png') {
  canvas.toBlob((b) => b && downloadBlob(b, filename), 'image/png');
}
