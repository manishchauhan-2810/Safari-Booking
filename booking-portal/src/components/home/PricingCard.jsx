const ZONES = ['Bijrani', 'Jhirna', 'Dhela', 'Garjiya', 'Durgadevi', 'Phato', 'Sitabani', 'Bhandarpani', 'Dhikala'];
const INCLUSIONS = [
  'Permission of CTR, vehicle, driver, permit, and all entries and taxes',
  'Guide fee is paid by the guest directly on the spot',
  'Pick and drop from hotels is not included',
];

const Price = ({ label, amount, unit }) => (
  <div className="rounded-lg bg-white/70 p-3 text-center ring-1 ring-earth-200">
    <p className="text-xs font-medium text-earth-600">{label}</p>
    <p className="text-2xl font-extrabold text-green-900">{amount}</p>
    <p className="text-xs text-earth-500">{unit}</p>
  </div>
);

const VehicleCard = ({ title, tag, children, note }) => (
  <div className="rounded-xl border border-earth-200 bg-gradient-to-b from-amber-50 to-white p-5 shadow-sm">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-lg font-bold text-green-900">{title}</h3>
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">{tag}</span>
    </div>
    <div className="grid grid-cols-2 gap-3">{children}</div>
    <p className="mt-3 text-sm text-earth-700">{note}</p>
  </div>
);

const PricingCard = () => (
  <div className="space-y-6 rounded-2xl bg-white p-5 shadow-md ring-1 ring-earth-200 sm:p-6">
    <h2 className="text-2xl font-bold text-green-900">Prices and zones</h2>

    <div className="grid gap-4 sm:grid-cols-2">
      <VehicleCard
        title="Jeep safari"
        tag="Per jeep"
        note="Up to 6 adults, and 8 people in total including children (age 5-12). Any zone."
      >
        <Price label="Indian" amount="₹7,500" unit="per jeep" />
        <Price label="Foreigner" amount="₹16,000" unit="per jeep" />
      </VehicleCard>
      <VehicleCard
        title="Canter safari"
        tag="Per person"
        note="Dhikala zone only. 16 seats per canter. Children count as full persons."
      >
        <Price label="Indian" amount="₹2,600" unit="per person" />
        <Price label="Foreigner" amount="₹5,000" unit="per person" />
      </VehicleCard>
    </div>

    <div>
      <h3 className="mb-2 font-bold text-green-900">Safari zones</h3>
      <ul className="flex flex-wrap gap-2">
        {ZONES.map((z) => (
          <li
            key={z}
            className={`rounded-full px-3 py-1 text-sm ${
              z === 'Dhikala' ? 'bg-amber-100 font-semibold text-amber-900 ring-1 ring-amber-300' : 'bg-earth-100 text-earth-800'
            }`}
          >
            {z}
            {z === 'Dhikala' && ' (jeep and canter)'}
          </li>
        ))}
      </ul>
    </div>

    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <h3 className="mb-1 font-bold text-green-900">Timings</h3>
        <p className="text-sm text-earth-700">
          Morning and evening safaris. The exact timing is shown when you pick a date and zone, and changes with the season.
        </p>
      </div>
      <div>
        <h3 className="mb-1 font-bold text-green-900">Inclusions</h3>
        <ul className="space-y-1 text-sm text-earth-700">
          {INCLUSIONS.map((i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-green-700">&#10003;</span>
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">A 3% handling fee is added to the total at checkout.</p>
  </div>
);

export default PricingCard;