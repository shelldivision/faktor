import React from "react";

export function ErrorMessage({
  children,
  className = ""
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <p className={`${className} h-12 leading-4 flex items-center text-lg text-red-500`}>
      {children}
    </p>
  );
}
