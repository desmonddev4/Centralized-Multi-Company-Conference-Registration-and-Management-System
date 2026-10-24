import type { ReactNode } from 'react';
import './PageHeader.css';
type Props = { title: string; eyebrow?: string; description?: string; actions?: ReactNode };
export default function PageHeader({ title, eyebrow, description, actions }: Props) { return <div className="shared-page-header"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p className="shared-page-header__description">{description}</p>}</div>{actions&&<div>{actions}</div>}</div>; }
