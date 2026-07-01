import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoundSchema } from '@/core';

const { replace, beginRound, dispatch, repos } = vi.hoisted(() => ({
  replace: vi.fn(),
  beginRound: vi.fn(async (..._args: unknown[]) => {}),
  dispatch: vi.fn(async (..._args: unknown[]) => {}),
  repos: {
    players: {
      listClubBaselines: vi.fn(async () => []),
      getProfile: vi.fn(async () => undefined),
    },
  },
}));

vi.mock('expo-router', () => ({ router: { replace, push: vi.fn() } }));
vi.mock('./session-provider', () => ({
  useSessionContext: () => ({ repos, beginRound, dispatch }),
}));

import SetupScreen from './setup';

describe('SetupScreen (happy path)', () => {
  beforeEach(() => {
    replace.mockClear();
    beginRound.mockClear();
    dispatch.mockClear();
  });

  it('creates a schema-valid round, starts hole 1, and routes to /hole', async () => {
    render(<SetupScreen />);

    fireEvent.change(screen.getByLabelText('Wind (mph)'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Temperature (°F)'), { target: { value: '55' } });
    fireEvent.click(screen.getByText('aggressive'));
    fireEvent.click(screen.getByText('Start round'));

    await waitFor(() => expect(beginRound).toHaveBeenCalledTimes(1));

    const round = RoundSchema.parse(beginRound.mock.calls[0][0]);
    expect(round.weather).toEqual({ windMph: 10, tempF: 55 });
    expect(round.aggressionDefault).toBe('aggressive');

    expect(dispatch).toHaveBeenCalledWith({ type: 'START_HOLE', holeNumber: 1 });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/hole'));
  });
});
