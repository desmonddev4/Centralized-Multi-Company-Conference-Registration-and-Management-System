import { useEffect, useState, type PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { accountsApi } from '../../api/events';
import './RequireStaff.css';

export default function RequireStaff({children}:PropsWithChildren){
 const location=useLocation();const[ready,setReady]=useState(false);const[authenticated,setAuthenticated]=useState(false);
 useEffect(()=>{let mounted=true;accountsApi.session().then(result=>{if(mounted){setAuthenticated(result.authenticated);setReady(true);}}).catch(()=>{if(mounted){setAuthenticated(false);setReady(true);}});return()=>{mounted=false;};},[]);
 if(!ready)return <div className="staff-route-loading">Checking staff access…</div>;
 if(!authenticated)return <Navigate to="/login" replace state={{from:location.pathname}}/>;
 return children;
}
