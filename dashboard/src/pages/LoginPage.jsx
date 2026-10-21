import { useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export const LoginPage = () => {
  const { admin, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && admin) return <Navigate to={location.state?.from || "/"} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.status === 401 || err.status === 400 ? "Invalid email or password" : err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-emerald-700 p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 15%, #fbbf24 0, transparent 35%), radial-gradient(circle at 85% 85%, #34d399 0, transparent 40%)" }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400 text-xl font-extrabold text-green-950">C</span>
          <span className="text-lg font-bold">Corbett Admin</span>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight">Manage safaris,<br />dates and bookings.</h2>
          <p className="mt-3 max-w-sm text-green-100">Open or close zones, set capacity, and see every booking in one place.</p>
        </div>
        <p className="relative text-sm text-green-200">Jim Corbett Adventures</p>
      </div>

      <div className="flex items-center justify-center bg-earth-50 p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-earth-200" noValidate>
          <h1 className="text-2xl font-bold text-earth-800">Welcome back</h1>
          <p className="mb-6 mt-1 text-sm text-earth-600">Log in to the admin dashboard.</p>

          {params.get("expired") && !error && (
            <p role="status" className="mb-4 rounded bg-amber-50 p-2 text-sm text-amber-800">Your session expired. Please log in again.</p>
          )}

          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />

          <div className="relative mt-4">
            <Input label="Password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="[&_input]:pr-16" />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute bottom-2 right-3 text-xs font-medium text-earth-700 underline"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          <Button type="submit" className="mt-6 w-full !py-2.5" loading={submitting} disabled={!email || !password}>Log in</Button>
        </form>
      </div>
    </div>
  );
};