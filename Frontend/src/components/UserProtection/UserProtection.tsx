import React, { useEffect } from "react";
import { useCurrentUser } from "../../hooks";
import { useNavigate } from "react-router-dom";

interface UserProtectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo: string;
}

export const UserProtection: React.FC<UserProtectionProps> = ({
  children,
  fallback = <div>Loading user...</div>,
  redirectTo,
}) => {
  const navigate = useNavigate();
  const { shouldLogUserOff, isAuthenticated } = useCurrentUser();

  useEffect(() => {
    if (shouldLogUserOff) {
      navigate(redirectTo);
    }
  }, [navigate, redirectTo, shouldLogUserOff]);

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
