import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Messages } from '../Messages';
import { Guest } from '../../types';

const generateTokenMock = vi.fn();
const verifyTokenMock = vi.fn();
const buildPersonalRsvpLinkMock = vi.fn();
const guestUpdateMock = vi.fn();
const openWhatsAppUrlMock = vi.fn();
const buildGuestRsvpMessageMock = vi.fn();
const buildGuestRsvpWhatsAppUrlMock = vi.fn();

vi.mock('../../services/supabase', () => ({
  rsvpService: {
    generateToken: (...args: unknown[]) => generateTokenMock(...args),
    verifyToken: (...args: unknown[]) => verifyTokenMock(...args),
    buildPersonalRsvpLink: (...args: unknown[]) => buildPersonalRsvpLinkMock(...args),
  },
  guestService: {
    update: (...args: unknown[]) => guestUpdateMock(...args),
  },
  toWaPhone: vi.fn((phone: string) => phone),
  openWhatsAppUrl: (...args: unknown[]) => openWhatsAppUrlMock(...args),
}));

vi.mock('../../hooks/useEvent', () => ({
  useEvent: () => ({
    event: {
      event_name: 'החתונה של דוד',
      event_date: '2026-06-30T18:00:00.000Z',
      venue_name: 'אולמי הזהב',
      venue_address: 'נתניה',
    },
  }),
}));

vi.mock('../../utils/rsvpShare', () => ({
  buildGuestRsvpMessage: (...args: unknown[]) => buildGuestRsvpMessageMock(...args),
  buildGuestRsvpWhatsAppUrl: (...args: unknown[]) => buildGuestRsvpWhatsAppUrlMock(...args),
}));

const guest: Guest = {
  id: 'guest-1',
  user_id: 'user-1',
  event_id: 'event-1',
  full_name: 'אלי',
  phone: '0500000000',
  companions: 0,
  category: 'FRIENDS',
  rsvp_status: 'PENDING',
  notes: '',
};

describe('Messages', () => {
  beforeEach(() => {
    generateTokenMock.mockReset();
    verifyTokenMock.mockReset();
    buildPersonalRsvpLinkMock.mockReset();
    guestUpdateMock.mockReset();
    openWhatsAppUrlMock.mockReset();
    buildGuestRsvpMessageMock.mockReset();
    buildGuestRsvpWhatsAppUrlMock.mockReset();

    generateTokenMock.mockReturnValue('token-123');
    verifyTokenMock.mockResolvedValue(true);
    buildPersonalRsvpLinkMock.mockReturnValue('https://lumaguests.vercel.app/rsvp/token-123');
    guestUpdateMock.mockResolvedValue({});
    buildGuestRsvpMessageMock.mockReturnValue('RSVP MESSAGE');
    buildGuestRsvpWhatsAppUrlMock.mockReturnValue('https://wa.me/0500000000?text=RSVP');
  });

  it('uses a personal /rsvp token link for guest WhatsApp messages', async () => {
    const user = userEvent.setup();

    render(<Messages guests={[{ ...guest }]} userId="user-1" />);

    await user.click(screen.getByLabelText('שלח הודעת WhatsApp לאלי'));

    await waitFor(() => {
      expect(buildGuestRsvpMessageMock).toHaveBeenCalledWith(
        'אלי',
        expect.objectContaining({ event_name: 'החתונה של דוד' }),
        'https://lumaguests.vercel.app/rsvp/token-123'
      );
    });

    expect(buildGuestRsvpMessageMock.mock.calls[0][2]).not.toContain('/event/');
    expect(openWhatsAppUrlMock).toHaveBeenCalledWith('https://wa.me/0500000000?text=RSVP');
  });
});
