import { describe, it, expect, vi } from 'vitest';
import { validateComposition } from '../services/rulesService.js';
import Zone from '../models/Zone.js';
import mongoose from 'mongoose';
import Availability from '../models/Availability.js';

describe('Rules Service', () => {
    const dhikalaId = new mongoose.Types.ObjectId();
    const bijraniId = new mongoose.Types.ObjectId();
    const inactiveId = new mongoose.Types.ObjectId();

    it('canter outside Dhikala rejected', async () => {
        vi.spyOn(Zone, 'findById').mockResolvedValue({ _id: bijraniId, isActive: true, allowsCanter: false });
        await expect(validateComposition({ vehicleType: 'canter', zone: bijraniId, adultsCount: 2, childrenCount: 0 }))
            .rejects.toThrow("Canter ONLY allowed in Dhikala");
    });

    it('7 adults in jeep rejected', async () => {
        vi.spyOn(Zone, 'findById').mockResolvedValue({ _id: bijraniId, isActive: true });
        await expect(validateComposition({ vehicleType: 'jeep', zone: bijraniId, adultsCount: 7, childrenCount: 0 }))
            .rejects.toThrow("Jeep requires 1-6 adults");
    });

    it('6 adults + 2 children in jeep accepted', async () => {
        vi.spyOn(Zone, 'findById').mockResolvedValue({ _id: bijraniId, isActive: true });
        await expect(validateComposition({ vehicleType: 'jeep', zone: bijraniId, adultsCount: 6, childrenCount: 2 }))
            .resolves.toBeUndefined();
    });

    it('6 adults + 3 children in jeep rejected', async () => {
        vi.spyOn(Zone, 'findById').mockResolvedValue({ _id: bijraniId, isActive: true });
        await expect(validateComposition({ vehicleType: 'jeep', zone: bijraniId, adultsCount: 6, childrenCount: 3 }))
            .rejects.toThrow("Jeep total max 8");
    });

    it('3 adults + 5 children in jeep accepted', async () => {
        vi.spyOn(Zone, 'findById').mockResolvedValue({ _id: bijraniId, isActive: true });
        await expect(validateComposition({ vehicleType: 'jeep', zone: bijraniId, adultsCount: 3, childrenCount: 5 }))
            .resolves.toBeUndefined();
    });

    it('3 adults + 6 children in jeep rejected', async () => {
        vi.spyOn(Zone, 'findById').mockResolvedValue({ _id: bijraniId, isActive: true });
        await expect(validateComposition({ vehicleType: 'jeep', zone: bijraniId, adultsCount: 3, childrenCount: 6 }))
            .rejects.toThrow("Jeep total max 8");
    });

    it('1 adult + 7 children in jeep accepted', async () => {
        vi.spyOn(Zone, 'findById').mockResolvedValue({ _id: bijraniId, isActive: true });
        await expect(validateComposition({ vehicleType: 'jeep', zone: bijraniId, adultsCount: 1, childrenCount: 7 }))
            .resolves.toBeUndefined();
    });

    it('17 people in canter rejected', async () => {
        vi.spyOn(Zone, 'findById').mockResolvedValue({ _id: dhikalaId, isActive: true, allowsCanter: true });
        await expect(validateComposition({ vehicleType: 'canter', zone: dhikalaId, adultsCount: 17, childrenCount: 0 }))
            .rejects.toThrow("Canter requires 1-16 total people");
    });

    it('inactive zone rejected', async () => {
        vi.spyOn(Zone, 'findById').mockResolvedValue({ _id: inactiveId, isActive: false });
        await expect(validateComposition({ vehicleType: 'jeep', zone: inactiveId, adultsCount: 2, childrenCount: 0 }))
            .rejects.toThrow("Zone is inactive");
    });
});

describe('Availability Model', () => {
    const dhikalaId = new mongoose.Types.ObjectId();

    it('canter totalUnits 20 rejected', async () => {
        const a = new Availability({
            date: '2026-10-17',
            zone: dhikalaId,
            shift: 'morning',
            vehicleType: 'canter',
            totalUnits: 20
        });
        await expect(a.validate()).rejects.toThrow();
    });

    it('canter totalUnits 32 accepted', async () => {
        const a = new Availability({
            date: '2026-10-17',
            zone: dhikalaId,
            shift: 'morning',
            vehicleType: 'canter',
            totalUnits: 32
        });
        await expect(a.validate()).resolves.toBeUndefined();
    });

    it('canter totalUnits 0 accepted', async () => {
        const a = new Availability({
            date: '2026-10-17',
            zone: dhikalaId,
            shift: 'morning',
            vehicleType: 'canter',
            totalUnits: 0
        });
        await expect(a.validate()).resolves.toBeUndefined();
    });

    it('canter totalUnits 48 accepted', async () => {
        const a = new Availability({
            date: '2026-10-17',
            zone: dhikalaId,
            shift: 'morning',
            vehicleType: 'canter',
            totalUnits: 48
        });
        await expect(a.validate()).resolves.toBeUndefined();
    });
});
