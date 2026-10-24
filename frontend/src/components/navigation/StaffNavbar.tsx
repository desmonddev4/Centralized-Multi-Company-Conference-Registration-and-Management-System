import { Link } from 'react-router-dom';
import './StaffNavbar.css';
export default function StaffNavbar() { return <header className="staff-nav"><Link to="/admin" className="staff-nav__brand"><span className="brand-mark">C</span> Event operations</Link><Link to="/admin">← Admin workspace</Link></header>; }
