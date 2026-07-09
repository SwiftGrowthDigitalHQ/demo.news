import { useState, type FormEvent } from 'react';
import { MapPin, Phone, Mail, Send } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useEffect } from 'react';

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Contact Us | Buxar News';
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 border-l-4 border-red-600 pl-4">Contact Us</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8">
          {/* Contact Info Cards */}
          <div className="space-y-4">
            {/* Address */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Editorial Office</h3>
                  <p className="text-sm text-gray-600">Patna, Bihar, India</p>
                  <a
                    href="https://maps.google.com/?q=Patna+Bihar+India"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline mt-2 font-medium"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </div>
            </div>

            {/* Phone */}
            <a href="tel:+919229721835" className="block bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-red-200 transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                  <Phone className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Phone</h3>
                  <p className="text-sm text-gray-600 group-hover:text-red-600 transition-colors">+91 9229721835</p>
                  <p className="text-xs text-gray-400 mt-1">Click to call</p>
                </div>
              </div>
            </a>

            {/* Email */}
            <a href="mailto:hello@swiftgrowthdigital.com" className="block bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-red-200 transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                  <Mail className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Email</h3>
                  <p className="text-sm text-gray-600 group-hover:text-red-600 transition-colors">hello@swiftgrowthdigital.com</p>
                  <p className="text-xs text-gray-400 mt-1">Click to send email</p>
                </div>
              </div>
            </a>

            {/* Google Map */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <iframe
                title="Office Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d230771.06!2d85.0!3d25.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39ed58dce6732867%3A0x4059f39a1ac82f06!2sPatna%2C%20Bihar!5e0!3m2!1sen!2sin!4v1"
                className="w-full h-[200px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Send us a Message</h2>
            <p className="text-sm text-gray-500 mb-6">We'll get back to you within 24 hours.</p>

            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-sm text-gray-500">Thank you for contacting us. We will respond shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none"
                    placeholder="Write your message here..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-11 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" /> Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
