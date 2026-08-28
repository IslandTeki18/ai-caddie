import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { ShotLogGrid, DEFAULT_RESULT, type ShotResult } from './shot-log-grid';

function Harness(props: { onChange: (r: ShotResult) => void }) {
  const [v, setV] = useState(DEFAULT_RESULT);
  return <ShotLogGrid value={v} onChange={(r) => { setV(r); props.onChange(r); }} />;
}

describe('ShotLogGrid (≤5-tap logging)', () => {
  afterEach(cleanup);

  it('reaches a full result in 4 field taps, untouched dimensions keep their default', () => {
    let last: ShotResult = DEFAULT_RESULT;
    render(<Harness onChange={(r) => (last = r)} />);

    fireEvent.click(screen.getByText('left'));
    fireEvent.click(screen.getByText('fade'));
    fireEvent.click(screen.getByText('thin'));
    fireEvent.click(screen.getByText('long'));

    expect(last).toEqual({ startDirection: 'left', curve: 'fade', contact: 'thin', distance: 'long', quality: 'good' });
  });

  it('defaults form a complete result with zero taps', () => {
    expect(DEFAULT_RESULT).toEqual({
      startDirection: 'onLine', curve: 'straight', contact: 'center', distance: 'pinHigh', quality: 'good',
    });
  });
});
