import React, { useEffect } from "react";
import { useCurrentUser } from "../../hooks";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../store";

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
  const loginState = useAppSelector((state) => state.user.login);
  const currentUserState = useCurrentUser();
  useEffect(() => {
    // Redirect if not current user not found and login failed
    // and there is an error fetching current user
    if (
      !currentUserState.currentUser &&
      !!currentUserState.error &&
      !loginState.success
    ) {
      navigate(redirectTo);
    }
  }, [
    loginState.success,
    currentUserState.currentUser,
    currentUserState.error,
    navigate,
    redirectTo
  ]);

  if (!currentUserState.currentUser) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
