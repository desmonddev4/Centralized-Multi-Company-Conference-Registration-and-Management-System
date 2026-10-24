import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { accountsApi, type StaffUser } from '../../api/events';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import './AdminSidebar.css';

const items = [
  { label:'Overview', to:'/admin', icon:'â—«' },
  { label:'Companies', to:'/admin/companies', icon:'â–¦', permission:'companies.view_company' },
  { label:'Conferences', to:'/admin/events', icon:'â–£', permission:'events.view_conference' },
  { label:'Conference program', to:'/admin/program', icon:'☷', permission:'events.view_conference' },
  { label:'Registrations', to:'/admin/registrations', icon:'+', permission:'registrations.view_registration' },
  { label:'Attendees', to:'/admin/attendees', icon:'â™§', permission:'registrations.view_registration' },
  { label:'Ticket delivery', to:'/admin/ticket-delivery', icon:'✉', permission:'registrations.view_registration' },
  { label:'Payments', to:'/admin/payments', icon:'$', permission:'payments.view_payment' },
  { label:'Offline collections', to:'/admin/offline-collections', icon:'GHS', permission:'payments.view_payment' },
  { label:'Payment reviews', to:'/admin/payment-reviews', icon:'!', permission:'payments.view_payment' },
  { label:'Refunds', to:'/admin/refunds', icon:'â†©', permission:'payments.view_refund' },
  { label:'Settlements', to:'/admin/settlements', icon:'â‡„', permission:'payments.view_settlement' },
  { label:'Check-in desk', to:'/staff/check-in', icon:'âŒ–', permission:'checkin.add_checkinrecord' },
  { label:'Check-in log', to:'/admin/check-in-log', icon:'☷', permission:'checkin.view_checkinrecord' },
  { label:'Walk-in registration', to:'/staff/walk-in', icon:'â†—', permission:'registrations.add_registration' },
  { label:'Reports', to:'/admin/reports', icon:'â—§', permission:'registrations.view_registration' },
  { label:'Team & users', to:'/admin/users', icon:'â™™', owner:true },
  { label:'Roles', to:'/admin/roles', icon:'â—‡', owner:true },
  { label:'Audit log', to:'/admin/audit', icon:'â—·', scope:'audit' },
  { label:'System readiness', to:'/admin/system-readiness', icon:'✓', permission:'core.change_platformsettings' },
  { label:'Settings', to:'/admin/settings', icon:'âš™', owner:true },
];

export default function AdminSidebar() {
  const platform=usePlatformSettings();
  const [user,setUser]=useState<StaffUser|null>(null);
  const navigate=useNavigate();
  useEffect(()=>{let mounted=true;accountsApi.session().then(result=>{if(mounted)setUser(result.user);}).catch(()=>undefined);return()=>{mounted=false;};},[]);
  const permissions=user?.permissions||[];
  const owner=Boolean(user?.is_superuser||user?.groups.some(group=>group.name==='Business Owner'));
  const visible=items.filter(item=>!item.owner||owner).filter(item=>!item.permission||owner||permissions.includes(item.permission)).filter(item=>!item.scope||owner||permissions.some(permission=>permission.startsWith(item.scope+'.view_')));
  async function signOut(){try{await accountsApi.logout();}finally{navigate('/login',{replace:true});}}
  const initials=(user?.full_name||user?.username||'Staff').split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join('');
  return <aside className="admin-sidebar">
    <NavLink className="admin-sidebar__brand" to="/admin"><span className="brand-mark">{platform.platform_name.slice(0,1).toUpperCase()}</span><span>{platform.platform_name}</span></NavLink>
    <div className="admin-sidebar__scope"><span className="scope-dot"/> Group workspace <span className="scope-chevron">âŒ„</span></div>
    <nav aria-label="Admin navigation">{visible.map((item,index)=><div key={item.to}>{index===0&&<p className="sidebar-heading">WORKSPACE</p>}{['Registrations','Reports'].includes(item.label)&&<p className="sidebar-heading">{item.label==='Registrations'?'OPERATIONS':'INSIGHTS & ACCESS'}</p>}<NavLink end={item.to==='/admin'} title={item.label} className={({isActive})=>isActive?'sidebar-link is-active':'sidebar-link'} to={item.to}><span className="sidebar-link__icon" aria-hidden="true">{item.icon}</span>{item.label}</NavLink></div>)}</nav>
    <div className="admin-sidebar__profile"><span className="avatar">{initials||'S'}</span><span><strong>{user?.full_name||user?.username||'Staff account'}</strong><small>{owner?'Business owner':user?.groups.map(group=>group.name).join(', ')||'Staff'}</small></span><button className="profile-menu" onClick={()=>void signOut()} aria-label="Sign out" title="Sign out">â†ª</button></div>
  </aside>;
}
