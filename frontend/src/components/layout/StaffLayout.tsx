import type { PropsWithChildren } from 'react';
import StaffNavbar from '../navigation/StaffNavbar';
import './StaffLayout.css';
export default function StaffLayout({ children }: PropsWithChildren) { return <div className="staff-layout"><StaffNavbar/><main>{children}</main></div>; }
