import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import jsQR from 'jsqr';
import { VpaQrScannerModal, extractVpaFromQrText } from '../src/components/VpaQrScannerModal.js';

// Mock jsQR
vi.mock('jsqr', () => ({
  default: vi.fn(),
}));

describe('extractVpaFromQrText', () => {
  it('extracts VPA and payeeName from standard UPI deep link string', () => {
    const rawQr = 'upi://pay?pa=rahul@okaxis&pn=Rahul%20Sharma&cu=INR';
    const result = extractVpaFromQrText(rawQr);
    expect(result).toEqual({
      vpa: 'rahul@okaxis',
      payeeName: 'Rahul Sharma',
    });
  });

  it('extracts VPA without payeeName when pn is not present', () => {
    const rawQr = 'upi://pay?pa=deepak@icici&cu=INR';
    const result = extractVpaFromQrText(rawQr);
    expect(result).toEqual({
      vpa: 'deepak@icici',
    });
  });

  it('extracts VPA from query parameters if URL-like', () => {
    const rawQr = 'pa=priya@okhdfcbank&pn=Priya%20Patel';
    const result = extractVpaFromQrText(rawQr);
    expect(result).toEqual({
      vpa: 'priya@okhdfcbank',
      payeeName: 'Priya Patel',
    });
  });

  it('parses raw handle@psp VPA strings directly', () => {
    const rawVpa = 'rohit@paytm';
    const result = extractVpaFromQrText(rawVpa);
    expect(result).toEqual({
      vpa: 'rohit@paytm',
    });
  });

  it('returns null for non-UPI URLs or arbitrary text', () => {
    expect(extractVpaFromQrText('https://google.com')).toBeNull();
    expect(extractVpaFromQrText('WIFI:S:MyWifi;T:WPA;P:secret;;')).toBeNull();
    expect(extractVpaFromQrText('not-a-vpa')).toBeNull();
  });
});

describe('VpaQrScannerModal Component', () => {
  const onVpaCapturedMock = vi.fn();
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with safeguard warning and mode tabs when open', () => {
    render(
      <VpaQrScannerModal isOpen={true} onClose={onCloseMock} onVpaCaptured={onVpaCapturedMock} />,
    );

    expect(screen.getByText(/scan waiter's UPI QR/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Double-check the VPA. A wrong VPA sends diner tips directly to the wrong person/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Camera$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload Image/i })).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <VpaQrScannerModal isOpen={false} onClose={onCloseMock} onVpaCaptured={onVpaCapturedMock} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <VpaQrScannerModal isOpen={true} onClose={onCloseMock} onVpaCaptured={onVpaCapturedMock} />,
    );

    const closeBtn = screen.getByLabelText(/Close scanner/i);
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('switches to upload mode when Upload tab is clicked', () => {
    render(
      <VpaQrScannerModal isOpen={true} onClose={onCloseMock} onVpaCaptured={onVpaCapturedMock} />,
    );

    const uploadTab = screen.getByRole('button', { name: /Upload Image/i });
    fireEvent.click(uploadTab);

    expect(screen.getByText(/Upload QR screenshot or photo/i)).toBeInTheDocument();
  });

  it('processes image upload, detects valid UPI QR, and calls onVpaCaptured', async () => {
    const mockJsQr = vi.mocked(jsQR);
    mockJsQr.mockReturnValueOnce({
      data: 'upi://pay?pa=sunil@okaxis&pn=Sunil%20Kumar&cu=INR',
      location: {} as any,
    } as any);

    // Mock HTMLCanvasElement.getContext and Image
    const mockGetContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(400),
        width: 10,
        height: 10,
      }),
    });
    HTMLCanvasElement.prototype.getContext = mockGetContext as any;

    // Mock FileReader
    class MockFileReader {
      onload: ((e: any) => void) | null = null;
      readAsDataURL() {
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: 'data:image/png;base64,mockImage' } });
          }
        }, 10);
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    // Mock Image load
    const originalImage = global.Image;
    class MockImage {
      onload: (() => void) | null = null;
      width = 100;
      height = 100;
      set src(_val: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    }
    global.Image = MockImage as any;

    render(
      <VpaQrScannerModal isOpen={true} onClose={onCloseMock} onVpaCaptured={onVpaCapturedMock} />,
    );

    // Switch to upload tab
    fireEvent.click(screen.getByRole('button', { name: /Upload Image/i }));

    const file = new File(['fake-png-content'], 'qr.png', { type: 'image/png' });
    const input = screen
      .getByText(/Upload QR screenshot or photo/i)
      .closest('label')
      ?.querySelector('input');
    expect(input).toBeInTheDocument();

    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('UPI VPA Detected')).toBeInTheDocument();
    });

    expect(screen.getByText('sunil@okaxis')).toBeInTheDocument();
    expect(screen.getByText('Sunil Kumar')).toBeInTheDocument();

    // Click "Use This VPA"
    const useVpaBtn = screen.getByRole('button', { name: /Use This VPA/i });
    fireEvent.click(useVpaBtn);

    expect(onVpaCapturedMock).toHaveBeenCalledWith('sunil@okaxis', 'Sunil Kumar');
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    global.Image = originalImage;
  });
});
