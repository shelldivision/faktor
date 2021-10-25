import { InputField } from "./InputField";

export function TransferRateInput() {
  return (
    <div className="space-y-3">
      <InputField
        type="datetime-local"
        label="Schedule for"
        onChange={(v) => {}}
      />
      <div className="flex justify-end pr-1 space-x-3">
        <span className="flex flex-col">
          <span className="my-auto text-sm font-medium text-gray-900">
            Make this a recurring payment
          </span>
        </span>
        <button
          type="button"
          className="relative inline-flex flex-shrink-0 h-6 transition-colors duration-200 ease-in-out bg-gray-200 border-2 border-transparent rounded-full cursor-pointer w-11 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          role="switch"
          aria-checked="false"
        >
          <span
            aria-hidden="true"
            className="inline-block w-5 h-5 transition duration-200 ease-in-out transform translate-x-0 bg-white rounded-full shadow pointer-events-none ring-0"
          ></span>
        </button>
      </div>
    </div>
  );
  //   return (
  //     <div className="flex flex-row flex-1 space-x-2">
  //       <InputField
  //         type="number"
  //         label="Every"
  //         placeholder="1"
  //         onChange={() => {}}
  //       />
  //       <InputField
  //         type="number"
  //         label="Duration"
  //         placeholder="Week"
  //         onChange={() => {}}
  //       />
  //     </div>
  //   );
}
