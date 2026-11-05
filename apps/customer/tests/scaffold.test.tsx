import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App.js';

describe('Customer App Scaffolding', () => {
  it('renders without crashing and mounts customer container', () => {
    // Set window location to a test token path
    window.history.pushState({}, 'Test', '/t/test-token-123');

    render(<App />);

    expect(screen.getByText('You are here for...')).toBeInTheDocument();
  });
});
