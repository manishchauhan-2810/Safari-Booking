import "dotenv/config";
import fs from "fs";
import { generateInvoicePdf } from "../services/invoiceService.js";
import { sampleBooking } from "./sampleBooking.js";

fs.mkdirSync("tmp", { recursive: true });
const pdf = await generateInvoicePdf(sampleBooking(), { timingText: "6:00 AM - 9:00 AM" });
fs.writeFileSync("tmp/sample-invoice.pdf", pdf);
console.log(`Wrote tmp/sample-invoice.pdf (${pdf.length} bytes)`);