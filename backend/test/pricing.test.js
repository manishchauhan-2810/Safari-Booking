import { describe, it, expect } from 'vitest';
import { calculatePrice } from '../services/pricingService.js';

const mockSettings = {
    feePercent: 3,
    jeepIndianPaise: 750000,
    jeepForeignPaise: 1600000,
    canterIndianPaise: 260000,
    canterForeignPaise: 500000
};

describe('Pricing Service', () => {
    it('jeep all-Indian', async () => {
        const travellers = [{ nationality: 'indian' }, { nationality: 'indian' }];
        const result = await calculatePrice({ vehicleType: 'jeep', travellers, settingsOverride: mockSettings });
        expect(result).toEqual({ subtotalPaise: 750000, feePaise: 22500, totalPaise: 772500 });
    });

    it('jeep with one foreigner', async () => {
        const travellers = [{ nationality: 'indian' }, { nationality: 'foreigner' }];
        const result = await calculatePrice({ vehicleType: 'jeep', travellers, settingsOverride: mockSettings });
        expect(result).toEqual({ subtotalPaise: 1600000, feePaise: 48000, totalPaise: 1648000 });
    });

    it('canter 3 Indian + 2 foreign', async () => {
        const travellers = [
            { nationality: 'indian' }, { nationality: 'indian' }, { nationality: 'indian' },
            { nationality: 'foreigner' }, { nationality: 'foreigner' }
        ];
        const result = await calculatePrice({ vehicleType: 'canter', travellers, settingsOverride: mockSettings });
        expect(result).toEqual({ subtotalPaise: 1780000, feePaise: 53400, totalPaise: 1833400 });
    });

    it('canter 16 Indian', async () => {
        const travellers = Array(16).fill({ nationality: 'indian' });
        const result = await calculatePrice({ vehicleType: 'canter', travellers, settingsOverride: mockSettings });
        expect(result).toEqual({ subtotalPaise: 4160000, feePaise: 124800, totalPaise: 4284800 });
    });
});
