const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const getTodayIST = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export const monthKey = (y, m) => `${y}-${String(m).padStart(2, "0")}`;

export const addMonths = (y, m, delta) => {
  const i = y * 12 + (m - 1) + delta;
  return [Math.floor(i / 12), (i % 12) + 1];
};

export const addDays = (ymd, n) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
};

export const buildMonthGrid = (year, month) => {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = [];
  let week = Array(7).fill(null);
  for (let d = 1; d <= last; d++) {
    const idx = (first + d - 1) % 7;
    week[idx] = `${monthKey(year, month)}-${String(d).padStart(2, "0")}`;
    if (idx === 6 || d === last) {
      weeks.push(week);
      week = Array(7).fill(null);
    }
  }
  return weeks;
};

export const formatShort = (ymd) => {
  const [, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

export const formatLong = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${d} ${MONTHS[m - 1]} ${y}`;
};