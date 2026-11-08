import type { PropsWithChildren, ReactNode } from 'react';

type PageHeroProps = PropsWithChildren<{
  eyebrow: string;
  title: ReactNode;
  compact?: boolean;
  actions?: ReactNode;
  meta?: ReactNode;
}>;

/* Dark stage hero shared by the public pages (see PublicTheme.css). */
export default function PageHero({ eyebrow, title, compact = false, actions, meta, children }: PageHeroProps) {
  return (
    <header className={'pp-hero' + (compact ? ' pp-hero--compact' : '')}>
      <p className="pp-tag"><i aria-hidden="true" />{eyebrow}</p>
      <h1 className="pp-title">{title}</h1>
      {children && <p className="pp-lead">{children}</p>}
      {actions && <div className="pp-hero__actions">{actions}</div>}
      {meta && <div className="pp-hero__meta">{meta}</div>}
    </header>
  );
}
