import type { ReactNode } from 'react';

/*
 * Enterprise dark surface primitives (v0.9.33).
 * Per .governance/ui_ux_rules.md: cards are rgba(255,255,255,0.04) overlays on
 * the #060c18 app background; 1px hairline borders carry the hierarchy.
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
      className={`min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] ${className}`}
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
    <Tag className={`min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.03] ${className}`}>
      {children}
    </Tag>
  );
}
