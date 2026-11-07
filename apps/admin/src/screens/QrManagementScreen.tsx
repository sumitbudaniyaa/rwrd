import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  QrCodeIcon,
  Download01Icon,
  PrinterIcon,
  RefreshIcon,
  Add01Icon,
  Alert01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { Badge, SlideUp } from '@tiptable/ui';
import { MotionButton } from '../components/motion/button.js';
import { useAuth } from '../context/AuthContext.js';
import { api, ApiError, type QrTokenItem } from '../services/api.js';

interface PlacardModalData {
  item: QrTokenItem;
  restaurantName: string;
  logoUrl: string | null;
}

export const QrManagementScreen: React.FC = () => {
  const { user, restaurant } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId || restaurant?.id || '';

  const [rotatingToken, setRotatingToken] = useState<QrTokenItem | null>(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [placardData, setPlacardData] = useState<PlacardModalData | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-qr', restaurantId],
    queryFn: () => (restaurantId ? api.getQrList(restaurantId) : Promise.reject()),
    enabled: Boolean(restaurantId),
  });

  const tokens = data?.tokens || [];
  const rootToken = tokens.find((t) => !t.tableId) || tokens[0] || null;
  const tableTokens = tokens.filter((t) => Boolean(t.tableId));

  const rotateMutation = useMutation({
    mutationFn: (targetTableId: string | null) => api.rotateQrToken(restaurantId, targetTableId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-qr', restaurantId] });
      setRotatingToken(null);
      setSuccessMessage('QR token rotated successfully. Previous QR codes are now deactivated.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setFormError(err.problem.detail || err.problem.title);
      } else {
        setFormError('Failed to rotate QR token.');
      }
    },
  });

  const createTableMutation = useMutation({
    mutationFn: (newTable: { tableNumber: string; sectionName?: string }) =>
      api.createTable(restaurantId, newTable),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-qr', restaurantId] });
      setIsAddTableOpen(false);
      setTableNumber('');
      setSectionName('');
      setSuccessMessage('New dining table created with provisioned QR code.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setFormError(err.problem.detail || err.problem.title);
      } else {
        setFormError('Failed to create dining table.');
      }
    },
  });

  const handleDownloadPng = async (url: string, filename: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 1024,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${filename}.png`;
      link.click();
    } catch {
      setFormError('Failed to export QR PNG.');
    }
  };

  const handleDownloadSvg = async (url: string, filename: string) => {
    try {
      const svgString = await QRCode.toString(url, {
        type: 'svg',
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${filename}.svg`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setFormError('Failed to export QR SVG.');
    }
  };

  const handleCreateTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!tableNumber.trim()) {
      setFormError('Table number is required.');
      return;
    }
    const payload: { tableNumber: string; sectionName?: string } = {
      tableNumber: tableNumber.trim(),
    };
    if (sectionName.trim()) {
      payload.sectionName = sectionName.trim();
    }
    createTableMutation.mutate(payload);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <SlideUp>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-stone-900 font-normal leading-[1.08] text-left">
              table & QR management
            </h1>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <MotionButton
              variant="primary"
              size="sm"
              onClick={() => {
                setFormError(null);
                setIsAddTableOpen(true);
              }}
              className="px-4 py-2"
            >
              <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={1.5} />
              <span>Add Dining Table</span>
            </MotionButton>
          </div>
        </div>
      </SlideUp>

      {/* Notifications */}
      {formError && (
        <SlideUp>
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-700 flex items-start gap-2.5 shadow-2xs">
            <HugeiconsIcon
              icon={Alert01Icon}
              className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5"
              strokeWidth={1.5}
            />
            <div className="leading-relaxed font-medium">{formError}</div>
          </div>
        </SlideUp>
      )}

      {successMessage && (
        <SlideUp>
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 flex items-start gap-2.5 shadow-2xs">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"
              strokeWidth={1.5}
            />
            <div className="leading-relaxed font-medium">{successMessage}</div>
          </div>
        </SlideUp>
      )}

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-stone-400">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs">Loading QR tokens and table placards...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Restaurant QR Card */}
          {rootToken && (
            <SlideUp delay={50}>
              <div className="p-6 rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs shadow-2xs hover:shadow-xs transition-all duration-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <QrCanvas codeUrl={rootToken.customerUrl} size={120} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                          general restaurant QR
                        </h3>
                        <Badge variant="neutral">Universal / Standing</Badge>
                      </div>
                      <p className="text-xs text-stone-500 max-w-md leading-relaxed">
                        Universal placard for entrance, counter, or bars where table numbers are not
                        assigned.
                      </p>
                      <div className="pt-1 font-mono text-[11px] text-stone-400 select-all truncate max-w-xs md:max-w-md">
                        {rootToken.customerUrl}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:self-center">
                    <MotionButton
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDownloadPng(
                          rootToken.customerUrl,
                          `${data?.restaurant.slug || 'restaurant'}-general-qr`,
                        )
                      }
                      title="Download PNG for raster graphics"
                    >
                      <HugeiconsIcon
                        icon={Download01Icon}
                        className="w-3.5 h-3.5"
                        strokeWidth={1.5}
                      />
                      <span>PNG</span>
                    </MotionButton>

                    <MotionButton
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDownloadSvg(
                          rootToken.customerUrl,
                          `${data?.restaurant.slug || 'restaurant'}-general-qr`,
                        )
                      }
                      title="Download scalable SVG vector"
                    >
                      <HugeiconsIcon
                        icon={Download01Icon}
                        className="w-3.5 h-3.5"
                        strokeWidth={1.5}
                      />
                      <span>SVG</span>
                    </MotionButton>

                    <MotionButton
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        setPlacardData({
                          item: rootToken,
                          restaurantName: data?.restaurant.name || 'Restaurant',
                          logoUrl: data?.restaurant.logoUrl || null,
                        })
                      }
                      className="px-3.5 py-1.5"
                    >
                      <HugeiconsIcon icon={PrinterIcon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Print Placard</span>
                    </MotionButton>

                    <MotionButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setRotatingToken(rootToken)}
                      title="Rotate QR token"
                      className="text-stone-500 hover:text-stone-800"
                    >
                      <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Rotate</span>
                    </MotionButton>
                  </div>
                </div>
              </div>
            </SlideUp>
          )}

          {/* Table-Specific QR Cards Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                  table placards
                </h3>
                <p className="text-xs text-stone-500">
                  Individual table QR codes encoding dedicated table identifiers.
                </p>
              </div>
              <span className="text-xs text-stone-500">
                Total Tables: <strong className="text-stone-800">{tableTokens.length}</strong>
              </span>
            </div>

            {tableTokens.length === 0 ? (
              <div className="py-16 border border-dashed border-stone-200/80 rounded-2xl text-center bg-white/90 backdrop-blur-xs p-6 space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200/60 text-stone-400 mx-auto flex items-center justify-center shadow-2xs">
                  <HugeiconsIcon icon={QrCodeIcon} className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-800">no dining tables yet</h4>
                  <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                    Add tables to print table-numbered placards for individual diner seats.
                  </p>
                </div>
                <MotionButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddTableOpen(true)}
                  className="mt-3 px-4 py-2"
                >
                  <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={1.5} />
                  <span>Add First Table</span>
                </MotionButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tableTokens.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-stone-200/70 bg-white/90 backdrop-blur-xs shadow-2xs hover:shadow-xs hover:border-stone-300/80 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-semibold text-stone-900 tracking-tight">
                            {item.tableNumber || 'Table'}
                          </div>
                          {item.sectionName && (
                            <Badge variant="neutral" className="mt-1 text-[10px]">
                              {item.sectionName}
                            </Badge>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setRotatingToken(item)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Rotate token"
                        >
                          <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>

                      <div className="flex items-center justify-center py-3 bg-stone-50/70 rounded-xl border border-stone-100">
                        <QrCanvas codeUrl={item.customerUrl} size={140} />
                      </div>

                      <div className="text-[10px] font-mono text-stone-400 truncate text-center select-all">
                        {item.customerUrl}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-4 border-t border-stone-100 mt-4">
                      <MotionButton
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownloadPng(
                            item.customerUrl,
                            `${data?.restaurant.slug || 'rest'}-${item.tableNumber || 'table'}-qr`,
                          )
                        }
                        className="px-1 text-[11px]"
                      >
                        🖼️ PNG
                      </MotionButton>
                      <MotionButton
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownloadSvg(
                            item.customerUrl,
                            `${data?.restaurant.slug || 'rest'}-${item.tableNumber || 'table'}-qr`,
                          )
                        }
                        className="px-1 text-[11px]"
                      >
                        ⚡ SVG
                      </MotionButton>
                      <MotionButton
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          setPlacardData({
                            item,
                            restaurantName: data?.restaurant.name || 'Restaurant',
                            logoUrl: data?.restaurant.logoUrl || null,
                          })
                        }
                        className="px-1 text-[11px]"
                      >
                        🪧 Placard
                      </MotionButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Dining Table Modal */}
      {isAddTableOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/80 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                  add dining table
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="text-stone-400 hover:text-stone-600 text-lg leading-none p-1 cursor-pointer"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateTableSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Table Number / Identifier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. Table 1, T-12, Booth 3"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-150"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Section / Area (Optional)
                  </label>
                  <input
                    type="text"
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    placeholder="e.g. Ground Floor, Terrace, Bar"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-150"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                  <MotionButton variant="ghost" size="sm" onClick={() => setIsAddTableOpen(false)}>
                    Cancel
                  </MotionButton>
                  <MotionButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={createTableMutation.isPending}
                    className="px-4 py-2"
                  >
                    Create Table
                  </MotionButton>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Rotate Confirmation Modal */}
      {rotatingToken &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/80 shadow-2xl p-6 space-y-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center shadow-2xs">
                <HugeiconsIcon icon={Alert01Icon} className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                  rotate{' '}
                  {rotatingToken.tableNumber ? `${rotatingToken.tableNumber} QR` : 'restaurant QR'}?
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Rotating this token will <strong>immediately invalidate</strong> all previously
                  printed QR placards for this table. Diners scanning existing prints will receive
                  an invalid token error.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <MotionButton variant="ghost" size="sm" onClick={() => setRotatingToken(null)}>
                  Cancel
                </MotionButton>
                <MotionButton
                  variant="danger"
                  size="sm"
                  aria-label="Confirm token rotation"
                  isLoading={rotateMutation.isPending}
                  onClick={() => rotateMutation.mutate(rotatingToken.tableId)}
                >
                  Rotate Token
                </MotionButton>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Printable Placard Modal / Print Preview */}
      {placardData && <PlacardModal data={placardData} onClose={() => setPlacardData(null)} />}
    </div>
  );
};

