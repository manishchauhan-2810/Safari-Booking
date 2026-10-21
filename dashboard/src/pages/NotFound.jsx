import { Link } from "react-router-dom";

export const NotFound = () => (
  <div className="p-8 text-center">
    <h1 className="mb-2 text-2xl font-bold">Page not found</h1>
    <Link to="/" className="text-green-700 underline">Back to dashboard</Link>
  </div>
);