import React from 'react';
import type { PasswordValidationRule } from './usePasswordValidation';

interface PasswordRequirementsProps {
  password: string;
  rules: PasswordValidationRule[];
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password, rules }) => {
  return (
    <div className="password-requirements">
      <small>Password must contain:</small>
      <ul className="requirements-list">
        {rules.map((rule, index) => (
          <li 
            key={index}
            className={password && rule.test(password) ? 'valid' : ''}
          >
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
};