import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, withTiming } from '../../lib/log';

describe('log', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('logger.info writes JSON with ts + level + event', () => {
    logger.info({ event: 'unit.test' });
    expect(logSpy).toHaveBeenCalledOnce();
    const json = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(json.level).toBe('info');
    expect(json.event).toBe('unit.test');
    expect(json.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('withTiming', () => {
  it('returns the resolved value and emits latency_ms', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await withTiming('unit.timing', async () => 42);
    expect(result).toBe(42);
    const json = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(json.event).toBe('unit.timing');
    expect(json.latency_ms).toBeGreaterThanOrEqual(0);
  });
});
