import type { PropsWithChildren } from 'react';
import Navbar from '../navigation/Navbar';
import Footer from '../navigation/Footer';
import './PublicLayout.css';
export default function PublicLayout({ children }: PropsWithChildren) { return <div className="public-layout"><Navbar/><div className="public-layout__content">{children}</div><Footer/></div>; }
