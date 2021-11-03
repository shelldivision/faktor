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
      className={`w-full px-5 py-3 text-lg font-semibold text-white transition duration-200 bg-orange-500 rounded-lg disabled:bg-none disabled:bg-gray-300 disabled:text-gray-500 ${
        !disabled && "shadow hover:bg-orange-400 hover:shadow-lg"
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
      className="flex items-center justify-center w-full px-4 text-lg font-semibold text-gray-700 transition rounded-lg h-14 hover:bg-gray-200"
      {...{ disabled, type }}
      {...props}
    >
      {children}
    </button>
  );
};
