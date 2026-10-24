import './EmptyState.css';
export default function EmptyState({ title = 'Nothing here yet', message = 'Items will appear here once they are available.' }: { title?: string; message?: string }) { return <div className="empty-state"><span className="empty-state__icon">◇</span><strong>{title}</strong><p>{message}</p></div>; }
