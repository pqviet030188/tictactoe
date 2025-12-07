import React from 'react';
import { useCurrentUser } from '../../hooks';

export const UserProfile: React.FC = () => {
  const { currentUser } = useCurrentUser();

  return (
    <div className="user-profile">
      <h3>User Profile</h3>
      <p><strong>ID:</strong> {currentUser!.id}</p>
      <p><strong>Email:</strong> {currentUser!.email}</p>
    </div>
  );
};