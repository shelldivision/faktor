import { ErrorMessage } from "@components";
import React, { HTMLAttributes, useEffect, useMemo, useState } from "react";

export interface InputFieldProps extends HTMLAttributes<HTMLInputElement> {
  label?: string;
  onChange: (val: any) => void;
  validator?: (val: string) => string | null;
  value: string;
  required?: boolean;
  type?: string;
}

export function InputField({
  label,
  onChange,
  validator,
  value,
  required = false,
  className = "",
  ...inputProps
}: InputFieldProps) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange({ currentTarget: { value } }: React.ChangeEvent<HTMLInputElement>) {
    onChange(value);
  }

  function handleBlur() {
    setTouched(true);
  }

  useEffect(() => {
    if (!value) return;
    const fieldError = getFieldError(value, required, validator);
    setTimeout(() => {
      setError(fieldError);
    }, 300);
  }, [value]);

  const displayErrorMessage = useMemo(() => Boolean(touched && error), [error, touched]);

  return (
    <InputGroup className={className} showError={displayErrorMessage}>
      <div className={`flex flex-col justify-center`}>
        {label && <InputLabel className="mt-2" title={label} />}
        <div className="flex-1">
          <input
            {...inputProps}
            className={`flex items-center text-xl text-black placeholder-gray-400 bg-white border-none rounded-lg outline-none focus:ring-0`}
            value={value}
            required={required}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </InputGroup>
  );
}

export function getFieldError(
  value: string,
  required: boolean,
  validator?: ((val: string) => string | null) | undefined
): string | null {
  let error: string | null = null;

  if (required) {
    error = validateRequiredField(value);
  } else if (validator) {
    error = validator(value);
  }
  return error;
}

export function validateRequiredField(val: string) {
  return !val ? "This is a required field." : null;
}

export function InputLabel({ title, className = "" }: { title: string; className?: string }) {
  return <label className={`${className} ml-3 text-gray-600 font-medium text-sm`}>{title}</label>;
}

export function InputGroup({
  children,
  className = "",
  showError = false
}: React.PropsWithChildren<{
  className?: string;
  showError?: boolean;
}>) {
  return (
    <div
      className={`${className} bg-white rounded-lg ${
        showError ? "border-2 border-red-500" : "border border-gray-200"
      } min-h-[4.5rem] flex flex-col flex-1 justify-center`}
    >
      {children}
    </div>
  );
}
