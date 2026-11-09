import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import './Navbar.css';

export default function Navbar() {
  const settings = usePlatformSettings();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Updates the scrolled state and the reading-progress bar without re-rendering on every scroll tick
    const update = () => {
      setScrolled(window.scrollY > 30);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      headerRef.current?.style.setProperty('--progress', String(progress));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [pathname]);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', closeOnEscape); };
  }, [open]);

  // Lets the CSS spotlight follow the cursor across the glass bar
  const spot = (event: ReactPointerEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', event.clientX - rect.left + 'px');
    el.style.setProperty('--my', event.clientY - rect.top + 'px');
  };

  const close = () => setOpen(false);
  return <header ref={headerRef} onPointerMove={spot} className={`public-nav ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
    <Link className="public-nav__brand" to="/" aria-label={`${settings.platform_name} home`}>
      <img className="brand-emblem" src="/assets/aipis-emblem.png" alt="" />
      <img className="brand-wordmark" src="/assets/aipis-wordmark.png" alt="AIPIS" />
      <span className="brand-year">2027</span>
    </Link>

    <nav className="public-nav__links" id="main-nav" aria-label="Main navigation">
      <Link className="public-nav__drawer-brand" to="/" onClick={close} aria-label={`${settings.platform_name} home`}>
        <img className="brand-emblem" src="/assets/aipis-emblem.png" alt="" />
        <img className="brand-wordmark" src="/assets/aipis-wordmark.png" alt="AIPIS" />
        <span className="brand-year">2027</span>
      </Link>
      <NavLink to="/" end onClick={close}>Home</NavLink>
      <NavLink to="/events" onClick={close}>Conferences</NavLink>
      <NavLink to="/about" onClick={close}>About</NavLink>
      <NavLink to="/company-hosting" onClick={close}>For our companies</NavLink>
      <NavLink to="/contact" onClick={close}>Contact</NavLink>
      <div className="public-nav__drawer-actions">
        <Link className="public-nav__cta" to="/events" onClick={close}>Get tickets <span aria-hidden="true">↗</span></Link>
        <Link className="public-nav__staff" to="/login" onClick={close}>Login</Link>
      </div>
    </nav>

    <div className="public-nav__actions">
      <Link className="public-nav__staff" to="/login">Login</Link>
      <Link className="public-nav__cta" to="/events">Get tickets</Link>
    </div>

    <button className="public-nav__toggle" type="button" aria-expanded={open} aria-controls="main-nav" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen((value) => !value)}><i/><i/><i/></button>
    {open && <button className="public-nav__scrim" type="button" aria-label="Close navigation" onClick={close}/>}
    <span className="public-nav__progress" aria-hidden="true"/>
  </header>;
}
