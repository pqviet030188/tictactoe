# User Management System

This document explains how to use the new user management system with Redux Saga and user protection.

## Overview

The user management system provides:
1. Automatic user fetching after login/refresh token
2. User state management with Redux
3. User protection component for loading states
4. Easy access to user data throughout the app

## Architecture

### Redux Store Structure

```typescript
interface UserState {
  users: Record<string, User>; // [userId]: User
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}
```

### Flow

1. **Login/Refresh Success** → Dispatch `fetchUser()` action
2. **Saga** → Makes API call to `/auth/user` endpoint
3. **Success** → Updates store with user data
4. **Components** → Access user via hooks/selectors

## Usage Examples

### Using the UserProtection Component

```tsx
import { UserProtection } from './components';

// Wrap components that need user data
<UserProtection fallback={<div>Loading user...</div>}>
  <MyProtectedComponent />
</UserProtection>
```

### Using the useCurrentUser Hook

```tsx
import { useCurrentUser } from './hooks';

const MyComponent = () => {
  const { currentUser, isLoading, error, refetchUser } = useCurrentUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Welcome, {currentUser?.email}!</h1>
      <button onClick={refetchUser}>Refresh User</button>
    </div>
  );
};
```

### Using the useUser Hook for Specific Users

```tsx
import { useUser } from './hooks';

const UserCard = ({ userId }: { userId: string }) => {
  const user = useUser(userId);

  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h3>{user.email}</h3>
      <p>ID: {user.id}</p>
    </div>
  );
};
```

### Accessing User State with Selectors

```tsx
import { useAppSelector } from './store';
import { selectCurrentUser, selectUserLoading } from './store/userSlice';

const MyComponent = () => {
  const currentUser = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector(selectUserLoading);
  
  // Component logic here
};
```

## Available Actions

- `fetchUser()` - Trigger user data fetch
- `fetchUserSuccess(user)` - Success with user data
- `fetchUserFailed(error)` - Failed with error message
- `clearUser()` - Clear all user data (called on logout)

## Available Selectors

- `selectCurrentUser` - Get the current logged-in user
- `selectUserLoading` - Get loading state
- `selectUserError` - Get error state
- `selectUserById(userId)` - Get specific user by ID

## Automatic Behavior

The system automatically:
1. Fetches user data after successful login
2. Fetches user data after successful token refresh
3. Clears user data on logout or auth errors
4. Fetches user data on app initialization if authenticated

## API Integration

The system uses `authRequests.user` which sends a GET request to `/auth/user` endpoint. Make sure your backend supports this endpoint and returns user data in the expected format.