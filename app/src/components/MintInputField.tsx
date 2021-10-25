import { InputContainer, MintSelect } from "@components";

export function MintInputField({ error, onChange }) {
  async function _onChange(e: any) {
    onChange(e.target.value);
  }

  return (
    <InputContainer label={"Mint"} error={error}>
      <MintSelect />
    </InputContainer>
  );
}
