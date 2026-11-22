import { usePricing } from '../../hooks/useAvailability';

const INCLUSIONS = [
  'Permission of CTR, vehicle, driver, permit, and all entries and taxes',
  'Guide fee is paid by the guest directly on the spot',
  'Pick and drop from hotels is not included',
];

const PricingCard = () => {
  const { data, isLoading, isError } = usePricing();

  const rows = data
    ? [
        { name: 'Jeep, main zones', unit: 'per jeep', indian: data.main.jeep.indian.display, foreigner: data.main.jeep.foreigner.display },
        { name: 'Jeep, buffer zones', unit: 'per jeep', indian: data.buffer.jeep.indian.display, foreigner: data.buffer.jeep.foreigner.display },
        { name: 'Canter, Dhikala', unit: 'per person', indian: data.main.canter.indian.display, foreigner: data.main.canter.foreigner.display },
      ]
    : [];

  const mainZones = (data?.zones || []).filter((z) => z.category !== 'buffer');
  const bufferZones = (data?.zones || []).filter((z) => z.category === 'buffer');

  return (
    <section className="rounded-lg border border-earth-200 bg-white p-5 sm:p-6">
      <h2 className="text-xl font-bold text-earth-900">Prices and zones</h2>

      {isLoading && <p className="mt-4 text-sm text-earth-600">Loading prices...</p>}
      {isError && <p className="mt-4 text-sm text-red-600">Could not load prices. Please refresh the page.</p>}

      {data && (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-earth-200 text-earth-600">
                  <th className="py-2 pr-4 font-medium">Safari</th>
                  <th className="py-2 pr-4 font-medium">Indian</th>
                  <th className="py-2 font-medium">Foreigner</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-b border-earth-100">
                    <td className="py-3 pr-4">
                      <span className="font-medium text-earth-900">{r.name}</span>
                      <span className="block text-xs text-earth-500">{r.unit}</span>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-earth-900">{r.indian}</td>
                    <td className="py-3 font-semibold text-earth-900">{r.foreigner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-earth-600">
            A {data.feePercent}% handling fee and {data.gstPercent}% GST are added at checkout. If any traveller in a jeep is a
            foreigner, the foreigner rate applies to the whole jeep.
          </p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold text-earth-900">Main zones</h3>
              <p className="mt-1 text-sm text-earth-700">{mainZones.map((z) => z.name).join(', ')}</p>
              <p className="mt-1 text-xs text-earth-500">Canter safaris run in Dhikala only.</p>
            </div>
            <div>
              <h3 className="font-semibold text-earth-900">Buffer zones</h3>
              <p className="mt-1 text-sm text-earth-700">{bufferZones.map((z) => z.name).join(', ')}</p>
              <p className="mt-1 text-xs text-earth-500">Jeep safaris only.</p>
            </div>
          </div>
        </>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold text-earth-900">Timings</h3>
          <p className="mt-1 text-sm text-earth-700">
            Morning and evening safaris. The exact timing is shown when you pick a date and zone, and changes with the season.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-earth-900">Inclusions</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-earth-700">
            {INCLUSIONS.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default PricingCard;