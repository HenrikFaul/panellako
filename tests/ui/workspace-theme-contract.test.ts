import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const globals = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

function token(name: string): string {
  const match = globals.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Missing hexadecimal theme token: --${name}`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('daylight workspace theme contract', () => {
  it('keeps the application canvas light, flat and free of ambient artwork', () => {
    expect(token('app-bg')).toBe('#f4f7f4');
    expect(token('app-bg-alt')).toBe('#edf3ee');
    expect(globals).toMatch(/\.app-surface\s*\{[^}]*background-image:\s*none;/s);
    expect(globals).not.toContain('radial-gradient');
  });

  it('keeps normal text at WCAG AA contrast on the warm canvas and white cards', () => {
    const canvas = token('app-bg');
    const white = '#ffffff';

    for (const foreground of [
      token('app-ink'),
      token('app-ink-soft'),
      token('app-muted'),
      token('app-subtle'),
    ]) {
      expect(contrast(foreground, canvas)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(foreground, white)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the primary teal button legible with white text', () => {
    expect(contrast('#ffffff', '#0f766e')).toBeGreaterThanOrEqual(4.5);
  });
});
