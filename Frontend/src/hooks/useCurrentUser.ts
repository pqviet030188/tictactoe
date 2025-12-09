import { useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import { selectCurrentUser, selectUserLoading, selectUserError, loadUser } from '../store/userSlice';

export const useCurrentUser = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector(selectUserLoading);
  const error = useAppSelector(selectUserError)

  // Determine if we should load user
  const shouldLoadUser = useMemo(() => {
    return currentUser == null && !error;
  }, [currentUser, error]);

  // Load user effect first time
  useEffect(()=>{
    if (shouldLoadUser) {
      dispatch(loadUser());
    }
  }, [shouldLoadUser, dispatch]);

  return {
    currentUser,
    isLoading,
    error,
  };
};