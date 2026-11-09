import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext.js';
import { ThemeToggle } from '../src/components/ThemeToggle.js';

const TestConsumer: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={toggleTheme} data-testid="toggle-btn">
        Toggle
      </button>
      <ThemeToggle />
    </div>
  );
};

describe('ThemeContext & ThemeToggle System', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.body?.classList.remove('dark');
  });

  it('defaults to light mode when localStorage is empty and system preference is not dark', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.body?.classList.contains('dark')).toBe(false);
  });

  it('restores dark mode when localStorage contains portal_theme="dark"', () => {
    localStorage.setItem('portal_theme', 'dark');

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.body?.classList.contains('dark')).toBe(true);
  });

  it('toggles theme when button is clicked and synchronizes class and localStorage', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.body?.classList.contains('dark')).toBe(false);

    // Click toggle button
    fireEvent.click(screen.getByTestId('toggle-btn'));

    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.body?.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('portal_theme')).toBe('dark');

    // Click toggle button again
    fireEvent.click(screen.getByTestId('toggle-btn'));

    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.body?.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('portal_theme')).toBe('light');
  });

  it('renders ThemeToggle component as a round button and handles click', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggleButton = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(toggleButton).toBeDefined();

    fireEvent.click(toggleButton);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.body?.classList.contains('dark')).toBe(true);
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeDefined();
  });
});
