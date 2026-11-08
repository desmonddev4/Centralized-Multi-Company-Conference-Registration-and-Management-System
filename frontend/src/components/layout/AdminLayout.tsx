import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import AdminSidebar from '../navigation/AdminSidebar';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import './AdminLayout.css';
import './AdminLayout.redesign.css';
type Props = PropsWithChildren<{ title?: string; eyebrow?: string }>;
export default function AdminLayout({ children, title = 'Overview', eyebrow = 'ADMINISTRATION' }: Props) {
  const platform = usePlatformSettings();
  const supportHref = platform.support_email ? `mailto:${platform.support_email}` : platform.support_phone ? `tel:${platform.support_phone}` : '';
  const supportLabel = platform.support_email ? 'Email support ↗' : 'Call support ↗';
  return <div className="admin-shell"><AdminSidebar/><div className="admin-main"><header className="admin-topbar"><div className="admin-breadcrumb">Workspace <span>/</span> <strong>{title}</strong></div><div className="admin-topbar__actions"><span className="topbar-date">{new Intl.DateTimeFormat(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}</span><Link to="/" className="topbar-site" target="_blank" rel="noreferrer">View website ↗</Link>{supportHref&&<a href={supportHref} className="topbar-help">{supportLabel}</a>}</div></header><main className="admin-content"><div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="page-heading__actions">{title==='Overview'&&<Link className="button button--dark" to="/admin/events">＋ Create conference</Link>}</div></div>{children}</main></div></div>;
}

