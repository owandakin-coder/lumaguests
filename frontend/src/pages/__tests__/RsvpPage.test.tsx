import { render, screen } from '@testing-library/react';
import { RsvpPage } from '../RsvpPage';

const getByTokenMock = vi.fn();
const respondMock = vi.fn();

vi.mock('../../services/supabase', () => ({
  rsvpService: {
    getByToken: (...args: unknown[]) => getByTokenMock(...args),
    respond: (...args: unknown[]) => respondMock(...args),
  },
}));

describe('RsvpPage', () => {
  beforeEach(() => {
    getByTokenMock.mockReset();
    respondMock.mockReset();
  });

  it('shows a dedicated not found state for invalid personal tokens', async () => {
    getByTokenMock.mockResolvedValue({
      success: false,
      error: 'not_found',
    });

    render(<RsvpPage token="missing-token" />);

    expect(await screen.findByText('הקישור לאישור ההגעה לא נמצא')).toBeInTheDocument();
    expect(screen.getByText('בדוק שקיבלת את הקישור המלא ונסה לפתוח אותו שוב.')).toBeInTheDocument();
  });
});
