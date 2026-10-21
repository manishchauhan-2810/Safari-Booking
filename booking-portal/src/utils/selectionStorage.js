const SELECTION_KEY = 'bookingSelection';
const EMAIL_KEY = 'bookingEmail';

export const saveSelection = (selection) => {
  try {
    sessionStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
  } catch {
    /* storage unavailable: the booking can still continue in memory */
  }
};

export const loadSelection = () => {
  try {
    const item = sessionStorage.getItem(SELECTION_KEY);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

export const clearSelection = () => {
  try {
    sessionStorage.removeItem(SELECTION_KEY);
  } catch {
    /* ignore */
  }
};

export const saveBookingEmail = (email) => {
  try {
    sessionStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* ignore */
  }
};

export const loadBookingEmail = () => {
  try {
    return sessionStorage.getItem(EMAIL_KEY) || '';
  } catch {
    return '';
  }
};