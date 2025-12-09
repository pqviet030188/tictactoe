import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import type { LoginRequest } from "../../types";
import { authService } from "../../services";
import { loginRequest, store, useAppSelector } from "../../store";

export const useLogin = () => {
  const navigate = useNavigate();
  const loginState = useAppSelector(state => state.user.login);
  const currentUser = useAppSelector(state => state.user.currentUser);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    mode: "onBlur",
  });

  const emailField = useMemo(() => {
    return register("email", {
      required: "Email is required",
      pattern: {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Please enter a valid email address",
      },
    });
  }, [register]);

  const passwordField = useMemo(() => {
    return register("password", {
      required: "Password is required",
      minLength: {
        value: 6,
        message: "Password must be at least 6 characters",
      },
    });
  }, [register]);

  const onSubmit = useCallback(async (data: LoginRequest) => {
    store.dispatch(loginRequest(data));
  }, []);

  useEffect(()=>{
    if (
      // see if we can login
      authService.hasAccessToken() || 
      // or if we just logged in
      loginState.success || 
      // or if we already have a user
      currentUser
    ) {
      navigate("/game");
    }
  }, [loginState.success, currentUser, navigate]);

  return {
    isSubmitting: loginState.loading,
    apiError: loginState.error,
    emailField,
    passwordField,
    errors,
    handleSubmit,
    onSubmit,
  }
};
