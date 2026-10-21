import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { loadRazorpay } from '../utils/loadRazorpay';
import { clearSelection, saveBookingEmail } from '../utils/selectionStorage';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isExpired = (expiresAt) => Boolean(expiresAt) && Date.now() >= new Date(expiresAt).getTime();
const EXPIRED = { kind: 'expired', message: 'Your booking hold has expired. Please start again.' };

// Retries only network errors and 5xx. Any definite answer (4xx) is returned immediately.
const verifyWithRetry = async (payload) => {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await api.post('/payments/verify', payload);
    } catch (err) {
      lastError = err;
      if (err.status && err.status < 500) throw err;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw lastError;
};

/**
 * stage: 'idle' | 'creating' | 'paying' | 'confirming'
 * paymentError.kind: 'retry' | 'expired' | 'slot_gone' | 'verify_failed'
 */
export const usePayment = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState('idle');
  const [paymentError, setPaymentError] = useState(null);
  const sessionRef = useRef(null); // { booking, contact, signature }
  const verifyRef = useRef(null); // { payload, contact }
  const busyRef = useRef(false);

  // Warn before closing the tab while a payment is in flight
  useEffect(() => {
    if (stage !== 'paying' && stage !== 'confirming') return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [stage]);

  const release = () => {
    busyRef.current = false;
    setStage('idle');
  };

  const runVerify = async () => {
    const { payload, contact } = verifyRef.current;
    busyRef.current = true;
    setStage('confirming');
    setPaymentError(null);
    try {
      await verifyWithRetry(payload);
      verifyRef.current = null;
      sessionRef.current = null;
      clearSelection();
      saveBookingEmail(contact.email);
      navigate(`/booking-success/${payload.bookingCode}`, { replace: true, state: { email: contact.email } });
    } catch (error) {
      release();
      const info = { bookingCode: payload.bookingCode, paymentId: payload.razorpay_payment_id };
      setPaymentError({ kind: error.status === 409 ? 'slot_gone' : 'verify_failed', message: error.message, ...info });
    }
  };

  const openCheckout = async () => {
    const { booking, contact } = sessionRef.current;
    const { bookingCode, orderId, amount, currency, keyId, expiresAt } = booking;

    if (isExpired(expiresAt)) {
      sessionRef.current = null;
      release();
      setPaymentError(EXPIRED);
      return;
    }

    setStage('paying');
    let Razorpay;
    try {
      Razorpay = await loadRazorpay();
    } catch (err) {
      release();
      setPaymentError({ kind: 'retry', message: err.message });
      return;
    }

    let paid = false;
    let failure = '';

    const rzp = new Razorpay({
      key: keyId, // comes from the API, never from frontend env
      amount,
      currency,
      order_id: orderId,
      name: 'Corbett National Park Safari',
      description: `Safari booking ${bookingCode}`,
      prefill: { name: contact.name, email: contact.email, contact: contact.mobile },
      theme: { color: '#15803d' },
      modal: {
        confirm_close: true,
        ondismiss: () => {
          if (paid) return;
          release();
          if (isExpired(expiresAt)) {
            sessionRef.current = null;
            setPaymentError(EXPIRED);
          } else {
            setPaymentError({
              kind: 'retry',
              message: failure ? `${failure} You can try again.` : 'Payment was not completed. You can try again.',
            });
          }
        },
      },
      handler: (response) => {
        paid = true;
        verifyRef.current = {
          contact,
          payload: {
            bookingCode,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          },
        };
        runVerify();
      },
    });

    // The popup stays open after a failure so the customer can try another method
    rzp.on('payment.failed', (res) => {
      failure = res?.error?.description || 'Payment failed.';
      toast.error(failure);
    });
    rzp.open();
  };

  const initiatePayment = async (bookingData, contact) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPaymentError(null);

    // Same details and the hold is still alive: reuse the order instead of holding more seats
    const signature = JSON.stringify(bookingData);
    const existing = sessionRef.current;
    if (existing && existing.signature === signature && !isExpired(existing.booking.expiresAt)) {
      await openCheckout();
      return;
    }

    setStage('creating');
    try {
      const booking = await api.post('/bookings', bookingData);
      sessionRef.current = { booking, contact, signature };
    } catch (error) {
      release();
      toast.error(error.message);
      return;
    }
    await openCheckout();
  };

  const retryPayment = async () => {
    if (busyRef.current || !sessionRef.current) return;
    busyRef.current = true;
    setPaymentError(null);
    await openCheckout();
  };

  const retryVerify = () => {
    if (busyRef.current || !verifyRef.current) return;
    runVerify();
  };

  return {
    initiatePayment,
    retryPayment,
    retryVerify,
    stage,
    loading: stage === 'creating' || stage === 'paying',
    confirmingPayment: stage === 'confirming',
    paymentError,
  };
};