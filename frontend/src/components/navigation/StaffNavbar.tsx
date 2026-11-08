import { Link } from 'react-router-dom';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import './StaffNavbar.css';
export default function StaffNavbar() { const platform=usePlatformSettings(); return <header className="staff-nav"><Link to="/admin" className="staff-nav__brand"><span className="staff-nav__identity"><img src="/assets/aipis-wordmark.png" alt="AIPIS"/><b>2027</b></span><span>{platform.platform_name}<small>STAFF WORKSPACE</small></span></Link><Link to="/admin">← Admin workspace</Link></header>; }
