export interface ActionProps extends React.HTMLAttributes<HTMLButtonElement> {
  type?: "button" | "submit" | "reset" | undefined;
  disabled?: boolean;
  className?: string;
}

export const PrimaryAction: React.FC<ActionProps> = ({
  children,
  disabled = false,
  type = "button",
  ...props
}) => {
  return (
    <button
      className={`w-full px-4 py-2 text-base font-semibold text-white transition duration-200 bg-orange-500 rounded disabled:bg-gray-200 disabled:text-gray-400 ${
        !disabled && "hover:bg-gray-900"
      }`}
      {...{ disabled, type }}
      {...props}
    >
      {children}
    </button>
  );
};

export const SecondaryAction: React.FC<ActionProps> = ({
  children,
  disabled = false,
  type = "button",
  ...props
}) => {
  return (
    <button
      className={`w-full px-4 py-2 text-base font-semibold text-gray-900 transition duration-200 bg-transparent rounded disabled:bg-gray-200 disabled:text-gray-400 ${
        !disabled && "hover:bg-gray-100"
      }`}
      {...{ disabled, type }}
      {...props}
    >
      {children}
    </button>
  );
};
