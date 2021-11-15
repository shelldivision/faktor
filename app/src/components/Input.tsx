import React from "react";

export interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  min?: number | string;
  step?: string | number;
  className?: string;
  onBlur?: () => void;
}

export function Input({ className = "", onChange, ...restProps }: InputProps) {
  return (
    <input
      {...restProps}
      onChange={onChange}
      className={`${className} flex items-center text-xl text-gray-900 placeholder-gray-400 bg-white rounded-lg outline-none focus:ring-0`}
    />
  );
}
