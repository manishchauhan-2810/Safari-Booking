import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="p-8 text-center">
    <h1 className="text-2xl font-bold mb-2">Page not found</h1>
    <Link to="/" className="text-green-700 underline">Back to home</Link>
  </div>
);

export default NotFound;