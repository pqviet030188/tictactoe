import { useMemo } from "react";

export interface PasswordValidationRule {
  test: (password: string) => boolean;
  label: string;
}

export const rules: PasswordValidationRule[] = [
  {
    test: (pwd) => pwd.length >= 8,
    label: "At least 8 characters",
  },
  {
    test: (pwd) => /(?=.*[a-z])/.test(pwd),
    label: "One lowercase letter",
  },
  {
    test: (pwd) => /(?=.*[A-Z])/.test(pwd),
    label: "One uppercase letter",
  },
  {
    test: (pwd) => /(?=.*\d)/.test(pwd),
    label: "One number",
  },
  {
    test: (pwd) => /(?=.*[!@#$%^&*(),.?":{}|<>])/.test(pwd),
    label: "One special character",
  },
];

export const validatePassword = (value: string): boolean | string => {
  for (const rule of rules) {
    if (!rule.test(value)) {
      return `Password must contain: ${rule.label.toLowerCase()}`;
    }
  }
  return true;
};

export const usePasswordValidation = (password: string = "") => {
  const isPasswordValid = useMemo(
    () => rules.every((rule) => rule.test(password)),
    [password]
  );

  return {
    isPasswordValid,
  };
};
