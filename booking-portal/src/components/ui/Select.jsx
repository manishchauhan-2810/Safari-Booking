import { useId } from 'react';

export const Select = ({ label, options = [], error, placeholder, className = '', id, ...props }) => {
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
        className={`w-full p-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${
          error ? 'border-red-500' : 'border-earth-300'
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={errorId} role="alert" className="text-xs text-red-500">
          {error}
        </span>
      )}
    </div>
  );
};