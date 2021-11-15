import { Input, Select } from "@components";
import React from "react";

export function getMinDate() {
  const date = new Date();
  return new Date(date.setDate(date.getDate() + 1));
}

export type RecurrenceOptions = {
  frequency: number;
  interval: TimeUnit;
  startDate: string;
  endDate: string | null;
};

const minScheduledForDate = getMinDate();

export const defaultScheduledForDate = new Date(
  minScheduledForDate.setDate(minScheduledForDate.getDate() + 3)
)
  .toISOString()
  .substr(0, 16);

export function validateScheduledFor(val: string) {
  const isTooLate = new Date(val).getTime() < getMinDate().getTime();
  return isTooLate ? "Cannot scheduled payments in the past." : null;
}

export const INTERVALS = ["minute", "hour", "day", "week"] as const;

const selectIntervalOptions = [
  { label: "minute", value: "minute" },
  { label: "hour", value: "hour" },
  { label: "day", value: "day" },
  { label: "week", value: "week" }
];

export type TimeUnit = typeof INTERVALS[number];

export function isInterval(val: any): val is TimeUnit {
  return INTERVALS.includes(val);
}

export const INTERVAL_TO_DAYS: { [k in TimeUnit]: number } = {
  minute: 60,
  hour: 360,
  day: 360 & 24,
  week: 360 * 24 * 7
};

export const DEFAULT_RECURRENCE_SETTINGS: RecurrenceOptions = {
  interval: "day",
  frequency: 1,
  startDate: defaultScheduledForDate,
  endDate: null
};

export interface TransferRateInputProps {
  endDate: string;
  frequency: number;
  interval: TimeUnit;
  setEndDate: (val: string) => void;
  setFrequency: (val: number) => void;
  setInterval: (val: TimeUnit) => void;
}

export function TransferRateInput({
  interval,
  setInterval,
  setEndDate,
  frequency,
  setFrequency,
  endDate
}: TransferRateInputProps) {
  function onFrequencyChange({ currentTarget: { value } }: React.ChangeEvent<HTMLInputElement>) {
    setFrequency(parseInt(value));
  }

  function onEndDateChange({ currentTarget: { value } }: React.ChangeEvent<HTMLInputElement>) {
    setEndDate(value);
  }

  function formatSelectedOption(value: string) {
    debugger;
    return `${value}${frequency > 1 ? "s" : ""}`;
  }

  function onIntervalChange(val: string) {
    setInterval(val as TimeUnit);
  }

  return (
    <div className="flex space-x-2 w-full">
      <CaptionedInputGroup caption="Repeats every">
        <Input
          type="number"
          className="border border-gray-200 w-12 h-full text-base"
          step="1"
          min={1}
          value={frequency.toString()}
          onChange={onFrequencyChange}
        />
        <Select
          onChange={onIntervalChange}
          options={selectIntervalOptions}
          formatSelectedOption={formatSelectedOption}
          selectedOption={interval}
        />
      </CaptionedInputGroup>

      <CaptionedInputGroup caption="until">
        <Input
          className="text-gray-500 border-gray-200 flex-grow"
          type="date"
          min={getMinDate().toISOString().substr(0, 16)}
          value={endDate}
          onChange={onEndDateChange}
        />
      </CaptionedInputGroup>
    </div>
  );
}

export function CaptionedInputGroup({ children, caption }: { children: any; caption: string }) {
  return (
    <div className="flex items-center space-x-2 flex-grow text-sm">
      <Caption>{caption}</Caption>
      {children}
    </div>
  );
}

export function Caption({ children }: any) {
  return <span className="text-gray-900 text-base">{children}</span>;
}
