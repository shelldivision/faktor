import { CheckIcon, SelectorIcon } from "@heroicons/react/solid";
import { classNames } from "./helpers";
import { Fragment, useMemo } from "react";
import { Listbox, Transition } from "@headlessui/react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  selectedOption: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  formatSelectedOption: (val: string) => string;
}

export function Select({ onChange, selectedOption, formatSelectedOption, options }: SelectProps) {
  const selectOptions = useMemo(() => {
    return options;
  }, [options]);

  function handleChange(newSelected: string) {
    onChange(newSelected);
  }

  return (
    <Listbox value={selectedOption} onChange={handleChange}>
      <div className="relative">
        <Listbox.Button className="text-gray-900 bg-white relative h-full border border-gray-200 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-lg sm:text-sm">
          {formatSelectedOption(selectedOption)}
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <SelectorIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-max mt-1 w-40 overflow-x-hidden overflow-y-scroll bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-scroll focus:outline-none sm:text-sm">
            {selectOptions.map((option) => (
              <Listbox.Option
                key={option.value}
                className={({ active }) =>
                  classNames(
                    active ? "text-white bg-indigo-600" : "text-gray-900",
                    "cursor-default select-none relative py-2 px-3 w-40 bg-white"
                  )
                }
                value={option.value}
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={classNames(
                        selected ? "font-semibold" : "font-normal",
                        "block truncate"
                      )}
                    >
                      {option.label}
                    </span>

                    {selected ? (
                      <span
                        className={classNames(
                          active ? "text-white" : "text-indigo-600",
                          "absolute inset-y-0 right-0 flex items-center pr-4"
                        )}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
