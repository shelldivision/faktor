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
        className="flex items-center p-2 text-base text-black placeholder-gray-400 border-none rounded outline-none focus:ring-0"
      />
    </InputContainer>
  );
}

export function InputContainer({
  children,
  error,
  label = ""
}: React.PropsWithChildren<{ error: string | undefined | null; label?: string }>) {
  return (
    <div className="flex flex-col flex-1 space-y-2">
      <InputLabel title={label} />
      <div className={`rounded ${error ? "border-2 border-red-600" : "border border-gray-200"}`}>
        {children}
      </div>
      <InputErrorLabel error={error} />
    </div>
  );
}

export function InputLabel({ title }: { title: string }) {
  return <label className={`text-gray-900 font-medium text-sm`}>{title}</label>;
}

export function InputErrorLabel({ error }: { error: string | undefined | null }) {
  if (!error) return null;
  return <label className="mt-2 text-sm text-left text-red-600">{error}</label>;
}
