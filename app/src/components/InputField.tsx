import React from "react";

export interface InputFieldProps {
  type: string;
  value?: any;
  label: string;
  placeholder?: string;
  error?: string;
  onChange?: (val: any) => void;
}

export function InputField({ type, error, label, placeholder, value, onChange }: InputFieldProps) {
  async function _onChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange && onChange(e.target.value);
  }

  return (
    <InputContainer label={label} error={error}>
      <input
        type={type}
        placeholder={placeholder}
        onChange={_onChange}
        value={value}
        className="flex items-center text-xl text-black placeholder-gray-400 bg-white border-none rounded-lg outline-none focus:ring-0"
      />
    </InputContainer>
  );
}

export function InputContainer({
  children,
  error,
  label
}: React.PropsWithChildren<{ error: string | undefined | null; label?: string }>) {
  return (
    <div className="flex flex-col flex-1">
      <InputBox label={label} error={error}>
        {children}
      </InputBox>
      <InputErrorLabel error={error} />
    </div>
  );
}

export function InputBox({
  children,
  error,
  label = ""
}: React.PropsWithChildren<{ error: string | undefined | null; label?: string }>) {
  return (
    <div
      className={`pt-2 flex flex-col flex-1 bg-white rounded-lg ${
        error ? "border-2 border-red-600" : "border border-gray-200"
      }`}
    >
      <InputLabel title={label} />
      {children}
    </div>
  );
}

export function InputLabel({ title }: { title: string }) {
  return <label className={`mt-2 ml-3 text-gray-600 font-medium text-sm leading-3`}>{title}</label>;
}

export function InputErrorLabel({ error }: { error: string | undefined | null }) {
  if (!error) return null;
  return <label className="mx-1 mt-1 text-base text-red-600">{error}</label>;
}
