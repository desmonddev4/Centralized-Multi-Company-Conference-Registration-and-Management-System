import { Link, NavLink, useLocation } from 'react-router-dom';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import './Navbar.css';

export default function Navbar() {
  const settings = usePlatformSettings();
  const isHome = useLocation().pathname === '/';
  return <header className="public-nav">
    <Link className="public-nav__brand" to="/" aria-label={`${settings.platform_name} home`}><span className="brand-mark">{settings.platform_name.slice(0, 1).toUpperCase()}</span><span>{settings.platform_name}</span></Link>
    <nav className="public-nav__links" aria-label="Main navigation">
      {isHome ? <>
        <a href="#top">Home</a><a href="#about">About</a><NavLink to="/events">Events</NavLink><a href="#schedule">Schedule</a><a href="#speakers">Speakers</a>
      </> : <><NavLink to="/">Home</NavLink><NavLink to="/events">Events</NavLink></>}
      {settings.support_email && <a className="public-nav__contact" href={`mailto:${settings.support_email}`}>Contact</a>}
    </nav>
    <Link className="button button--quiet public-nav__login" to="/login">Staff sign in <span aria-hidden="true">↗</span></Link>
  </header>;
}
