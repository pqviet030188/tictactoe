import { useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { selectCurrentUser, selectUserLoading, selectUserError, fetchUser } from '../store/userSlice';

export const useCurrentUser = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector(selectUserLoading);
  const error = useAppSelector(selectUserError);

  console.log('useCurrentUser - currentUser:', currentUser, 'isLoading:', isLoading, 'error:', error);

  // Determine if user is authenticated
  const isAuthenticated = useMemo(()=>{

    // when user is present and no error, then authenticated
    return currentUser !== null && !!!error;
  }, [currentUser, error]);

  // Determine if we should load user
  const shouldLoadUser = useMemo(() => {
    return currentUser == null && !!!error;
  }, [currentUser, error]);

  const shouldLogUserOff = useMemo(() => {
    return !isAuthenticated && !!error;
  }, [isAuthenticated, error]);

  // Load user effect first time
  useEffect(()=>{
    if (shouldLoadUser) {
      dispatch(fetchUser());
    }
  }, [shouldLoadUser]);

  return {
    currentUser,
    isLoading,
    error,
    isAuthenticated,
    shouldLogUserOff
  };
};