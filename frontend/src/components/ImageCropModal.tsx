import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { motion } from 'framer-motion';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface CropArea { x: number; y: number; width: number; height: number; }

interface Props {
  imageSrc: string;
  onDone: (blob: Blob, sizeKB: number) => void;
  onCancel: () => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

async function cropAndCompress(src: string, area: CropArea): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  // 1200×630 — optimal for WhatsApp/OG previews
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, 1200, 630);

  // Reduce quality until ≤ 500 KB
  for (const q of [0.88, 0.75, 0.62, 0.5]) {
    const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', q));
    if (blob.size <= 512_000 || q === 0.5) return blob;
  }
  return new Promise(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.5));
}

export const ImageCropModal = ({ imageSrc, onDone, onCancel }: Props) => {
  const [crop,   setCrop]   = useState({ x: 0, y: 0 });
  const [zoom,   setZoom]   = useState(1);
  const [area,   setArea]   = useState<CropArea | null>(null);
  const [busy,   setBusy]   = useState(false);

  const onCropComplete = useCallback((_: CropArea, pixels: CropArea) => setArea(pixels), []);

  const handleConfirm = async () => {
    if (!area) return;
    setBusy(true);
    try {
      const blob = await cropAndCompress(imageSrc, area);
      onDone(blob, Math.round(blob.size / 1024));
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" dir="rtl">
        <button onClick={onCancel}
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-[15px]">חתוך תמונה</p>
          <p className="text-white/40 text-[11px]">גרור · צבוט לזום</p>
        </div>
        <button onClick={handleConfirm} disabled={busy}
          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50">
          {busy
            ? <div className="w-4 h-4 border-2 border-charcoal-300 border-t-charcoal-900 rounded-full animate-spin" />
            : <Check className="w-5 h-5 text-charcoal-900" strokeWidth={2.5} />}
        </button>
      </div>

      {/* Crop area — fills remaining space */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={16 / 9}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={false}
          style={{
            containerStyle: { background: '#000' },
            cropAreaStyle: { border: '2px solid rgba(255,255,255,0.75)', borderRadius: 10 },
          }}
        />
      </div>

      {/* Zoom slider */}
      <div className="px-6 pt-5 pb-3 flex items-center gap-3 flex-shrink-0">
        <ZoomOut className="w-4 h-4 text-white/50 flex-shrink-0" />
        <input
          type="range" min={1} max={3} step={0.01}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="flex-1"
          style={{ accentColor: 'white' }}
        />
        <ZoomIn className="w-4 h-4 text-white/50 flex-shrink-0" />
      </div>

      <p className="text-center text-white/30 text-[11px] pb-5 flex-shrink-0">
        יחס 16:9 — מותאם לתצוגה בוואטסאפ
      </p>
    </motion.div>,
    document.body
  );
};
