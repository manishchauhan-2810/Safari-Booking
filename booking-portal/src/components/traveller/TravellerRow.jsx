import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { normalizeIdNumber } from '../../utils/travellerValidation';

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];
const NATIONALITIES = [
  { value: 'indian', label: 'Indian' },
  { value: 'foreigner', label: 'Foreigner' },
];
const ID_OPTIONS = {
  indian: [
    { value: 'aadhaar', label: 'Aadhaar card' },
    { value: 'driving_licence', label: 'Driving Licence' },
  ],
  foreigner: [
    { value: 'passport', label: 'Passport' },
    { value: 'oci', label: 'OCI' },
  ],
};

const TravellerRow = ({ traveller, number, touched, showAll, errors, onChange, onBlur }) => {
  const err = (field) => (showAll || touched[field] ? errors[field] : '');
  const set = (patch) => onChange({ ...traveller, ...patch });

  const handleNationality = (e) => {
    const nationality = e.target.value;
    // Reset to the first valid ID type for that nationality
    set({ nationality, idType: nationality ? ID_OPTIONS[nationality][0].value : '', idNumber: '' });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 p-4 border border-earth-200 rounded-md bg-white items-start">
      <div className="sm:col-span-2 lg:col-span-1 lg:pt-7">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-earth-700 text-white text-sm font-bold">
          {number}
        </span>
      </div>
      <Input
        className="lg:col-span-2"
        label="Name"
        placeholder="Full name"
        autoComplete="off"
        maxLength={80}
        value={traveller.name}
        onChange={(e) => set({ name: e.target.value })}
        onBlur={() => onBlur('name')}
        error={err('name')}
      />
      <Select
        className="lg:col-span-2"
        label="Gender"
        placeholder="Gender"
        options={GENDERS}
        value={traveller.gender}
        onChange={(e) => set({ gender: e.target.value })}
        onBlur={() => onBlur('gender')}
        error={err('gender')}
      />
      <Input
        className="lg:col-span-1"
        label="Age"
        placeholder="Age"
        type="text"
        inputMode="numeric"
        maxLength={3}
        value={traveller.age}
        onChange={(e) => set({ age: e.target.value.replace(/\D/g, '') })}
        onBlur={() => onBlur('age')}
        error={err('age')}
      />
      <Select
        className="lg:col-span-2"
        label="Nationality"
        placeholder="Nationality"
        options={NATIONALITIES}
        value={traveller.nationality}
        onChange={handleNationality}
        onBlur={() => onBlur('nationality')}
        error={err('nationality')}
      />
      <Select
        className="lg:col-span-2"
        label="ID type"
        placeholder="ID type"
        options={ID_OPTIONS[traveller.nationality] || []}
        value={traveller.idType}
        disabled={!traveller.nationality}
        onChange={(e) => set({ idType: e.target.value, idNumber: '' })}
        onBlur={() => onBlur('idType')}
        error={err('idType')}
      />
      <Input
        className="lg:col-span-2"
        label="ID number"
        placeholder="ID number"
        autoComplete="off"
        maxLength={24}
        value={traveller.idNumber}
        disabled={!traveller.idType}
        onChange={(e) => set({ idNumber: e.target.value })}
        onBlur={() => {
          set({ idNumber: normalizeIdNumber(traveller.idNumber) });
          onBlur('idNumber');
        }}
        error={err('idNumber')}
      />
    </div>
  );
};

export default TravellerRow;