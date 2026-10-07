import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight, FiMail, FiMessageCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { contactMessageAPI } from '../services/api';
import './Contact.css';

const INITIAL_FORM = { name: '', email: '', phone: '', subject: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await contactMessageAPI.send(form);
      setForm(INITIAL_FORM);
      toast.success('Thanks for contacting us. Our team will get back to you soon.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = 'w-full rounded-xl border border-[#e8dccb] bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#a98345] focus:outline-none focus:ring-2 focus:ring-[#a98345]/20';

  return (
    <main className="contact-page min-h-[70vh]">
      <section className="contact-hero">
        <img src="/jewelry/hero-gold.jpg" alt="" />
        <div className="contact-hero__shade" />
        <div className="contact-hero__content">
          <nav aria-label="Breadcrumb">
            <Link to="/">Home</Link><FiChevronRight aria-hidden="true" /><span>Contact</span>
          </nav>
          <p>We are here to help</p>
          <h1>Let&apos;s talk.</h1>
          <span>Questions, feedback, or a little help finding the right piece — our team is here for you.</span>
        </div>
      </section>
      <div className="contact-content">
        <section className="contact-intro">
          <div>
            <p className="contact-eyebrow">Contact our team</p>
            <h2>We&apos;re only a message away.</h2>
            <p>
              Have a question or need a hand? Send us a message and our team will get back to you.
            </p>
          </div>
          <div className="contact-promises">
            <p><FiMail aria-hidden="true" /> Your message goes directly to our Super Admin team.</p>
            <p><FiMessageCircle aria-hidden="true" /> We usually respond as soon as possible.</p>
          </div>
        </section>

        <form onSubmit={submit} className="contact-form">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">
              Your name
              <input className={fieldClass} name="name" value={form.name} onChange={updateField} maxLength={120} autoComplete="name" required />
            </label>
            <label className="field-label">
              Email address
              <input className={fieldClass} type="email" name="email" value={form.email} onChange={updateField} maxLength={254} autoComplete="email" required />
            </label>
          </div>
          <label className="field-label">
            Phone number <span className="font-normal text-gray-400">(optional)</span>
            <input className={fieldClass} type="tel" name="phone" value={form.phone} onChange={updateField} maxLength={30} autoComplete="tel" />
          </label>
          <label className="field-label">
            Subject <span className="font-normal text-gray-400">(optional)</span>
            <input className={fieldClass} name="subject" value={form.subject} onChange={updateField} maxLength={160} />
          </label>
          <label className="field-label">
            Message
            <textarea className={`${fieldClass} min-h-36 resize-y`} name="message" value={form.message} onChange={updateField} maxLength={5000} required />
          </label>
          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#660032] px-5 py-3 font-semibold text-white transition hover:bg-[#500027] disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Sending...' : 'Send message'}
          </button>
        </form>
      </div>
    </main>
  );
}
