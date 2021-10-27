import { InputContainer, MintSelect } from "@components";

export function MintInputField({ error, onChange }) {
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
