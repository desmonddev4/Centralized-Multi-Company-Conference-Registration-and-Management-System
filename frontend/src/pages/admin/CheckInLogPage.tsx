import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import EmptyState from '../../components/feedback/EmptyState';
import { eventsApi, type CheckInLogEntry } from '../../api/events';
import './CheckInLogPage.css';

function csvCell(value:string){return '"'+String(value).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';}

export default function CheckInLogPage(){
  const [rows,setRows]=useState<CheckInLogEntry[]>([]);const [search,setSearch]=useState('');const [conference,setConference]=useState('all');const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{setRows(await eventsApi.checkInLog());}catch(cause){setError(cause instanceof Error?cause.message:'Could not load check-in records.');}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const conferences=useMemo(()=>Array.from(new Map(rows.map(row=>[row.conference_slug,{slug:row.conference_slug,title:row.conference_title}])).values()).sort((a,b)=>a.title.localeCompare(b.title)),[rows]);
  const filtered=useMemo(()=>rows.filter(row=>(conference==='all'||row.conference_slug===conference)&&`${row.attendee_name} ${row.registration_code} ${row.conference_title} ${row.company_name} ${row.ticket_name} ${row.checked_in_by_name}`.toLowerCase().includes(search.trim().toLowerCase())),[rows,conference,search]);
  function exportCsv(){const data=[['Checked in at','Attendee full name','Registration code','Conference','Company','Ticket','Recorded by'],...filtered.map(row=>[row.checked_in_at,row.attendee_name,row.registration_code,row.conference_title,row.company_name,row.ticket_name,row.checked_in_by_name])];const blob=new Blob(['\uFEFF'+data.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='conference-check-in-log.csv';anchor.click();URL.revokeObjectURL(url);}
  return <AdminLayout title="Check-in log" eyebrow="EVENT OPERATIONS">
    <div className="checkin-log-toolbar"><div><p>Attendance records across all conferences, with the staff member and time recorded.</p></div><button className="button button--quiet" disabled={loading} onClick={()=>void load()}>↻ Refresh</button><button className="button button--primary" disabled={loading||!filtered.length} onClick={exportCsv}>Export CSV</button></div>
    {error&&<div className="checkin-log-error" role="alert">{error}</div>}
    <section className="checkin-log-summary"><div><span>TOTAL CHECK-INS</span><strong>{rows.length.toLocaleString()}</strong></div><div><span>CONFERENCES</span><strong>{conferences.length.toLocaleString()}</strong></div><div><span>SHOWING</span><strong>{filtered.length.toLocaleString()}</strong></div></section>
    <div className="checkin-log-filters"><input aria-label="Search check-in log" placeholder="Search attendee, code, conference, ticket or staff" value={search} onChange={event=>setSearch(event.target.value)}/><label>Conference<select value={conference} onChange={event=>setConference(event.target.value)}><option value="all">All conferences</option>{conferences.map(item=><option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label></div>
    <section className="checkin-log-card"><header><div><h2>Attendance activity</h2><p>Newest check-ins first</p></div></header>{loading?<div className="checkin-log-loading">Loading attendance activity…</div>:filtered.length===0?<EmptyState title="No check-ins found" message={rows.length?'Try another search or conference filter.':'Recorded attendee check-ins will appear here.'}/>:<div className="checkin-log-scroll"><table><thead><tr><th>CHECKED IN</th><th>ATTENDEE</th><th>REGISTRATION CODE</th><th>CONFERENCE</th><th>TICKET</th><th>RECORDED BY</th></tr></thead><tbody>{filtered.map(row=><tr key={row.registration_code}><td>{new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(row.checked_in_at))}</td><td><strong>{row.attendee_name}</strong><small>{row.company_name}</small></td><td><code>{row.registration_code}</code></td><td>{row.conference_title}</td><td>{row.ticket_name}</td><td>{row.checked_in_by_name}</td></tr>)}</tbody></table></div>}</section>
  </AdminLayout>;
}
