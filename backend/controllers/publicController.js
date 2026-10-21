import Zone from "../models/Zone.js";
import Availability from "../models/Availability.js";
import Settings from "../models/Settings.js";
import asyncHandler from "../utils/asyncHandler.js";
import { calculatePrice } from "../services/pricingService.js";
import { validateComposition } from "../services/rulesService.js";
import { getTodayIST, getDatesOfMonth } from "../utils/date.js";
import ApiError from "../utils/ApiError.js";
import { resolveZone, activeZoneIds } from "../utils/zoneHelper.js";
import { formatRupees } from "../utils/money.js";

export const getZones = asyncHandler(async (req, res) => {
    const { vehicleType } = req.validated;
    const query = { isActive: true };
    if (vehicleType === 'canter') query.allowsCanter = true;
    const zones = await Zone.find(query);
    res.json({ success: true, data: zones });
});

export const getCalendar = asyncHandler(async (req, res) => {
    const { month, vehicleType, zone: zoneParam } = req.validated;
    const dates = getDatesOfMonth(month);
    const today = getTodayIST();

    const zone = await resolveZone(zoneParam);
    if (zoneParam && (!zone || !zone.isActive)) throw new ApiError(404, "Zone not found");

    const query = {
        date: { $gte: dates[0], $lte: dates[dates.length - 1] },
        vehicleType,
        zone: zone ? zone._id : { $in: await activeZoneIds(vehicleType) },
    };

    const availabilities = await Availability.find(query);

    const availByDate = {};
    availabilities.forEach(a => {
        if (!availByDate[a.date]) availByDate[a.date] = [];
        availByDate[a.date].push(a);
    });

    const data = dates.map(date => {
        let status = 'no_slots';
        if (date < today) status = 'past';
        else {
            const slots = availByDate[date] || [];
            if (slots.length > 0) {
                const openSlots = slots.filter(s => s.isOpen);
                if (openSlots.length === 0) status = 'closed';
                else if (openSlots.some(s => s.available > 0)) status = 'available';
                else status = 'sold_out';
            }
        }
        return { date, status };
    });

    res.json({ success: true, data });
});

export const getSlots = asyncHandler(async (req, res) => {
    const { date, vehicleType, zone: zoneParam } = req.validated;
    if (date < getTodayIST()) return res.json({ success: true, data: [] });

    const zone = await resolveZone(zoneParam);
    if (zoneParam && (!zone || !zone.isActive)) throw new ApiError(404, "Zone not found");

    const query = {
        date,
        vehicleType,
        zone: zone ? zone._id : { $in: await activeZoneIds(vehicleType) },
    };

    const slots = await Availability.find(query).populate("zone");
    const settings = await Settings.findOne();
    const shiftTimings = settings?.shiftTimings || { morning: "6:00 AM - 9:00 AM", evening: "2:30 PM - 6:00 PM" };

    // Only what customers need. Booked/held/total counts are private sales data.
    const data = slots
        .filter((s) => s.zone)
        .map((s) => ({
            zone: { id: s.zone._id, name: s.zone.name, slug: s.zone.slug },
            shift: s.shift,
            timingText: shiftTimings[s.shift] || (s.shift === "morning" ? "6:00 AM - 9:00 AM" : "2:30 PM - 6:00 PM"),
            isOpen: s.isOpen,
            remaining: Math.max(0, s.available),
            canterSeatsLeft: vehicleType === "canter" ? Math.max(0, s.available) : null,
        }));
    res.json({ success: true, data });
});

export const getQuote = asyncHandler(async (req, res) => {
    const { vehicleType, zone: zoneParam, date, shift, travellers } = req.validated;

    if (date < getTodayIST()) throw new ApiError(400, "Date cannot be in the past");

    const zone = await resolveZone(zoneParam);
    if (!zone) throw new ApiError(404, "Zone not found");

    const slot = await Availability.findOne({ date, shift, zone: zone._id, vehicleType });
    if (!slot) throw new ApiError(404, "Slot not found");
    if (!slot.isOpen) throw new ApiError(400, "Slot is closed");

    const requiredCapacity = vehicleType === 'jeep' ? 1 : travellers.length;
    if (slot.available < requiredCapacity) throw new ApiError(400, "Insufficient capacity");

    const adultsCount = travellers.filter(t => t.type === 'adult').length;
    const childrenCount = travellers.filter(t => t.type === 'child').length;

    await validateComposition({ vehicleType, zone: zone._id, adultsCount, childrenCount });

    const pricing = await calculatePrice({ vehicleType, travellers });

    res.json({
        success: true,
        data: {
            subtotalPaise: pricing.subtotalPaise,
            feePaise: pricing.feePaise,
            totalPaise: pricing.totalPaise,
            display: {
                subtotal: formatRupees(pricing.subtotalPaise),
                fee: formatRupees(pricing.feePaise),
                total: formatRupees(pricing.totalPaise)
            }
        }
    });
});
