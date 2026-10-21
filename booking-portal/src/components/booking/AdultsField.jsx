import { Select } from '../ui/Select';
import { getAdultOptions } from '../../utils/rules';

export const AdultsField = ({ vehicle, value, onChange }) => {
  const options = getAdultOptions(vehicle);
  return (
    <Select
      label="Adults"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      options={options}
    />
  );
};
