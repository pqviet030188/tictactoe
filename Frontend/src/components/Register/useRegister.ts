import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "../../api";
import type { RegisterRequest } from "../../types";
import {
  usePasswordValidation,
  validatePassword,
} from "./usePasswordValidation";
import "../../styles/auth.css";

export const useRegister = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [apiError, setApiError] = useState<string>("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterRequest>({
    mode: "onBlur",
  });

  const password = watch("password");
  usePasswordValidation(password);

  const onSubmit = useCallback(
    async (data: RegisterRequest) => {
      setApiError("");
      setIsSubmitting(true);

      try {
        const response = await authApi.register(data);
        setSuccessMessage(
          response.message ||
            "Account created successfully! Redirecting to login..."
        );

        // Redirect to login after 2 seconds for user to see the success message
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } catch (error) {
        setApiError(
          error instanceof Error ? error.message : "Registration failed"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      setApiError,
      setIsSubmitting,
      navigate,
      setSuccessMessage,
    ]
  );

  const emailRegisterField = useMemo(() => {
    return register("email", {
      required: "Email is required",
      pattern: {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Please enter a valid email address",
      },
    });
  }, [register]);

  const passwordRegisterField = useMemo(() => {
    return register("password", {
      required: "Password is required",
      validate: validatePassword,
    });
  }, [register]);

  return {
    isSubmitting,
    successMessage,
    apiError,
    register,
    handleSubmit,
    emailRegisterField,
    passwordRegisterField,
    errors,
    onSubmit,
    password,
  };
};
