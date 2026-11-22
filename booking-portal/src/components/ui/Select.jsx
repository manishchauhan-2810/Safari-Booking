import { useId } from 'react';

const renderOptions = (options) =>
  options.map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ));

// Pass `options` for a flat list, or `groups` ([{ label, options }]) for grouped choices
export const Select = ({ label, options = [], groups, error, placeholder, className = '', id, ...props }) => {
  const autoId = useId();
  const selectId = id || autoId;
  const errorId = `${selectId}-error`;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-earth-800">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
        className={`w-full p-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-600/40 focus:border-green-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${
          error ? 'border-red-500' : 'border-earth-300'
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {groups
          ? groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {renderOptions(g.options)}
              </optgroup>
            ))
          : renderOptions(options)}
      </select>
      {error && (
        <span id={errorId} role="alert" className="text-xs text-red-500">
          {error}
        </span>
      )}
    </div>
  );
};