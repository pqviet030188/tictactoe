import React from "react";
import { Link } from "react-router-dom";
import { PasswordRequirements } from "./PasswordRequirements";
import "../../styles/auth.css";
import { useRegister } from "./useRegister";
import { rules } from "./usePasswordValidation";

export const Register: React.FC = () => {
  const {
    isSubmitting,
    successMessage,
    handleSubmit,
    onSubmit,
    register,
    errors,
    emailRegisterField,
    passwordRegisterField,
    apiError,
    password,
  } = useRegister();

  if (successMessage) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="success-message">
            <h2 className="success-title">Welcome!</h2>
            <p className="success-text">{successMessage}</p>
            <div className="success-animation">
              <div className="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join us to start playing Tic Tac Toe</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="auth-form"
          noValidate
        >
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              {...emailRegisterField}
              className={`form-input ${errors.email ? "form-input-error" : ""}`}
              placeholder="Enter your email"
              disabled={isSubmitting}
            />
            {errors.email && (
              <span className="form-error">{errors.email.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              {...passwordRegisterField}
              className={`form-input ${
                errors.password ? "form-input-error" : ""
              }`}
              placeholder="Create a strong password"
              disabled={isSubmitting}
            />
            {errors.password && (
              <span className="form-error">{errors.password.message}</span>
            )}
            <PasswordRequirements password={password || ""} rules={rules} />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) =>
                  value === password || "Passwords do not match",
              })}
              className={`form-input ${
                errors.confirmPassword ? "form-input-error" : ""
              }`}
              placeholder="Confirm your password"
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <span className="form-error">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          {apiError && <div className="api-error">{apiError}</div>}

          <button type="submit" disabled={isSubmitting} className="auth-button">
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <Link to="/" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
