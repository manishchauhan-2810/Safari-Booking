import { useId } from 'react';

export const Input = ({ label, error, className = '', id, ...props }) => {
  const autoId = useId();
  const inputId = id || autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-earth-800">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
        className={`w-full p-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${
          error ? 'border-red-500' : 'border-earth-300'
        }`}
      />
      {error && (
        <span id={errorId} role="alert" className="text-xs text-red-500">
          {error}
        </span>
      )}
    </div>
  );
};
