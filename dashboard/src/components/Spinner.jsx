const Spinner = ({ full = false, label = "Loading..." }) => (
  <div role="status" className={`flex items-center justify-center gap-2 text-earth-600 ${full ? "min-h-screen" : "py-8"}`}>
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-earth-300 border-t-green-700" />
    <span className="text-sm">{label}</span>
  </div>
);

export default Spinner;