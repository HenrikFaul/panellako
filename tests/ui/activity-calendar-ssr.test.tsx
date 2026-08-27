import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import ActivityCalendar from '../../components/dashboard/activity-calendar';

const originalTimeZone = process.env.TZ;

afterEach(() => {
  if (originalTimeZone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = originalTimeZone;
  }
});

describe('ActivityCalendar SSR stability', () => {
  it('renders the same calendar tree in UTC and Budapest', () => {
    const props = {
      tickets: [{ created_at: '2026-08-27T22:30:00.000Z', title: 'Teszt ügy', unit_label: 'A/1' }],
      meetings: [{ scheduled_at: '2026-08-31T15:00:00.000Z', title: 'Teszt közgyűlés', status: 'tervezett' }],
      referenceDate: '2026-08-27',
    };

    process.env.TZ = 'UTC';
    const utcMarkup = renderToStaticMarkup(<ActivityCalendar {...props} />);

    process.env.TZ = 'Europe/Budapest';
    const budapestMarkup = renderToStaticMarkup(<ActivityCalendar {...props} />);

    expect(budapestMarkup).toBe(utcMarkup);
    expect(budapestMarkup).toContain('aug. 24');
    expect(budapestMarkup).toContain('aug. 31');

    const container = document.createElement('div');
    container.innerHTML = budapestMarkup;
    expect(container.querySelector('[data-date="2026-08-27"]')?.innerHTML).not.toContain('#f43f5e');
    expect(container.querySelector('[data-date="2026-08-28"]')?.innerHTML).toContain('#f43f5e');
  });
});
