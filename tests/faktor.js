const assert = require("assert");
const anchor = require("@project-serum/anchor");
const solana = require("@solana/web3.js");

const { LAMPORTS_PER_SOL, SYSVAR_CLOCK_PUBKEY } = solana;
const { BN, Provider, utils } = anchor;
const { Keypair, SystemProgram, PublicKey } = anchor.web3;

describe("faktor", () => {
  // Test environment
  const provider = Provider.local();
  const program = anchor.workspace.Faktor;
  anchor.setProvider(provider);

  /**
   * generateAccounts - Generates keypairs and PDAs for participants and program accounts needed in a test case
   *
   * @returns {object} The accounts needed for a test case
   */
  async function generateAccounts() {
    const alice = Keypair.generate();
    const bob = Keypair.generate();
    const charlie = Keypair.generate();
    const charlie = Keypair.generate();
    const [cashflowAddress, cashflowBump] = await PublicKey.findProgramAddress(
      ["cashflow", bob.publicKey.toBuffer(), alice.publicKey.toBuffer()],
      program.programId
    );
    await airdrop(alice.publicKey);
    await airdrop(bob.publicKey);
    await airdrop(charlie.publicKey);
    return {
      alice,
      bob,
      charlie,
      cashflow: { address: cashflowAddress, bump: cashflowBump },
    };
  }

  /**
   * airdrop - Airdrops SOL to an account.
   *
   * @param {PublicKey} publicKey
   */
  async function airdrop(publicKey) {
    await provider.connection
      .requestAirdrop(publicKey, LAMPORTS_PER_SOL)
      .then((sig) => provider.connection.confirmTransaction(sig, "confirmed"));
  }

  /**
   * getBalances - Fetches the balances of Alice, Bob, and the invoice account.
   *
   * @returns {object} The balances
   */
  async function getBalances(accounts) {
    return {
      alice: await provider.connection.getBalance(accounts.alice.publicKey),
      bob: await provider.connection.getBalance(accounts.bob.publicKey),
      charlie: await provider.connection.getBalance(accounts.charlie.publicKey),
      cashflow: await provider.connection.getBalance(accounts.cashflow.address),
    };
  }

  /** Outflows **/

  /**
   * createCashflow - Creates an cashflow with Alice as debtor and Bob as creditor.
   *
   * @param {object} accounts The accounts of the test case
   * @param {number} balance The invoice balance
   */
  async function createCashflow(
    accounts,
    name,
    memo,
    balance,
    deltaBalance,
    deltaTime
  ) {
    await program.rpc.createCashflow(
      name,
      memo,
      new BN(balance),
      new BN(deltaBalance),
      new BN(deltaTime),
      accounts.cashflow.bump,
      {
        accounts: {
          cashflow: accounts.cashflow.address,
          creditor: accounts.bob.publicKey,
          debtor: accounts.alice.publicKey,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
        },
        signers: [accounts.alice],
      }
    );
  }

  it("Alice creates a cashflow", async () => {
    // Setup
    const accounts = await generateAccounts();

    // Test
    const initialBalances = await getBalances(accounts);
    const name = "Name";
    const memo = "Memo";
    const balance = 1000;
    const deltaBalance = 100;
    const deltaTime = 50;
    await createCashflow(
      accounts,
      name,
      memo,
      balance,
      deltaBalance,
      deltaTime
    );

    // Validate
    const cashflow = await program.account.cashflow.fetch(
      accounts.cashflow.address
    );
    const finalBalances = await getBalances(accounts);
    assert.ok(cashflow.name === "Name");
    assert.ok(cashflow.memo === "Memo");
    assert.ok(
      cashflow.creditor.toString() === accounts.bob.publicKey.toString()
    );
    assert.ok(
      cashflow.debtor.toString() === accounts.alice.publicKey.toString()
    );
    assert.ok(cashflow.deltaBalance.toString() === deltaBalance.toString());
    assert.ok(cashflow.deltaTime.toString() === deltaTime.toString());
    assert.ok(finalBalances.alice <= initialBalances.alice - balance);
    assert.ok(finalBalances.bob === initialBalances.bob);
    assert.ok(finalBalances.cashflow >= initialBalances.cashflow + balance);
    assert.ok(finalBalances.charlie === initialBalances.charlie);
  });
});
