import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import Spinner from "../components/Spinner";

export const ProtectedRoute = ({ children }) => {
  const { admin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner full />;
  if (!admin) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
};