const VARIANTS = {
  primary: 'bg-green-700 text-white hover:bg-green-800',
  secondary: 'bg-earth-100 text-earth-800 hover:bg-earth-200 border border-earth-300',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export const Button = ({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) => (
  <button
    type={type}
    {...props}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`px-4 py-2 rounded-md font-semibold transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
      VARIANTS[variant] || VARIANTS.primary
    } ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
  >
    {loading ? 'Loading...' : children}
  </button>
);