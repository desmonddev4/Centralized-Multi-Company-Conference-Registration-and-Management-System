import './StatusBadge.css';
type Props = { status: string; tone?: 'positive' | 'warning' | 'negative' | 'neutral' };
export default function StatusBadge({ status, tone = 'neutral' }: Props) { return <span className={'status-badge status-badge--' + tone}><i/>{status}</span>; }
