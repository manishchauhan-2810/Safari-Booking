import mongoose from "mongoose";
import { encryptField, decryptField, idHash } from "../utils/crypto.js";

const travellerSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["adult", "child"], required: true },
    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    age: { type: Number, required: true },
    nationality: { type: String, enum: ["indian", "foreigner"], required: true },
    idType: { type: String, enum: ["aadhaar", "passport", "driving_licence", "oci"], required: true },
    // Encrypted at rest. Reading through a document returns plain text; .lean() returns ciphertext.
    idNumber: { type: String, required: true, set: encryptField, get: decryptField },
    idHash: { type: String, select: false }, // searchable fingerprint of the ID number
  },
  { _id: false, toJSON: { getters: true }, toObject: { getters: true } }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, unique: true, required: true },
    date: { type: String, required: true },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", required: true },
    shift: { type: String, enum: ["morning", "evening"], required: true },
    vehicleType: { type: String, enum: ["jeep", "canter"], required: true },
    adultsCount: { type: Number, required: true },
    childrenCount: { type: Number, default: 0 },
    travellers: [travellerSchema],
    contact: {
      name: { type: String, required: true, trim: true },
      mobile: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
    },
    pricing: {
      subtotalPaise: { type: Number, required: true },
      feePaise: { type: Number, required: true },
      gstPaise: { type: Number, default: 0 },
      totalPaise: { type: Number, required: true },
      advancePercent: Number,
      payNowPaise: Number, // what Razorpay charged online
      balancePaise: { type: Number, default: 0 }, // to pay on the safari day
    },
    paymentOption: { type: String, enum: ["full", "advance"], default: "full" },
    payment: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: { type: String, select: false },
      status: { type: String, enum: ["pending", "partial", "paid", "failed", "refunded"], default: "pending" },
      refundId: String,
      refundedAt: Date,
      paidPaise: Number,
      balanceStatus: { type: String, enum: ["none", "due", "collected"], default: "none" },
      balanceCollectedAt: Date,
      balanceCollectedBy: String,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "expired", "failed", "cancelled", "refunded", "paid_needs_refund"],
      default: "pending",
    },
    expiresAt: Date,
    confirmedAt: Date,
    emailStatus: { type: String, enum: ["pending", "sending", "sent", "failed"], default: "pending" },
    emailAttempts: { type: Number, default: 0 },
    emailClaimedAt: Date,
    emailSentAt: Date,
    emailLastError: String,
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

bookingSchema.pre("validate", function () {
  for (const t of this.travellers) t.idHash = idHash(t.idNumber);
});

bookingSchema.index({ status: 1, expiresAt: 1 });
bookingSchema.index({ date: 1, zone: 1, shift: 1, vehicleType: 1 });
bookingSchema.index({ "contact.email": 1 });
bookingSchema.index({ "contact.mobile": 1 });
bookingSchema.index({ "travellers.idHash": 1 });
bookingSchema.index({ "payment.razorpayOrderId": 1 }, { sparse: true });
bookingSchema.index({ "payment.balanceStatus": 1, date: 1 });
bookingSchema.index({ createdAt: -1 });

export default mongoose.model("Booking", bookingSchema);