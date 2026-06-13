import { render, screen } from '@testing-library/react';
import { EventPublicPage } from '../EventPublicPage';

const getBySlugMock = vi.fn();

vi.mock('../../services/supabase', () => ({
  eventService: {
    getBySlug: (...args: unknown[]) => getBySlugMock(...args),
    publicRegister: vi.fn(),
  },
}));

describe('EventPublicPage', () => {
  beforeEach(() => {
    getBySlugMock.mockReset();
  });

  it('shows a clear message when public RSVP is disabled', async () => {
    getBySlugMock.mockResolvedValue({
      error: 'not_public',
      eventName: 'החתונה של דוד',
      event: null,
    });

    render(<EventPublicPage slug="david-wedding" />);

    expect(await screen.findByText('ההרשמה לאירוע אינה פתוחה כרגע')).toBeInTheDocument();
    expect(screen.getByText('החתונה של דוד')).toBeInTheDocument();
  });
});
