import React from "react";
import { Link } from "react-router-dom";
import "../../styles/auth.css";
import { useLogin } from "./useLogin";

export const Login: React.FC = () => {
  const {
    apiError,
    emailField,
    passwordField,
    handleSubmit,
    onSubmit,
    isSubmitting,
    errors,
  } = useLogin();

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your account to continue</p>
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
              {...emailField}
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
              {...passwordField}
              className={`form-input ${
                errors.password ? "form-input-error" : ""
              }`}
              placeholder="Enter your password"
              disabled={isSubmitting}
            />
            {errors.password && (
              <span className="form-error">{errors.password.message}</span>
            )}
          </div>

          {apiError && <div className="api-error">{apiError}</div>}

          <button type="submit" disabled={isSubmitting} className="auth-button">
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <Link to="/signup" className="auth-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
