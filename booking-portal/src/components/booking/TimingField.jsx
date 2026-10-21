import { Select } from '../ui/Select';

export const TimingField = ({ value, onChange, options, disabled, hint, capacityText }) => {
  return (
    <div className="flex flex-col gap-1">
      <Select
        label="Timing"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        options={options}
        placeholder={options.length === 0 && !disabled ? 'No timing available' : 'Select Timing'}
      />
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
      {capacityText && (
        <span className="text-xs font-semibold text-emerald-700">{capacityText}</span>
      )}
    </div>
  );
};
