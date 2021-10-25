export interface InputFieldProps {
  type: string;
  label: string;
  value?: string;
  placeholder?: string;
  error?: string;
  onChange?: (val: any) => void;
}

export function InputField({ type, error, label, placeholder, value, onChange }: InputFieldProps) {
  async function _onChange(e: any) {
    onChange(e.target.value);
  }

  return (
    <InputContainer label={label} error={error}>
      <input
        type={type}
        placeholder={placeholder}
        onChange={_onChange}
        value={value}
        className="flex items-center text-xl text-black placeholder-gray-400 bg-white border-none rounded-lg outline-none h-input focus:ring-0"
      />
    </InputContainer>
  );
}

export function InputContainer({ children, error, label }) {
  return (
    <div
      className={`pt-2 flex flex-col flex-1 bg-white border rounded-lg ${
        error ? "border-red-600" : `border-gray-200`
      }`}
    >
      <InputLabel title={label} />
      {children}
      <InputErrorLabel error={error} />
    </div>
  );
}

export function InputLabel({ title }) {
  return <label className={`my-2 ml-3 text-gray-600 font-medium text-sm leading-3`}>{title}</label>;
}

export function InputErrorLabel({ error }) {
  if (!error) return null;
  return <label className="text-base text-red-600">{error}</label>;
}
