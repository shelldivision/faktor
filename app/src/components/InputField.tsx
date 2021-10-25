export interface InputFieldProps {
  type?: string;
  value?: string;
  onChange?: (val: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  min?: string;
  step?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  value,
  onChange,
  type = "text",
  label,
  placeholder,
  error,
  autoComplete = "off",
  step,
}) => {
  const _onChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div
      className={`flex flex-col flex-1 bg-white border rounded-lg ${
        error ? "border-red-600" : `border-gray-200`
      }`}
    >
      {label && (
        <label className={`text-gray-600 font-medium text-sm ml-3 mt-2`}>
          {label}
        </label>
      )}
      <input
        {...{ value, placeholder, autoComplete, step }}
        type={type}
        className={`text-lg text-black py-2 rounded-lg placeholder-gray-400 border-none outline-none`}
        onChange={_onChange}
        required
      />
      {error && <p className="text-base text-red-600">{error}</p>}
    </div>
  );
};
