import { Link } from 'react-router-dom';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import './Footer.css';

export default function Footer() {
  const settings = usePlatformSettings();
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-about">
        <Link className="footer-brand" to="/"><span className="footer-brand__mark">{settings.platform_name.slice(0, 1).toUpperCase()}</span><span>{settings.platform_name}</span></Link>
        <p>Conferences, registrations, and the people who bring them to life—all in one place.</p>
      </div>
      <div className="footer-column">
        <h2>Explore</h2>
        <Link to="/">Home</Link>
        <Link to="/events">All conferences</Link>
        <a href="/#about">About the platform</a>
      </div>
      <div className="footer-column">
        <h2>For attendees</h2>
        <a href="/#schedule">Event schedules</a>
        <Link to="/events">Registration</Link>
        <Link to="/login">Staff sign in</Link>
      </div>
      <div className="footer-column footer-contact">
        <h2>Contact</h2>
        {settings.support_email ? <a href={`mailto:${settings.support_email}`}>{settings.support_email}</a> : <span>Contact details coming soon</span>}
        {settings.support_phone && <a href={`tel:${settings.support_phone}`}>{settings.support_phone}</a>}
      </div>
    </div>
    <div className="footer-bottom">
      <span>© {new Date().getFullYear()} {settings.platform_name}. All rights reserved.</span>
      <a href="#top">Back to top <span aria-hidden="true">↑</span></a>
    </div>
  </footer>;
}
