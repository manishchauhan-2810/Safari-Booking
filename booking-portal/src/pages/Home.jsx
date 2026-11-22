import { Link } from 'react-router-dom';
import BookingWidget from '../components/booking/BookingWidget';
import PricingCard from '../components/home/PricingCard';
import BookingTerms from '../components/home/BookingTerms';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL;

const Home = () => (
  <div className="min-h-screen bg-earth-50">
    <header className="border-b border-earth-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm font-medium text-green-800">Jim Corbett National Park</p>
        <h1 className="mt-1 text-3xl font-bold text-earth-900 sm:text-4xl">Book a jungle safari</h1>
        <p className="mt-2 max-w-xl text-earth-700">
          Jeep and canter safaris in every Corbett zone. Choose a date, pay online, and receive your invoice by email.
        </p>
      </div>
    </header>

    <main className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-8 lg:grid-cols-5">
      {/* On phones the booking form comes first */}
      <section aria-label="Book a safari" className="order-1 lg:order-2 lg:col-span-2">
        <div className="rounded-lg border border-earth-200 bg-white p-5 sm:p-6">
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
      <p className="mt-1">
        <Link to="/terms" className="text-green-700 underline">Terms and conditions</Link>
        {SUPPORT_EMAIL && (
          <>
            {' | '}
            <a className="text-green-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </>
        )}
      </p>
    </footer>
  </div>
);

export default Home;