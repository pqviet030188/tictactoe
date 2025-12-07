import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import type { LoginRequest } from "../../types";
import { authService } from "../../services";
import { authApi } from "../../api";

export const useLogin = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string>("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    mode: "onBlur",
  });

  useEffect(() => {
    // Redirect to game if token is found
    if (authService.hasAccessToken()) {
      navigate("/game");
    }
  }, [navigate]);

  const emailField = useMemo(() => {
    return register("email", {
      required: "Email is required",
      pattern: {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Please enter a valid email address",
      },
    });
  }, []);

  const passwordField = useMemo(() => {
    return register("password", {
      required: "Password is required",
      minLength: {
        value: 6,
        message: "Password must be at least 6 characters",
      },
    });
  }, []);

  const onSubmit = useCallback(async (data: LoginRequest) => {
    setApiError("");
    setIsSubmitting(true);

    try {
      await authApi.login(data);
      navigate("/game");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [setApiError, setIsSubmitting, navigate]);

  return {
    isSubmitting,
    apiError,
    emailField,
    passwordField,
    errors,
    handleSubmit,
    onSubmit,
  }
};
