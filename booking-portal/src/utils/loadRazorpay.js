const SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let sdkPromise = null;

export const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => {
      script.remove();
      sdkPromise = null; // allow a retry later
      reject(new Error('Could not load the payment window. Check your internet connection and try again.'));
    };
    script.src = SRC;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : fail());
    script.onerror = fail;
    document.body.appendChild(script);
  });

  return sdkPromise;
};