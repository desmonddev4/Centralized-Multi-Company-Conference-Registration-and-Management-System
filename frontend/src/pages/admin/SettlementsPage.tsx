import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import EmptyState from '../../components/feedback/EmptyState';
import StatusBadge from '../../components/feedback/StatusBadge';
import { eventsApi, type Settlement, type SettlementTransaction } from '../../api/events';
import './SettlementsPage.css';

const money = (minor: number, currency: string) => `${currency} ${(minor / 100).toFixed(2)}`;
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function SettlementsPage() {
  const [items, setItems] = useState<Settlement[]>([]);
  const [transactions, setTransactions] = useState<SettlementTransaction[]>([]);
  const [selected, setSelected] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [synced, setSynced] = useState('');
  const [importPage, setImportPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [matchFilter, setMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setItems(await eventsApi.settlements()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load settlements.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function sync() {
    setBusy(true); setError('');
    try {
      const response = await eventsApi.syncSettlements();
      setItems(current => {
        const byId = new Map(current.map(x => [x.paystack_id, x]));
        response.results.forEach(x => byId.set(x.paystack_id, x));
        return Array.from(byId.values()).sort((a, b) => (b.settlement_date || '').localeCompare(a.settlement_date || ''));
      });
      setSynced(`${response.results.length} settlement${response.results.length === 1 ? '' : 's'} synchronized from Paystack.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sync settlements.'); }
    finally { setBusy(false); }
  }

  async function importTransactions(settlement: Settlement, page: number) {
    setBusy(true); setError('');
    try {
      const response = await eventsApi.settlementTransactions(settlement.paystack_id, page);
      setTransactions(response.results);
      setImportPage(page);
      const meta = response.meta as Record<string, number>;
      const total = Number(meta.total ?? meta.totalCount ?? meta.total_count);
      const perPage = Number(meta.perPage ?? meta.per_page ?? 100);
      setHasMore(Number.isFinite(total) && total >= 0 ? page * perPage < total : response.results.length >= page * perPage);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load settlement transactions.'); }
    finally { setBusy(false); }
  }

  function open(settlement: Settlement) {
    setSelected(settlement); setTransactions([]); setImportPage(0); setHasMore(false);
    setQuery(''); setMatchFilter('all');
    void importTransactions(settlement, 1);
  }

  const matchedCount = transactions.filter(t => t.registration_code).length;
  const unmatchedCount = transactions.length - matchedCount;
  const filteredTransactions = useMemo(() => transactions.filter(t => {
    if (matchFilter === 'matched' && !t.registration_code) return false;
    if (matchFilter === 'unmatched' && t.registration_code) return false;
    const haystack = [t.reference, t.paystack_id, t.registration_code, t.channel, t.status, t.message].join(' ').toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [transactions, matchFilter, query]);

  function exportCsv() {
    const rows = [
      ['Paystack transaction ID', 'Reference', 'Registration code', 'Match status', 'Amount minor units', 'Currency', 'Channel', 'Status', 'Message', 'Paid at'],
      ...filteredTransactions.map(t => [t.paystack_id, t.reference, t.registration_code || '', t.registration_code ? 'Matched' : 'Unmatched', t.amount_minor_units, t.currency, t.channel, t.status, t.message, t.paid_at || '']),
    ];
    const blob = new Blob([rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url;
    anchor.download = `settlement-${selected?.paystack_id}-transactions.csv`; anchor.click();
    URL.revokeObjectURL(url);
  }

  return <AdminLayout title="Settlements" eyebrow="FINANCE">
    <div className="settlements-toolbar"><p>Reconcile Paystack settlement totals and their underlying transactions.</p><button className="button button--primary" disabled={busy} onClick={() => void sync()}>{busy ? 'Working…' : 'Sync from Paystack'}</button></div>
    {error && <div className="settlements-error" role="alert">{error}</div>}{synced && <div className="settlements-notice" role="status">{synced}</div>}
    <section className="settlements-card"><header><div><h2>Settlement batches</h2><p>{items.length} locally stored · amounts in minor units converted to currency</p></div><button className="button button--quiet" disabled={loading} onClick={() => void load()}>Refresh</button></header>{loading ? <p className="settlements-loading">Loading settlement history…</p> : items.length === 0 ? <EmptyState title="No settlements synced" message="Sync from Paystack to load settlement batches for reconciliation." /> : <div className="settlements-table-scroll"><table className="settlements-table"><thead><tr><th>PAYSTACK ID</th><th>DATE</th><th>STATUS</th><th>GROSS</th><th>FEES</th><th>NET</th><th>TRANSACTIONS</th></tr></thead><tbody>{items.map(s => <tr key={s.paystack_id}><td><code>{s.paystack_id}</code></td><td>{s.settlement_date ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s.settlement_date)) : '—'}</td><td><StatusBadge status={s.status} tone={s.status === 'success' ? 'positive' : 'neutral'} /></td><td>{money(s.total_amount_minor_units, s.currency)}</td><td>{money(s.total_fees_minor_units, s.currency)}</td><td>{money(s.effective_amount_minor_units, s.currency)}</td><td><button className="settlements-link" onClick={() => open(s)}>{s.transaction_count} · View</button></td></tr>)}</tbody></table></div>}</section>
    {selected && <section className="settlements-card settlements-detail"><header><div><h2>Settlement {selected.paystack_id} transactions</h2><p>{selected.currency} settlement · {selected.settlement_date ? new Date(selected.settlement_date).toLocaleDateString() : 'date unavailable'} · Imported provider page {importPage || '—'}</p></div><button className="button button--quiet" onClick={() => { setSelected(null); setTransactions([]); }}>Close</button></header>
      <div className="settlements-ledger-summary"><span><strong>{transactions.length}</strong> imported transactions</span><span><strong>{matchedCount}</strong> matched</span><span><strong>{unmatchedCount}</strong> unmatched</span></div>
      <div className="settlements-ledger-tools"><input aria-label="Search settlement transactions" placeholder="Search reference, code, channel…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Filter payment matches" value={matchFilter} onChange={e => setMatchFilter(e.target.value as typeof matchFilter)}><option value="all">All transactions</option><option value="matched">Matched</option><option value="unmatched">Unmatched</option></select><button className="button button--quiet" disabled={!filteredTransactions.length} onClick={exportCsv}>Export CSV</button><button className="button button--quiet" disabled={busy || importPage <= 1} onClick={() => void importTransactions(selected, importPage - 1)}>Previous provider page</button><button className="button button--quiet" disabled={busy || !hasMore} onClick={() => void importTransactions(selected, importPage + 1)}>Import next provider page</button></div>
      {busy ? <p className="settlements-loading">Loading transactions…</p> : transactions.length === 0 ? <EmptyState title="No transactions returned" message="This settlement has no transactions on the current provider page." /> : filteredTransactions.length === 0 ? <EmptyState title="No matching transactions" message="Change the search or match filter to see transactions." /> : <div className="settlements-table-scroll"><table className="settlements-table"><thead><tr><th>REFERENCE</th><th>REGISTRATION</th><th>AMOUNT</th><th>CHANNEL</th><th>STATUS</th><th>PAID</th></tr></thead><tbody>{filteredTransactions.map(t => <tr key={t.paystack_id}><td><code>{t.reference || t.paystack_id}</code></td><td>{t.registration_code ? <Link className="settlements-registration-link" to={`/admin/registrations/${encodeURIComponent(t.registration_code)}`}>{t.registration_code}</Link> : <span className="settlements-unmatched">Unmatched</span>}</td><td>{money(t.amount_minor_units, t.currency)}</td><td>{t.channel || '—'}</td><td><StatusBadge status={t.status} tone={t.status === 'success' ? 'positive' : 'neutral'} /></td><td>{t.paid_at ? new Date(t.paid_at).toLocaleString() : '—'}</td></tr>)}</tbody></table></div>}
    </section>}
  </AdminLayout>;
}
