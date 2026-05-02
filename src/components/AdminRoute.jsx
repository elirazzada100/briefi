import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/admin";

export default function AdminRoute({ children }) {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, user, navigateToLogin } = useAuth();

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
