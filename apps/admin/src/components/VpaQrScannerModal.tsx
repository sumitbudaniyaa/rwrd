import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  QrCodeIcon,
  Camera01Icon,
  Upload01Icon,
  Alert01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { MotionButton, Badge } from '@tiptable/ui';
import { parseUpiQrString, VpaSchema } from '@tiptable/shared';

export interface VpaQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVpaCaptured: (vpa: string, payeeName?: string) => void;
}

/**
 * Parses raw text extracted from a QR code, checking for UPI deep link (upi://pay?pa=...)
 * or direct VPA pattern.
 */
export function extractVpaFromQrText(qrText: string): { vpa: string; payeeName?: string } | null {
  const trimmed = qrText.trim();
  if (!trimmed) return null;

  // 1. Try standard UPI deep link (upi://pay?pa=...)
  const parsedUpi = parseUpiQrString(trimmed);
  if (parsedUpi) {
    return parsedUpi;
  }

  // 2. Try URL query parameter extraction if url-like
  try {
    if (trimmed.includes('pa=')) {
      const url = new URL(
        trimmed.startsWith('http') || trimmed.startsWith('upi') ? trimmed : `upi://pay?${trimmed}`,
      );
      const pa = url.searchParams.get('pa');
      const pn = url.searchParams.get('pn');
      if (pa) {
        const vpaParsed = VpaSchema.safeParse(pa);
        if (vpaParsed.success) {
          const res: { vpa: string; payeeName?: string } = {
            vpa: vpaParsed.data,
          };
          if (pn && pn.trim()) {
            res.payeeName = pn.trim();
          }
          return res;
        }
      }
    }
  } catch {
    // Ignore URL parse failures
  }

  // 3. Try raw VPA match (e.g. handle@psp)
  const rawVpa = VpaSchema.safeParse(trimmed);
  if (rawVpa.success) {
    return { vpa: rawVpa.data };
  }

  return null;
}

