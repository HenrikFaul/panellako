import type { ReactNode } from 'react';

/*
 * Daylight surface primitives (v0.9.37).
 * White cards sit on a warm neutral canvas; soft borders and low elevation
 * provide hierarchy without turning every section into a heavy container.
 */

export function Card({
  children,
  className = '',
  as: Tag = 'div',
  id,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'section' | 'li';
  id?: string;
}) {
  return (
    <Tag
      id={id}
      className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-card ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Subtle inset surface for nested content (forms, list rows) inside a Card. */
export function InsetCard({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'li';
}) {
  return (
    <Tag className={`min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/80 ${className}`}>
      {children}
    </Tag>
  );
}
