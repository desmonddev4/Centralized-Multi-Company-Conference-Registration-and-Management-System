import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <PublicLayout>
      <main className="not-found-page">
        <section className="not-found-card" aria-labelledby="not-found-title">
          <p className="not-found-code">404</p>
          <h1 id="not-found-title">We can’t find that page</h1>
          <p className="not-found-copy">
            The link may be incorrect, or the page may have moved. Try returning home or browse upcoming conferences.
          </p>
          <div className="not-found-actions">
            <Link className="not-found-primary" to="/">Go to homepage</Link>
            <Link className="not-found-secondary" to="/events">Browse conferences</Link>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
