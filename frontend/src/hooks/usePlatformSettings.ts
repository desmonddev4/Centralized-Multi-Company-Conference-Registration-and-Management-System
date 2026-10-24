import { useEffect, useState } from 'react';
import { platformSettingsApi, type PlatformSettings } from '../api/events';

const fallback:PlatformSettings={platform_name:'ConferenceHub',support_email:'',support_phone:'',registration_hold_minutes:15,updated_at:''};
export default function usePlatformSettings(){
  const [settings,setSettings]=useState<PlatformSettings>(fallback);
  useEffect(()=>{let active=true;const update=(event:Event)=>{const value=(event as CustomEvent<PlatformSettings>).detail;if(value)setSettings(value);};window.addEventListener('platform-settings-updated',update);platformSettingsApi.get().then(value=>{if(active)setSettings(value);}).catch(()=>undefined);return()=>{active=false;window.removeEventListener('platform-settings-updated',update);};},[]);
  return settings;
}
