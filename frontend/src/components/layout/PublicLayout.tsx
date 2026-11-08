import type { PropsWithChildren } from 'react';
import Navbar from '../navigation/Navbar';
import Footer from '../navigation/Footer';
import './PublicTheme.css';
import './PublicLayout.css';
type PublicLayoutProps = PropsWithChildren<{ showFooter?: boolean }>;

export default function PublicLayout({ children, showFooter = true }: PublicLayoutProps) {
  return (
    <div className="public-layout">
      <Navbar />
      <div className="public-layout__content">{children}</div>
      {showFooter && <Footer />}
    </div>
  );
}
