import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import { LEGAL } from '../../pages/public/legalConfig';
import './Footer.css';

export default function Footer() {
  const settings = usePlatformSettings();
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      footer.classList.add('is-visible');
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        footer.classList.add('is-visible');
        observer.disconnect();
      }
    }, { threshold: .12 });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return <footer className="site-footer" ref={footerRef}>
    <div className="footer-glow" aria-hidden="true" />
    <div className="footer-main">
      <div className="footer-about">
        <Link className="footer-brand" to="/" aria-label={`${settings.platform_name} home`}>
          <img className="footer-brand__wordmark" src="/assets/aipis-wordmark-white.png" alt="AIPIS" />
          <span className="footer-brand__year">2027</span>
        </Link>
        <p>A shared conference system for the companies in our business group—from event discovery and registration to day-of operations.</p>
        <span className="footer-tagline">One conference hub for our companies.</span>
      </div>
      <div className="footer-column">
        <h2>Explore</h2>
        <Link to="/">Home</Link>
        <Link to="/events">Browse conferences</Link>
        <Link to="/about">About the hub</Link>
        <Link to="/company-hosting">For our companies</Link>
      </div>
      <div className="footer-column">
        <h2>Conference help</h2>
        <Link to="/contact">Contact support</Link>
        <Link to="/events">Event details</Link>
      </div>
      <div className="footer-column footer-contact">
        <h2>Contact</h2>
        {settings.support_email && <a href={`mailto:${settings.support_email}`}>{settings.support_email}</a>}
        {settings.support_phone && <a href={`tel:${settings.support_phone}`}>{settings.support_phone}</a>}
        {!settings.support_email && !settings.support_phone && <span>Contact details coming soon</span>}
      </div>
    </div>
    <div className="footer-bottom">
      <span>© {new Date().getFullYear()} {LEGAL.businessName}, {LEGAL.address}. All rights reserved.</span>
      <nav className="footer-legal" aria-label="Legal">
        <Link to="/terms">Terms &amp; Conditions</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/refund-policy">Refund Policy</Link>
      </nav>
      <a className="footer-top" href="#top">Back to top <span aria-hidden="true">↑</span></a>
    </div>
  </footer>;
}
