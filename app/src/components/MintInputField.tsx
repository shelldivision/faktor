import { InputContainer, MintSelect } from "@components";

interface MintInputFieldProps {
  error: string | null;
  onChange: (val: string) => void;
}

export function MintInputField({ error, onChange }: MintInputFieldProps) {
  async function _onChange(e: any) {
    // TODO link this to MintSelect
    onChange(e.target.value);
  }

  return (
    <InputContainer label={"Mint"} error={error}>
      <MintSelect />
    </InputContainer>
  );
}