export const VpaQrScannerModal: React.FC<VpaQrScannerModalProps> = ({
  isOpen,
  onClose,
  onVpaCaptured,
}) => {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [decodedResult, setDecodedResult] = useState<{ vpa: string; payeeName?: string } | null>(
    null,
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleScanSuccess = useCallback(
    (result: { vpa: string; payeeName?: string }) => {
      setDecodedResult(result);
      setScanError(null);
      stopCamera();
    },
    [stopCamera],
  );

  // Frame scanner loop
  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          const extracted = extractVpaFromQrText(code.data);
          if (extracted) {
            handleScanSuccess(extracted);
            return;
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }, [handleScanSuccess]);

  // Start camera stream when in camera mode and open
  useEffect(() => {
    if (!isOpen || mode !== 'camera' || decodedResult) {
      stopCamera();
      return;
    }

    let isMounted = true;
    setCameraError(null);

    async function initCamera() {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Camera API is not supported on this device/browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : 'Could not access camera. Please allow permissions or upload a QR image.';
          setCameraError(message);
          setMode('upload');
        }
      }
    }

    void initCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, mode, decodedResult, scanVideoFrame, stopCamera]);

  // Handle uploaded QR image file
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScanError('Please select a valid image file (PNG, JPEG, WebP).');
      return;
    }

    setIsProcessing(true);
    setScanError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          setScanError('Could not process image on canvas.');
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        setIsProcessing(false);

        if (!code || !code.data) {
          setScanError('No QR code detected in this image. Please try a clearer screenshot.');
          return;
        }

        const extracted = extractVpaFromQrText(code.data);
        if (!extracted) {
          setScanError(
            'The scanned QR code is not a valid UPI payment QR code (missing valid "pa=" parameter or VPA).',
          );
          return;
        }

        handleScanSuccess(extracted);
      };

      img.onerror = () => {
        setIsProcessing(false);
        setScanError('Failed to decode the image file.');
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleApplyVpa = () => {
    if (decodedResult) {
      onVpaCaptured(decodedResult.vpa, decodedResult.payeeName);
      onClose();
    }
  };

  const handleResetScan = () => {
    setDecodedResult(null);
    setScanError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HugeiconsIcon icon={QrCodeIcon} className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">scan waiter's UPI QR</h3>
              <p className="text-[10px] text-stone-500">Auto-capture VPA directly without typos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tab Controls */}
        {!decodedResult && (
          <div className="flex border-b border-stone-100 bg-stone-50/50 px-4 pt-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('camera');
                setScanError(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                mode === 'camera'
                  ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <HugeiconsIcon icon={Camera01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Camera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('upload');
                setScanError(null);
                stopCamera();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                mode === 'upload'
                  ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <HugeiconsIcon icon={Upload01Icon} className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Upload Image</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Typo Safeguard Warning Banner */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5">
            <HugeiconsIcon
              icon={Alert01Icon}
              className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"
              strokeWidth={1.5}
            />
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              Double-check the VPA. A wrong VPA sends diner tips directly to the wrong person. rwrd
              does not hold or mediate funds.
            </p>
          </div>

          {/* Success Decoded View */}
          {decodedResult ? (
            <div className="space-y-4 animate-scale-in">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="w-5 h-5 text-emerald-600"
                    strokeWidth={1.5}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    UPI VPA Detected
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1">
                  <div className="text-[10px] text-stone-400 font-medium">Captured VPA</div>
                  <div className="font-mono text-sm font-semibold text-stone-900 break-all select-all">
                    {decodedResult.vpa}
                  </div>
                  {decodedResult.payeeName && (
                    <div className="text-[11px] text-stone-600 pt-1 border-t border-stone-100 flex items-center justify-between">
                      <span>Payee Name:</span>
                      <strong className="text-stone-800">{decodedResult.payeeName}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <MotionButton variant="ghost" size="sm" onClick={handleResetScan}>
                  Scan Another
                </MotionButton>
                <MotionButton
                  variant="primary"
                  size="sm"
                  onClick={handleApplyVpa}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Use This VPA
                </MotionButton>
              </div>
            </div>
          ) : (
            <>
              {/* Camera Scanner View */}
              {mode === 'camera' && (
                <div className="space-y-3">
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-stone-900 flex items-center justify-center border border-stone-200">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Viewfinder Target Reticle */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                      <div className="w-48 h-48 border-2 border-indigo-400 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                        {/* Target corner indicators */}
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br" />
                      </div>
                    </div>

                    <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                      <Badge
                        variant="neutral"
                        className="bg-stone-900/80 text-white border-stone-700 text-[10px]"
                      >
                        Point at waiter's UPI QR code
                      </Badge>
                    </div>
                  </div>

                  {cameraError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      {cameraError}
                    </div>
                  )}
                </div>
              )}

              {/* Upload Image Scanner View */}
              {mode === 'upload' && (
                <div className="space-y-3">
                  <label className="block border-2 border-dashed border-stone-300 hover:border-indigo-400 rounded-xl p-8 text-center cursor-pointer transition-colors bg-stone-50/50 hover:bg-indigo-50/20">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFile(file);
                      }}
                    />
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 mx-auto mb-2 flex items-center justify-center">
                      <HugeiconsIcon icon={Upload01Icon} className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <p className="text-xs font-medium text-stone-800">
                      Upload QR screenshot or photo
                    </p>
                    <p className="text-[10px] text-stone-500 mt-1">
                      PNG, JPG, or WebP exported from GPay, Paytm, or PhonePe
                    </p>
                  </label>

                  {isProcessing && (
                    <div className="py-2 text-center text-xs text-indigo-600 font-medium animate-pulse">
                      Analyzing QR code image...
                    </div>
                  )}
                </div>
              )}

              {/* Scan Error Message */}
              {scanError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-relaxed">
                  {scanError}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
