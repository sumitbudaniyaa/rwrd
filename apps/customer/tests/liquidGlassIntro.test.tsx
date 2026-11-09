import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LiquidGlassIntro } from '../src/components/LiquidGlassIntro.js';

describe('LiquidGlassIntro Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders intro banner with welcome role and skip prompt', () => {
    // In this unit test, override mode so it renders
    const originalMode = import.meta.env.MODE;
    import.meta.env.MODE = 'development';

    render(<LiquidGlassIntro />);

    expect(screen.getByRole('banner', { name: /Welcome to rwrd/i })).toBeInTheDocument();
    expect(screen.getByText(/Tap anywhere to skip/i)).toBeInTheDocument();

    import.meta.env.MODE = originalMode;
  });

  it('triggers dismiss and calls onComplete on user tap/click', () => {
    const originalMode = import.meta.env.MODE;
    import.meta.env.MODE = 'development';
    const completeSpy = vi.fn();

    render(<LiquidGlassIntro onComplete={completeSpy} />);

    const banner = screen.getByRole('banner', { name: /Welcome to rwrd/i });
    fireEvent.click(banner);

    // Fast-forward exit transition timer
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(completeSpy).toHaveBeenCalledTimes(1);

    import.meta.env.MODE = originalMode;
  });
});
