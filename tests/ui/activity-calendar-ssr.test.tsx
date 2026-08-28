import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import ActivityCalendar from '../../components/dashboard/activity-calendar';

const originalTimeZone = process.env.TZ;

afterEach(() => {
  cleanup();
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
    const dateCells = Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-date]'));

    expect(dateCells).toHaveLength(49);
    expect(dateCells.every(cell => /^\d{1,2}$/.test(cell.querySelector('[data-day-number]')?.textContent ?? ''))).toBe(true);
    expect(dateCells.every(cell => !cell.className.includes('opacity'))).toBe(true);
    expect(dateCells.every(cell => (cell.getAttribute('aria-label')?.length ?? 0) > 20)).toBe(true);
    const weekdayLabels = Array.from(container.querySelectorAll<HTMLElement>('[data-weekday-label]'));
    const weekLabels = Array.from(container.querySelectorAll<HTMLElement>('[data-week-label]'));
    expect(weekdayLabels).toHaveLength(7);
    expect(weekdayLabels.every(label => label.className.includes('text-slate-700'))).toBe(true);
    expect(weekLabels).toHaveLength(7);
    expect(weekLabels.every(label => /text-(?:slate-700|brand-800)/.test(label.className))).toBe(true);
    expect(container.querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    expect(container.querySelector('[aria-current="date"]')?.getAttribute('data-date')).toBe('2026-08-27');
    expect(container.querySelector('[data-date="2026-08-27"]')?.getAttribute('aria-label'))
      .toContain('2026. augusztus 27., csütörtök');
    expect(container.querySelector('[data-date="2026-08-27"]')?.innerHTML).not.toContain('#f43f5e');
    expect(container.querySelector('[data-date="2026-08-28"]')?.innerHTML).toContain('#f43f5e');
  });

  it('aggregates 200 events into four category dots and a visible count', () => {
    const tickets = Array.from({ length: 197 }, (_, index) => ({
      created_at: '2026-08-20T08:00:00.000Z',
      title: `Hibabejelentés ${index + 1}`,
      unit_label: `A/${index + 1}`,
    }));
    const meetings = [
      { scheduled_at: '2026-08-20T10:00:00.000Z', title: 'Közgyűlés', status: 'tervezett' },
      { scheduled_at: '2026-08-20T11:00:00.000Z', title: 'Szavazás', status: 'tervezett', agenda_preview: 'Szavazás' },
    ];

    const markup = renderToStaticMarkup(
      <ActivityCalendar tickets={tickets} meetings={meetings} referenceDate="2026-08-20" />,
    );
    const container = document.createElement('div');
    container.innerHTML = markup;
    const targetCell = container.querySelector('[data-date="2026-08-20"]');

    expect(targetCell?.querySelectorAll('[data-event-dot]')).toHaveLength(4);
    expect(targetCell?.querySelector('[data-event-count]')?.textContent).toBe('200');
    expect(targetCell?.getAttribute('aria-label')).toContain('200 esemény');
  });

  it('opens details by keyboard and click, closes with Escape, and returns focus', () => {
    const { container } = render(
      <ActivityCalendar
        tickets={[{ created_at: '2026-08-20T08:00:00.000Z', title: 'Csőtörés', unit_label: 'A/1' }]}
        meetings={[]}
        currentUnit="A/1"
        referenceDate="2026-08-20"
      />,
    );
    const targetCell = container.querySelector<HTMLButtonElement>('[data-date="2026-08-20"]');
    expect(targetCell).not.toBeNull();

    targetCell?.focus();
    fireEvent.keyDown(targetCell as HTMLButtonElement, { key: 'Enter' });
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.className).toContain('rounded-t-2xl');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Bezárás' }));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(targetCell);

    fireEvent.click(targetCell as HTMLButtonElement);
    expect(screen.getByRole('dialog')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Bezárás' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(targetCell);
  });
});
