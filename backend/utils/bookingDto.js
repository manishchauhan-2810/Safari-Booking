import { formatRupees } from "./money.js";

const maskId = (id = "") => `${"*".repeat(Math.max(id.length - 4, 4))}${id.slice(-4)}`;

// Safe shape returned to customers. Never includes signatures or internal fields.
export const toBookingSummary = (b) => ({
  bookingCode: b.bookingCode,
  status: b.status,
  date: b.date,
  shift: b.shift,
  vehicleType: b.vehicleType,
  zone: b.zone?.name ? { name: b.zone.name, slug: b.zone.slug } : null,
  adultsCount: b.adultsCount,
  childrenCount: b.childrenCount,
  contact: { name: b.contact.name, email: b.contact.email, mobile: b.contact.mobile },
  travellers: b.travellers.map((t) => ({
    type: t.type,
    name: t.name,
    gender: t.gender,
    age: t.age,
    nationality: t.nationality,
    idType: t.idType,
    idNumber: maskId(t.idNumber),
  })),
  pricing: {
    subtotalPaise: b.pricing.subtotalPaise,
    feePaise: b.pricing.feePaise,
    totalPaise: b.pricing.totalPaise,
    display: {
      subtotal: formatRupees(b.pricing.subtotalPaise),
      fee: formatRupees(b.pricing.feePaise),
      total: formatRupees(b.pricing.totalPaise),
    },
  },
  payment: { status: b.payment?.status, paymentId: b.payment?.razorpayPaymentId },
  confirmedAt: b.confirmedAt,
});