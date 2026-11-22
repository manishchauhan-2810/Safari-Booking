import { Link } from 'react-router-dom';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL;
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE;

const Support = () =>
  SUPPORT_EMAIL || SUPPORT_PHONE ? (
    <p className="mt-2 text-sm">
      Support: {SUPPORT_EMAIL && <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>}
      {SUPPORT_EMAIL && SUPPORT_PHONE && ' / '}
      {SUPPORT_PHONE && <a className="underline" href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>}
    </p>
  ) : null;

const PaymentError = ({ error, onRetryPayment, onRetryVerify }) => (
  <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
    <p className="font-semibold">{error.message}</p>

    {error.kind === 'retry' && (
      <button type="button" onClick={onRetryPayment} className="mt-3 rounded-md bg-green-700 px-4 py-2 text-white hover:bg-green-800">
        Try payment again
      </button>
    )}

    {error.kind === 'expired' && (
      <Link to="/" className="mt-3 inline-block rounded-md bg-earth-800 px-4 py-2 text-white hover:bg-earth-900">
        Start again
      </Link>
    )}

    {error.kind === 'slot_gone' && (
      <>
        <p className="mt-2 text-sm">Booking code: <strong>{error.bookingCode}</strong> | Payment ID: <strong>{error.paymentId}</strong></p>
        <p className="mt-1 text-sm">Do not pay again. Please contact support with these details for a refund.</p>
        <Support />
      </>
    )}

    {error.kind === 'verify_failed' && (
      <>
        <p className="mt-2 text-sm">
          If money was deducted, do not pay again. Booking code: <strong>{error.bookingCode}</strong> | Payment ID:{' '}
          <strong>{error.paymentId}</strong>
        </p>
        <button type="button" onClick={onRetryVerify} className="mt-3 rounded-md bg-green-700 px-4 py-2 text-white hover:bg-green-800">
          Retry confirmation
        </button>
        <Support />
      </>
    )}
  </div>
);

const Line = ({ label, value, bold }) => (
  <div className={`flex justify-between gap-4 ${bold ? 'border-t border-earth-200 pt-2 font-bold text-earth-900' : ''}`}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

const PaymentPanel = ({
  vehicle,
  quote, // only passed when the form is valid and the price is fresh
  calculating,
  quoteError,
  isFormValid,
  canPay,
  stage,
  termsAccepted,
  setTermsAccepted,
  hasForeigner,
  onPay,
  paymentError,
  onRetryPayment,
  onRetryVerify,
}) => {
  const busy = stage !== 'idle';
  const label =
    stage === 'creating' ? 'Creating booking...'
    : stage === 'paying' ? 'Payment in progress...'
    : quote ? `Pay ${quote.display.total}`
    : 'Payable amount: ₹ —';

  let hint = null;
  if (quoteError) hint = <p className="mt-2 text-sm text-red-500">{quoteError.message}</p>;
  else if (!isFormValid) hint = <p className="mt-2 text-sm text-earth-500">Fill in all traveller details to see the amount</p>;
  else if (calculating) hint = <p className="mt-2 text-sm text-earth-600">Calculating price...</p>;
  else if (quote && !termsAccepted) hint = <p className="mt-2 text-sm text-earth-500">Accept the terms to continue</p>;

  return (
    <div className="mt-6 rounded-lg border border-earth-200 bg-white p-6">
      {stage === 'confirming' && (
        <div role="status" aria-live="assertive" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 text-center text-white">
          <p className="text-xl">Confirming your payment, please do not close this page</p>
        </div>
      )}

      <h2 className="mb-4 text-xl font-semibold text-earth-900">Payment summary</h2>

      {paymentError && <PaymentError error={paymentError} onRetryPayment={onRetryPayment} onRetryVerify={onRetryVerify} />}

      <dl className={`max-w-sm space-y-2 text-sm ${quote ? 'text-earth-800' : 'text-earth-400'}`}>
        <Line label="Subtotal" value={quote ? quote.display.subtotal : '—'} />
        <Line label={`Handling fee${quote ? ` (${quote.feePercent}%)` : ''}`} value={quote ? quote.display.fee : '—'} />
        <Line label={`GST${quote ? ` (${quote.gstPercent}%)` : ''}`} value={quote ? quote.display.gst : '—'} />
        <Line label="Total" value={quote ? quote.display.total : '—'} bold />
      </dl>

      {quote && hasForeigner && vehicle === 'jeep' && (
        <p className="mt-3 text-sm text-red-600">Foreigner rate applies to the whole jeep</p>
      )}

      <label className="mt-6 flex items-start gap-2 text-sm text-earth-800">
        <input type="checkbox" className="mt-0.5" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
        <span>
          I have read and accept the{' '}
          <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-green-700 underline">
            terms and conditions
          </Link>
          . Safari amounts are non-refundable.
        </span>
      </label>

      {/* Soft-disabled: a click while incomplete reveals what is missing */}
      <button
        type="button"
        onClick={onPay}
        aria-disabled={!canPay || busy}
        className={`mt-4 rounded-md px-5 py-3 font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600/50 ${
          canPay && !busy ? 'cursor-pointer bg-green-700 hover:bg-green-800' : 'cursor-not-allowed bg-green-700/50'
        }`}
      >
        {label}
      </button>
      {hint}
    </div>
  );
};

export default PaymentPanel;