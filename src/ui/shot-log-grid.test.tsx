import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ShotLogGrid } from './shot-log-grid';

describe('ShotLogGrid (≤5-tap logging)', () => {
  afterEach(cleanup);

  it('logs a full, complete result in ≤5 taps', () => {
    const onLog = vi.fn();
    render(<ShotLogGrid onLog={onLog} />);

    // 4 field changes + 1 commit = 5 taps.
    fireEvent.click(screen.getByText('left')); // startDirection
    fireEvent.click(screen.getByText('fade')); // curve
    fireEvent.click(screen.getByText('thin')); // contact
    fireEvent.click(screen.getByText('long')); // distance
    fireEvent.click(screen.getByText('Log shot')); // commit

    expect(onLog).toHaveBeenCalledTimes(1);
    expect(onLog).toHaveBeenCalledWith({
      startDirection: 'left',
      curve: 'fade',
      contact: 'thin',
      distance: 'long',
      quality: 'good', // untouched default — every dimension is still present
    });
  });

  it('logs a complete result from defaults in a single tap', () => {
    const onLog = vi.fn();
    render(<ShotLogGrid onLog={onLog} />);

    fireEvent.click(screen.getByText('Log shot'));

    expect(onLog).toHaveBeenCalledWith({
      startDirection: 'onLine',
      curve: 'straight',
      contact: 'center',
      distance: 'pinHigh',
      quality: 'good',
    });
  });
});
