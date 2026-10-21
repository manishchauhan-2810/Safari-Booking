import { Select } from '../ui/Select';
import { getChildOptions } from '../../utils/rules';

export const ChildrenField = ({ vehicle, adults, value, onChange }) => {
  const options = getChildOptions(vehicle, adults);
  return (
    <Select
      label="Children (5-12)"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      options={options}
    />
  );
};
