import './LoadingState.css';
export default function LoadingState({ label = 'Loading' }: { label?: string }) { return <div className="loading-state" role="status"><span className="loading-state__spinner"/>{label}…</div>; }
