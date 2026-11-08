import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { accountsApi, type StaffUser } from '../../api/events';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import './AdminSidebar.css';
import './AdminSidebar.redesign.css';

const items = [
  { label:'Overview', to:'/admin', icon:'⌂' },
  { label:'Companies', to:'/admin/companies', icon:'▦', permission:'companies.view_company' },
  { label:'Conferences', to:'/admin/events', icon:'▣', permission:'events.view_conference' },
  { label:'Conference program', to:'/admin/program', icon:'☷', permission:'events.view_conference' },
  { label:'Registrations', to:'/admin/registrations', icon:'＋', permission:'registrations.view_registration' },
  { label:'Attendees', to:'/admin/attendees', icon:'♙', permission:'registrations.view_registration' },
  { label:'Ticket delivery', to:'/admin/ticket-delivery', icon:'✉', permission:'registrations.view_registration' },
  { label:'Payments', to:'/admin/payments', icon:'＄', permission:'payments.view_payment' },
  { label:'Offline collections', to:'/admin/offline-collections', icon:'₵', permission:'payments.view_payment' },
  { label:'Payment reviews', to:'/admin/payment-reviews', icon:'!', permission:'payments.view_payment' },
  { label:'Refunds', to:'/admin/refunds', icon:'↶', permission:'payments.view_refund' },
  { label:'Settlements', to:'/admin/settlements', icon:'⇄', permission:'payments.view_settlement' },
  { label:'Check-in desk', to:'/staff/check-in', icon:'✓', permission:'checkin.add_checkinrecord' },
  { label:'Check-in log', to:'/admin/check-in-log', icon:'▤', permission:'checkin.view_checkinrecord' },
  { label:'Walk-in registration', to:'/staff/walk-in', icon:'↗', permission:'registrations.add_registration' },
  { label:'Reports', to:'/admin/reports', icon:'▥', permission:'registrations.view_registration' },
  { label:'Team & users', to:'/admin/users', icon:'♧', owner:true },
  { label:'Roles', to:'/admin/roles', icon:'◇', owner:true },
  { label:'Audit log', to:'/admin/audit', icon:'◷', scope:'audit' },
  { label:'System readiness', to:'/admin/system-readiness', icon:'✓', permission:'core.change_platformsettings' },
];
const settingsItem = { label:'Settings', to:'/admin/settings', icon:'⚙' };

export default function AdminSidebar() {
  const platform=usePlatformSettings();
  const [user,setUser]=useState<StaffUser|null>(null);
  const [signingOut,setSigningOut]=useState(false);
  const navigate=useNavigate();
  useEffect(()=>{let mounted=true;accountsApi.session().then(result=>{if(mounted)setUser(result.user);}).catch(()=>undefined);return()=>{mounted=false;};},[]);
  const permissions=user?.permissions||[];
  const owner=Boolean(user?.is_superuser||user?.groups.some(group=>group.name==='Business Owner'));
  const canSeeSettings=owner||permissions.includes('core.change_platformsettings');
  const visible=items.filter(item=>!item.owner||owner).filter(item=>!item.permission||owner||permissions.includes(item.permission)).filter(item=>!item.scope||owner||permissions.some(permission=>permission.startsWith(item.scope+'.view_')));
  async function signOut(){setSigningOut(true);try{await accountsApi.logout();}finally{navigate('/login',{replace:true});}}
  const initials=(user?.full_name||user?.username||'Staff').split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join('');
  return <aside className="admin-sidebar">
    <NavLink className="admin-sidebar__brand" to="/admin" aria-label={`${platform.platform_name} staff workspace`}><span className="admin-sidebar__logo"><img src="/assets/aipis-wordmark-white.png" alt="AIPIS"/><b>2027</b></span><span className="admin-sidebar__brand-caption">{platform.platform_name}<small>STAFF WORKSPACE</small></span></NavLink>
    <nav className="admin-sidebar__nav" aria-label="Admin navigation">{visible.map((item,index)=><div key={item.to}>{index===0&&<p className="sidebar-heading">WORKSPACE</p>}{['Registrations','Reports'].includes(item.label)&&<p className="sidebar-heading">{item.label==='Registrations'?'OPERATIONS':'INSIGHTS & ACCESS'}</p>}<NavLink end={item.to==='/admin'} title={item.label} className={({isActive})=>isActive?'sidebar-link is-active':'sidebar-link'} to={item.to}><span className="sidebar-link__icon" aria-hidden="true">{item.icon}</span><span className="sidebar-link__label">{item.label}</span></NavLink></div>)}</nav>
    <div className="admin-sidebar__footer">
      {canSeeSettings&&<NavLink title={settingsItem.label} className={({isActive})=>isActive?'sidebar-link is-active':'sidebar-link'} to={settingsItem.to}><span className="sidebar-link__icon" aria-hidden="true">{settingsItem.icon}</span><span className="sidebar-link__label">{settingsItem.label}</span></NavLink>}
      <div className="admin-sidebar__profile"><span className="avatar">{initials||'S'}</span><span className="admin-sidebar__who"><strong>{user?.full_name||user?.username||'Staff account'}</strong><small>{owner?'Business owner':user?.groups.map(group=>group.name).join(', ')||'Staff'}</small></span></div>
      <button type="button" className="admin-signout" onClick={()=>void signOut()} disabled={signingOut} title="Sign out"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg><span>{signingOut?'Signing out…':'Sign out'}</span></button>
    </div>
  </aside>;
}
