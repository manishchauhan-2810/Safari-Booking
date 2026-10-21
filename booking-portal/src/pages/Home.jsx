import BookingWidget from '../components/booking/BookingWidget';
import PricingCard from '../components/home/PricingCard';
import BookingTerms from '../components/home/BookingTerms';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL;

const POINTS = ['Instant confirmation', 'Secure online payment', 'Invoice sent to your email'];

const Hero = () => (
  <header className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-emerald-700 text-white">
    <div
      aria-hidden="true"
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage:
          'radial-gradient(circle at 15% 20%, #fbbf24 0, transparent 35%), radial-gradient(circle at 85% 80%, #34d399 0, transparent 40%)',
      }}
    />
    <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-14 lg:pb-32">
      <p className="text-sm font-semibold uppercase tracking-widest text-amber-300">Jim Corbett National Park</p>
      <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">Book your jungle safari online</h1>
      <p className="mt-3 max-w-xl text-green-100 sm:text-lg">
        Jeep and canter safaris across every Corbett zone. Pick a date, pay securely, and get your permit details by email.
      </p>
      <ul className="mt-6 flex flex-wrap gap-2 text-sm">
        {POINTS.map((p) => (
          <li key={p} className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/25">
            <span className="mr-1 text-amber-300">&#10003;</span>{p}
          </li>
        ))}
      </ul>
    </div>
  </header>
);

const Home = () => (
  <div className="min-h-screen bg-earth-50">
    <Hero />

    <main className="mx-auto grid max-w-6xl items-start gap-8 px-4 pb-16 pt-8 lg:grid-cols-5 lg:pt-8">
      {/* On phones the booking form comes first */}
      <section aria-label="Book a safari" className="order-1 lg:order-2 lg:col-span-2 lg:-mt-28">
        <div className="rounded-2xl bg-white p-5 shadow-xl ring-1 ring-earth-200 sm:p-6">
          <BookingWidget />
        </div>
      </section>

      <section aria-label="Prices and information" className="order-2 space-y-6 lg:order-1 lg:col-span-3">
        <PricingCard />
        <BookingTerms />
      </section>
    </main>

    <footer className="border-t border-earth-200 bg-white py-6 text-center text-sm text-earth-600">
      <p>&copy; {new Date().getFullYear()} Jim Corbett Adventures. All rights reserved.</p>
      {SUPPORT_EMAIL && (
        <p className="mt-1">
          Need help? <a className="text-green-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      )}
    </footer>
  </div>
);

export default Home;