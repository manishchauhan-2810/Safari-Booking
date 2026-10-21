import { Select } from '../ui/Select';

export const ZoneField = ({ value, onChange, options, disabled, hint }) => {
  return (
    <div className="flex flex-col gap-1">
      <Select
        label="Zone"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        options={options}
        placeholder="Select Zone"
      />
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  );
};