// Canvas QR code generator component
export const QrCanvas: React.FC<{ codeUrl: string; size?: number }> = ({ codeUrl, size = 120 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      void QRCode.toCanvas(canvasRef.current, codeUrl, {
        width: size,
        margin: 1,
        color: {
          dark: '#1c1917', // stone-900
          light: '#ffffff',
        },
      });
    }
  }, [codeUrl, size]);

  return <canvas ref={canvasRef} className="rounded-xl shadow-2xs" />;
};

// Printable Placard Dialog with window.print() support
const PlacardModal: React.FC<{ data: PlacardModalData; onClose: () => void }> = ({
  data,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200/80 shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="text-base font-semibold text-stone-900 tracking-tight">
            print table placard
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close placard modal"
            className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Placard Card Preview */}
        <div
          id="printable-placard"
          className="p-8 border-2 border-stone-900 rounded-3xl bg-white text-center space-y-4 shadow-sm"
        >
          {data.logoUrl && (
            <img
              src={data.logoUrl}
              alt={data.restaurantName}
              className="w-12 h-12 rounded-xl mx-auto object-cover border border-stone-200"
            />
          )}

          <div>
            <h4 className="text-xl font-serif font-normal text-stone-900">{data.restaurantName}</h4>
            {data.item.tableNumber ? (
              <div className="mt-1 inline-block px-3 py-1 bg-stone-100 text-stone-800 text-xs font-semibold rounded-full border border-stone-200 uppercase tracking-wider">
                {data.item.tableNumber}
              </div>
            ) : (
              <div className="mt-1 inline-block px-3 py-1 bg-stone-100 text-stone-800 text-xs font-semibold rounded-full border border-stone-200 uppercase tracking-wider">
                Tip & Review
              </div>
            )}
          </div>

          <div className="flex justify-center py-2">
            <QrCanvas codeUrl={data.item.customerUrl} size={180} />
          </div>

          <div className="space-y-1 text-xs text-stone-600">
            <p className="font-semibold text-stone-800">Scan to tip your waiter directly via UPI</p>
            <p className="text-[11px] text-stone-500">
              अपने वेटर को सीधे UPI द्वारा टिप देने के लिए स्कैन करें
            </p>
            <p className="text-[10px] text-stone-400 pt-2 border-t border-stone-100">
              Powered by rwrd • Safe & Direct Peer-to-Peer
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <MotionButton variant="ghost" size="sm" onClick={onClose}>
            Close
          </MotionButton>
          <MotionButton variant="primary" size="sm" onClick={handlePrint} className="px-4 py-2">
            <HugeiconsIcon icon={PrinterIcon} className="w-4 h-4" strokeWidth={1.5} />
            <span>Print / Save PDF</span>
          </MotionButton>
        </div>
      </div>
    </div>,
    document.body,
  );
};
