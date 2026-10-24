import { useCallback, useEffect, useState, type FormEvent } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { platformSettingsApi, type PlatformSettings } from '../../api/events';
import './SettingsPage.css';

type Form={platform_name:string;support_email:string;support_phone:string;registration_hold_minutes:string};
const defaults:Form={platform_name:'ConferenceHub',support_email:'',support_phone:'',registration_hold_minutes:'15'};
export default function SettingsPage(){
  const [form,setForm]=useState<Form>(defaults);const [loading,setLoading]=useState(true);const [loaded,setLoaded]=useState(false);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{setForm(fromSettings(await platformSettingsApi.get()));setLoaded(true);}catch(e){setError(e instanceof Error?e.message:'Could not load platform settings.');}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  function field(key:keyof Form,value:string){setForm(current=>({...current,[key]:value}));}
  async function submit(event:FormEvent){event.preventDefault();setSaving(true);setError('');setNotice('');try{const value=await platformSettingsApi.update({platform_name:form.platform_name.trim(),support_email:form.support_email.trim(),support_phone:form.support_phone.trim(),registration_hold_minutes:Number(form.registration_hold_minutes)});setForm(fromSettings(value));setNotice('Platform settings saved. Public branding updates across the site.');}catch(e){setError(e instanceof Error?e.message:'Could not save platform settings.');}finally{setSaving(false);}}
  return <AdminLayout title="Settings" eyebrow="PLATFORM CONFIGURATION"><div className="settings-intro"><p>Manage public platform identity and registration behavior for every company in the group.</p></div>{error&&<div className="settings-error" role="alert">{error}{!loaded&&<button type="button" className="button button--quiet" onClick={()=>void load()}>Retry</button>}</div>}{notice&&<div className="settings-notice" role="status">{notice}</div>}
    <form className="settings-form" onSubmit={submit}><section className="settings-card"><header><div><h2>Public identity</h2><p>Shown in the public navigation, footer, and contact links.</p></div></header><div className="settings-fields"><label>Platform name<input required maxLength={80} value={form.platform_name} onChange={e=>field('platform_name',e.target.value)} placeholder="ConferenceHub"/></label><label>Support email<input type="email" maxLength={254} value={form.support_email} onChange={e=>field('support_email',e.target.value)} placeholder="support@example.com"/><small>When provided, visitors can use it to contact the business.</small></label><label>Support phone<input type="tel" maxLength={40} value={form.support_phone} onChange={e=>field('support_phone',e.target.value)} placeholder="+233…"/></label></div></section>
      <section className="settings-card"><header><div><h2>Registration operations</h2><p>Controls applied when new paid registrations are created.</p></div></header><div className="settings-fields"><label className="settings-hold-field">Payment reservation hold (minutes)<input type="number" min="1" max="120" step="1" required value={form.registration_hold_minutes} onChange={e=>field('registration_hold_minutes',e.target.value)}/><small>Choose 1–120 minutes. Changing this value affects new registrations only; existing reservations keep their current expiry.</small></label></div></section>
      <div className="settings-save-row"><p>Payment provider secrets stay in the backend environment and are not exposed here.</p><button className="button button--dark" disabled={!loaded||loading||saving}>{loading?'Loading…':saving?'Saving…':'Save settings'}</button></div>
    </form>
  </AdminLayout>;
}
function fromSettings(settings:PlatformSettings):Form{return{platform_name:settings.platform_name,support_email:settings.support_email,support_phone:settings.support_phone,registration_hold_minutes:String(settings.registration_hold_minutes)};}
