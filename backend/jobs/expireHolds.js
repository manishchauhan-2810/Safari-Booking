import Booking from "../models/Booking.js";
import { releaseCapacity, findSlotIdForBooking, unitsForBooking } from "../services/inventoryService.js";

// Exported separately so it can be tested
export const expireHoldsOnce = async (now = new Date()) => {
  const stale = await Booking.find({ status: "pending", expiresAt: { $lt: now } }).limit(200).lean();
  let expired = 0;

  for (const b of stale) {
    // Conditional flip: if a payment confirmed it a moment ago, this matches nothing
    const flipped = await Booking.findOneAndUpdate(
      { _id: b._id, status: "pending" },
      { $set: { status: "expired" } },
      { returnDocument: "after" }
    );
    if (!flipped) continue;

    const slotId = await findSlotIdForBooking(b);
    if (slotId) await releaseCapacity(slotId, unitsForBooking(b));
    expired++;
    console.log(`[expire] ${b.bookingCode} expired, capacity released`);
  }
  return expired;
};

export const startExpireHoldsJob = (intervalMs = 60_000) => {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return; // never overlap runs
    running = true;
    try {
      await expireHoldsOnce();
    } catch (err) {
      console.error("[expire] job error:", err.message);
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
};