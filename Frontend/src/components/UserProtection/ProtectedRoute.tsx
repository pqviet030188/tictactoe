import React from "react";
import { UserProtection } from "./UserProtection";
import { LoadingScreen } from "../LoadingScreen";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <UserProtection
      fallback={
        <LoadingScreen
          title="Loading Your Profile..."
          message="Please wait while we fetch your account details"
        />
      }
      redirectTo={"/"}
    >
      {children}
    </UserProtection>
  );
};
