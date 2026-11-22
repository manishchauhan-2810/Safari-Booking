import { Select } from '../ui/Select';

// options: [{ value, label, category: 'main' | 'buffer' }]
export const ZoneField = ({ value, onChange, options, disabled, hint }) => {
  const groups = [
    { label: 'Main zones', options: options.filter((o) => o.category !== 'buffer') },
    { label: 'Buffer zones', options: options.filter((o) => o.category === 'buffer') },
  ].filter((g) => g.options.length > 0);

  return (
    <div className="flex flex-col gap-1">
      <Select
        label="Zone"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        groups={groups}
        placeholder="Select Zone"
      />
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </div>
  );
};