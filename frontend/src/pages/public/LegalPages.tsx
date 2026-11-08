import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import PageHero from '../../components/layout/PageHero';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import { LEGAL } from './legalConfig';
import './LegalPages.css';

type Section = { id: string; title: string; body: ReactNode };

function Contact() {
  const settings = usePlatformSettings();
  return <ul className="legal-contact">
    <li><strong>{LEGAL.businessName}</strong>, {LEGAL.address}</li>
    <li>Email: {settings.support_email ? <a href={`mailto:${settings.support_email}`}>{settings.support_email}</a> : 'see the Contact page'}</li>
    {settings.support_phone && <li>Phone: <a href={`tel:${settings.support_phone}`}>{settings.support_phone}</a></li>}
    <li>Or use our <Link to="/contact">Contact page</Link>.</li>
  </ul>;
}

function LegalDocument({ eyebrow, title, intro, sections }: { eyebrow: string; title: ReactNode; intro: string; sections: Section[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '');

  const ids = sections.map((section) => section.id).join('|');

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-110px 0px -65% 0px' });
    ids.split('|').forEach((id) => { const node = document.getElementById(id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [ids]);

  return <PublicLayout>
    <PageHero compact eyebrow={eyebrow} title={title}>{intro}</PageHero>
    <main className="pp-wrap legal-layout">
      <nav className="legal-toc" aria-label="On this page">
        <p>On this page</p>
        {sections.map((section, index) => <a key={section.id} href={`#${section.id}`} className={active === section.id ? 'is-active' : ''}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</a>)}
        <div className="legal-toc__links">
          <Link to="/terms">Terms &amp; Conditions</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/refund-policy">Refund &amp; Cancellation</Link>
        </div>
      </nav>
      <article className="legal-doc">
        <p className="legal-doc__updated">Last updated: {LEGAL.lastUpdated}</p>
        {sections.map((section, index) => <section key={section.id} id={section.id} className="legal-section">
          <h2><span>{index + 1}.</span>{section.title}</h2>
          {section.body}
        </section>)}
      </article>
    </main>
  </PublicLayout>;
}

/* ───────── Terms & Conditions ───────── */
export function TermsPage() {
  const sections: Section[] = [
    { id: 'about', title: 'Who we are and these terms', body: <>
      <p>This website and registration system (the “Platform”) is operated by <strong>{LEGAL.businessName}</strong>, {LEGAL.address} (“we”, “us”). It lets people discover conferences hosted by the companies in our business group, register for them, pay for tickets and receive their tickets.</p>
      <p>By creating a registration or making a payment on the Platform you agree to these Terms &amp; Conditions, our <Link to="/privacy">Privacy Policy</Link> and our <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>. If you do not agree, please do not use the Platform.</p>
    </> },
    { id: 'service', title: 'What the Platform does', body: <>
      <p>We provide event information, online registration, ticket sales, payment collection, digital tickets and event check-in. Each conference is organised and hosted by the company named on its event page (the “Organiser”). We act on the Organiser’s behalf to take registrations and payments.</p>
    </> },
    { id: 'registration', title: 'Registering and tickets', body: <>
      <ul>
        <li>You must give accurate details (full name, email address and, if asked, phone number). Your ticket is issued in the name you provide.</li>
        <li>Each registration is for one attendee. To register another person, make a separate registration.</li>
        <li>When you reserve a place we hold your ticket for a limited time while you complete payment. If payment is not completed before the hold expires, the reservation is released and you will need to register again.</li>
        <li>You will receive a unique registration code. Keep it safe: it identifies your registration and ticket and is used for check-in.</li>
        <li>Tickets are personal to the named attendee and may not be resold. We may cancel tickets that are resold or obtained fraudulently.</li>
      </ul>
    </> },
    { id: 'payment', title: 'Prices and payment', body: <>
      <ul>
        <li>All prices are shown in {LEGAL.currency}. Early-registration prices, where offered, apply until the date shown on the ticket.</li>
        <li>Online payments are processed by <strong>Paystack</strong>, an independent payment provider, by card or supported mobile money. Your card or mobile money details are entered on Paystack’s secure page; we never see or store them.</li>
        <li>Your registration is confirmed only after your payment has been verified. If your payment fails or is abandoned, you are not charged for a ticket.</li>
        <li>Where an event offers payment at the venue, payments made by cash or mobile money are recorded by authorised staff and a receipt reference is issued.</li>
        <li>The price you see at checkout is the price you pay. We do not add hidden charges.</li>
      </ul>
    </> },
    { id: 'delivery', title: 'Delivery of tickets', body: <>
      <p>Tickets are digital; nothing is posted or couriered. Once your payment is confirmed:</p>
      <ul>
        <li>your registration page shows a confirmation and a link to view and print your ticket, which includes a QR code;</li>
        <li>we also send your ticket details to the email address you registered with, normally within minutes.</li>
      </ul>
      <p>If you have not received your ticket email, check your spam folder, then open your registration using your registration code or contact us (see “Contact us”) and we will resend it.</p>
    </> },
    { id: 'refunds', title: 'Cancellations and refunds', body: <>
      <p>Refunds are governed by our <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>. In summary, tickets are refundable only if the Organiser cancels or reschedules the event.</p>
    </> },
    { id: 'conduct', title: 'Attending an event', body: <>
      <ul>
        <li>Present your ticket QR code or registration code at the entrance. A ticket can be checked in once.</li>
        <li>Follow the venue’s rules and the reasonable instructions of the Organiser and venue staff.</li>
        <li>We or the Organiser may refuse entry or remove a person who behaves unlawfully, endangers others or breaches these terms, without a refund.</li>
      </ul>
    </> },
    { id: 'changes', title: 'Changes to events', body: <>
      <p>Programmes, speakers, session times and venues can change. We will show updates on the event page and, where appropriate, contact registered attendees. If an event is cancelled or rescheduled, the Refund &amp; Cancellation Policy explains your options.</p>
    </> },
    { id: 'ip', title: 'Intellectual property', body: <>
      <p>The Platform, its design, text, logos and event materials belong to us, the Organisers or their licensors. You may not copy, scrape or reuse them except for your own personal, non-commercial use as an attendee.</p>
    </> },
    { id: 'liability', title: 'Our responsibility', body: <>
      <p>We take reasonable care to run the Platform accurately and securely. Nothing in these terms limits liability that cannot be limited by law, including for fraud or for death or personal injury caused by negligence.</p>
      <p>Subject to that, we are not responsible for losses caused by events outside our reasonable control, such as network, mobile-money or payment-provider outages, or for indirect losses. Our total liability to you for any claim relating to a ticket is limited to the amount you paid for that ticket.</p>
    </> },
    { id: 'privacy', title: 'Your personal data', body: <>
      <p>We handle personal data as described in our <Link to="/privacy">Privacy Policy</Link>.</p>
    </> },
    { id: 'updates', title: 'Changes to these terms', body: <>
      <p>We may update these terms from time to time. The “Last updated” date above shows the current version. The version in force when you register applies to that registration.</p>
    </> },
    { id: 'law', title: 'Governing law', body: <>
      <p>These terms are governed by the laws of the Republic of Ghana, and the courts of Ghana have jurisdiction over any dispute, without affecting any mandatory consumer rights you may have where you live.</p>
    </> },
    { id: 'contact', title: 'Contact us', body: <><p>Questions about these terms, your registration or your payment:</p><Contact /></> },
  ];
  return <LegalDocument eyebrow="Legal" title={<>Terms &amp; <em>Conditions</em></>} intro="The rules for registering for conferences, paying for tickets and attending events through our platform." sections={sections} />;
}

/* ───────── Privacy Policy ───────── */
export function PrivacyPage() {
  const sections: Section[] = [
    { id: 'who', title: 'Who we are', body: <>
      <p><strong>{LEGAL.businessName}</strong>, {LEGAL.address}, is the data controller for personal data collected through this Platform. This policy explains what we collect, why, who we share it with and your rights under the Data Protection Act, 2012 (Act 843) of Ghana.</p>
    </> },
    { id: 'collect', title: 'What we collect', body: <>
      <ul>
        <li><strong>Registration details:</strong> your full name, email address, phone number (optional), the conference and ticket type you choose, and your registration code.</li>
        <li><strong>Payment details:</strong> payment reference, amount, currency, status and method (for example card or mobile money). Card and mobile-money credentials are entered with Paystack and are <em>not</em> received or stored by us.</li>
        <li><strong>Event attendance:</strong> check-in records (whether and when your ticket was scanned).</li>
        <li><strong>Support messages:</strong> information you send us when you contact us.</li>
        <li><strong>Technical data:</strong> basic server logs (such as IP address and browser type) used to keep the Platform secure. Staff sign-in uses a session cookie.</li>
      </ul>
      <p>We do not knowingly collect data from children under 18, and the Platform is not directed at them.</p>
    </> },
    { id: 'use', title: 'How and why we use it', body: <>
      <ul>
        <li>To create and manage your registration, take payment and issue your ticket (performance of the contract with you).</li>
        <li>To send transactional messages such as your ticket, receipts, and notices about changes or cancellation of an event you registered for.</li>
        <li>To check attendees in and run the event safely.</li>
        <li>To prevent fraud, secure the Platform and keep records of payments and refunds (legitimate interests and legal obligations).</li>
        <li>To respond to your questions and requests.</li>
      </ul>
      <p>We do not sell your personal data and we do not send marketing messages unless you separately agree to receive them.</p>
    </> },
    { id: 'share', title: 'Who we share it with', body: <>
      <ul>
        <li><strong>The Organiser</strong> of the conference you register for, so it can run the event.</li>
        <li><strong>Paystack</strong>, our payment processor, to take payments and process refunds. Paystack handles your payment data under its own privacy policy.</li>
        <li><strong>Service providers</strong> that host the Platform or deliver email on our behalf, under confidentiality and security obligations.</li>
        <li><strong>Authorities</strong>, where required by law or to protect rights and safety.</li>
      </ul>
    </> },
    { id: 'transfers', title: 'International transfers', body: <>
      <p>Some providers, including payment and hosting providers, may process data outside Ghana. Where this happens we take steps to make sure your data stays protected as required by Act 843.</p>
    </> },
    { id: 'retention', title: 'How long we keep it', body: <>
      <p>We keep registration and attendance records for as long as needed to run the event and handle queries, and we keep payment and refund records for as long as financial and tax rules require. After that we delete or anonymise the data.</p>
    </> },
    { id: 'security', title: 'How we protect it', body: <>
      <p>We use access controls, encrypted connections and audit logging, and restrict staff access to what their role needs. No system is completely secure, so please keep your registration code private.</p>
    </> },
    { id: 'rights', title: 'Your rights', body: <>
      <p>Under Act 843 you may ask us to confirm what personal data we hold about you, to give you a copy, to correct inaccurate data, to delete data we no longer need, or to stop certain processing. To exercise a right, contact us using the details below. We will respond within a reasonable time and may need to confirm your identity first.</p>
      <p>If you are unhappy with how we handle your data you can complain to the Data Protection Commission of Ghana.</p>
    </> },
    { id: 'cookies', title: 'Cookies', body: <>
      <p>We use only essential cookies, for example to keep staff signed in securely. We do not use advertising cookies.</p>
    </> },
    { id: 'changes', title: 'Changes to this policy', body: <>
      <p>We may update this policy. The “Last updated” date shows the current version, and we will highlight material changes on the Platform.</p>
    </> },
    { id: 'contact', title: 'Contact us', body: <><p>For privacy questions or to exercise your rights:</p><Contact /></> },
  ];
  return <LegalDocument eyebrow="Legal" title={<>Privacy <em>Policy</em></>} intro="What personal data we collect when you register for a conference, how we use it and the choices you have." sections={sections} />;
}

/* ───────── Refund & Cancellation Policy ───────── */
export function RefundPolicyPage() {
  const sections: Section[] = [
    { id: 'summary', title: 'In short', body: <>
      <p>Tickets are <strong>refundable only if the Organiser cancels or reschedules the event</strong>. Tickets are not refundable if you simply change your mind or cannot attend an event that goes ahead as planned.</p>
    </> },
    { id: 'cancelled', title: 'If an event is cancelled', body: <>
      <p>If the Organiser cancels an event, you are entitled to a <strong>full refund of the amount you paid</strong> for your ticket. You do not need to do anything: we will refund registered attendees to the original payment method and let you know by email. If you have not heard from us, contact us with your registration code.</p>
    </> },
    { id: 'rescheduled', title: 'If an event is rescheduled', body: <>
      <p>If the Organiser moves an event to a new date, your ticket stays valid for the new date. If you cannot attend on the new date, you may request a full refund within <strong>{LEGAL.rescheduleRefundWindowDays} days</strong> of the date we notify you of the change. After that period the ticket is treated as used for the new date.</p>
    </> },
    { id: 'not-refundable', title: 'When tickets are not refundable', body: <>
      <ul>
        <li>You change your mind or are unable to attend an event that goes ahead on its announced dates.</li>
        <li>Changes to the programme, speakers, session times or room allocation that do not amount to cancelling or rescheduling the event.</li>
        <li>You were refused entry or removed for breaching the <Link to="/terms">Terms &amp; Conditions</Link>.</li>
      </ul>
    </> },
    { id: 'errors', title: 'Payment problems', body: <>
      <ul>
        <li><strong>Failed or abandoned payment:</strong> if your payment does not complete, no ticket is issued and you are not charged. If your account or mobile money was debited anyway, contact us with the payment reference and we will investigate and refund where appropriate.</li>
        <li><strong>Duplicate payment:</strong> if you are charged twice for the same registration, we refund the extra charge.</li>
        <li><strong>Payment under review:</strong> if a payment is received but we cannot confirm your ticket (for example, tickets sold out in the meantime), we will refund you in full.</li>
      </ul>
    </> },
    { id: 'how', title: 'How refunds are paid', body: <>
      <ul>
        <li>Online payments are refunded to the original card or mobile money account through Paystack.</li>
        <li>Refunds are normally completed within <strong>{LEGAL.refundProcessing}</strong> of approval. Your bank or mobile-money provider may take additional time to show the credit.</li>
        <li>Payments made in cash or mobile money at the venue are refunded by the same method by the Organiser.</li>
        <li>We refund the full amount you paid for the ticket. Refunds are made in {LEGAL.currency}.</li>
      </ul>
    </> },
    { id: 'request', title: 'How to request a refund', body: <>
      <p>Email or call us with your <strong>registration code</strong>, the name on the registration and the reason for the request. We will confirm by email once your request has been reviewed and, if approved, when the refund has been submitted.</p>
      <Contact />
    </> },
  ];
  return <LegalDocument eyebrow="Legal" title={<>Refund &amp; <em>Cancellation</em></>} intro="When tickets can be refunded, how refunds are paid and how to ask for one." sections={sections} />;
}
