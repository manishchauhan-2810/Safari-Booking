import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import TravellerDetails from './pages/TravellerDetails';
import BookingSuccess from './pages/BookingSuccess';
import NotFound from './pages/NotFound';
import './index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/traveller-details" element={<TravellerDetails />} />
            <Route path="/booking-success/:bookingCode" element={<BookingSuccess />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

export default App;