'use client';

import { useId, useState } from 'react';

/**
 * A password field with a show/hide toggle.
 *
 * Reused by the login, create-account and reset-password forms. The toggle is a
 * real button with an accessible label and `aria-pressed`, and the input keeps
 * its `autocomplete` hint so password managers keep working.
 */
export default function PasswordInput({
  label = 'Password',
  value,
  onChange,
  name = 'password',
  id,
  autoComplete = 'current-password',
  placeholder,
  required = false,
  disabled = false,
  showToggle = true,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showToggle?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? `password-${name}-${generatedId}`;

  return (
    <div>
      <label htmlFor={inputId} className="form-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`form-input ${showToggle ? 'pr-16' : ''}`}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            disabled={disabled}
            className="btn-ghost absolute inset-y-0 right-1 my-auto h-7 px-2 text-xs"
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </div>
  );
}
