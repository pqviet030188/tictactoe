import React from "react";
import { UserProtection } from "./UserProtection";
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <UserProtection
      fallback={<div className="loading">Loading user data...</div>}
      redirectTo={"/"}
    >
      {children}
    </UserProtection>
  );
};
