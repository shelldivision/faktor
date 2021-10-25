import { PropsWithClassName } from "./types";

export interface InputFieldProps extends InputProps {
  error?: string;
  label?: string;
  labelClassName?: string;
  input?: JSX.Element;
}

export const InputField = ({
  label,
  error,
  className = "",
  labelClassName = "",
  input,
  ...inputProps
}: PropsWithClassName<InputFieldProps>) => {
  return (
    <div
      className={`${className} pt-1 flex flex-col flex-1 bg-white border rounded-lg ${
        error ? "border-red-600" : `border-gray-200`
      }`}
    >
      {label && <InputLabel className={`${labelClassName} my-2 ml-3`}>{label}</InputLabel>}
      {input ?? <Input {...inputProps} />}
      {error && <p className="text-base text-red-600">{error}</p>}
    </div>
  );
};

export const InputLabel: React.FC<PropsWithClassName> = ({ children, className = "" }) => {
  return (
    <label className={`${className} text-gray-600 font-medium text-sm leading-3`}>{children}</label>
  );
};

export type InputProps = {
  type?: string;
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  autoComplete?: string;
  min?: string;
  step?: string;
  required?: boolean;
};

export const Input = ({ className = "", onChange, ...props }: PropsWithClassName<InputProps>) => {
  const _onChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <input
      {...props}
      onChange={_onChange}
      className={`${className} h-input bg-white flex items-center flex-grow text-xl text-black py-2 rounded-lg placeholder-gray-400 border-none outline-none focus:ring-0`}
    />
  );
};
