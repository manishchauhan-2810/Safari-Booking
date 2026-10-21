import { Select } from '../ui/Select';

export const VehicleField = ({ value, onChange, disabled }) => (
  <Select
    label="Vehicle"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    options={[
      { value: 'jeep', label: 'Jeep' },
      { value: 'canter', label: 'Canter' },
    ]}
  />
);
