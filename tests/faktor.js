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

  /** Helper functions **/

  /**
   * generateAccounts - Generates keypairs and PDAs for participants and program accounts needed in a test case
   *
   * @returns {object} The accounts needed for a test case
   */
  async function generateAccounts() {
    const alice = Keypair.generate();
    const bob = Keypair.generate();
    const charlie = Keypair.generate();
    const dana = Keypair.generate();
    const [cashflowAddress, cashflowBump] = await PublicKey.findProgramAddress(
      ["cashflow", alice.publicKey.toBuffer(), bob.publicKey.toBuffer()],
      program.programId
    );
    await airdrop(alice.publicKey);
    await airdrop(bob.publicKey);
    await airdrop(charlie.publicKey);
    await airdrop(dana.publicKey);
    return {
      alice,
      bob,
      charlie,
      dana,
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
      dana: await provider.connection.getBalance(accounts.dana.publicKey),
      cashflow: await provider.connection.getBalance(accounts.cashflow.address),
    };
  }

  /** Common RPCs **/

  /**
   * createCashflow - Alice creates a cashflow to send SOL to Bob.
   */
  async function createCashflow(
    accounts,
    name,
    memo,
    balance,
    bounty,
    deltaBalance,
    deltaBounty,
    deltaTime
  ) {
    await program.rpc.createCashflow(
      name,
      memo,
      new BN(balance),
      new BN(bounty),
      new BN(deltaBalance),
      new BN(deltaBounty),
      new BN(deltaTime),
      accounts.cashflow.bump,
      {
        accounts: {
          cashflow: accounts.cashflow.address,
          sender: accounts.alice.publicKey,
          receiver: accounts.bob.publicKey,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
        },
        signers: [accounts.alice],
      }
    );
  }

  /**
   * distributeCashflow - Dana distributes a cashflow from Alice to Bob.
   */
  async function distributeCashflow(accounts) {
    await program.rpc.distributeCashflow({
      accounts: {
        cashflow: accounts.cashflow.address,
        sender: accounts.alice.publicKey,
        receiver: accounts.bob.publicKey,
        distributor: accounts.dana.publicKey,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
      signers: [accounts.dana],
    });
  }

  /** Test cases **/

  it("Alice creates a cashflow", async () => {
    // Setup
    const accounts = await generateAccounts();

    // Test
    const initialBalances = await getBalances(accounts);
    const name = "Abc";
    const memo = "123";
    const balance = 1000;
    const bounty = 3;
    const deltaBalance = 100;
    const deltaBounty = 3;
    const deltaTime = 50;
    await createCashflow(
      accounts,
      name,
      memo,
      balance,
      bounty,
      deltaBalance,
      deltaBounty,
      deltaTime
    );

    // Validate
    const cashflow = await program.account.cashflow.fetch(
      accounts.cashflow.address
    );
    const finalBalances = await getBalances(accounts);
    assert.ok(cashflow.name === "Abc");
    assert.ok(cashflow.memo === "123");
    assert.ok(
      cashflow.sender.toString() === accounts.alice.publicKey.toString()
    );
    assert.ok(
      cashflow.receiver.toString() === accounts.bob.publicKey.toString()
    );
    assert.ok(cashflow.balance.toString() === balance.toString());
    assert.ok(cashflow.bounty.toString() === bounty.toString());
    assert.ok(cashflow.deltaBalance.toString() === deltaBalance.toString());
    assert.ok(cashflow.deltaBounty.toString() === deltaBounty.toString());
    assert.ok(cashflow.deltaTime.toString() === deltaTime.toString());
    assert.ok(finalBalances.alice <= initialBalances.alice - balance);
    assert.ok(finalBalances.bob === initialBalances.bob);
    assert.ok(finalBalances.charlie === initialBalances.charlie);
    assert.ok(finalBalances.dana === initialBalances.dana);
    assert.ok(finalBalances.cashflow >= initialBalances.cashflow + balance);
  });

  it("Dana distributes a cashflow", async () => {
    // Setup
    const accounts = await generateAccounts();
    const name = "Abc";
    const memo = "123";
    const balance = 1000;
    const bounty = 3;
    const deltaBalance = 100;
    const deltaBounty = 3;
    const deltaTime = 50;
    await createCashflow(
      accounts,
      name,
      memo,
      balance,
      bounty,
      deltaBalance,
      deltaBounty,
      deltaTime
    );

    // Test
    const initialBalances = await getBalances(accounts);
    await distributeCashflow(accounts);

    // Validate
    const cashflow = await program.account.cashflow.fetch(
      accounts.cashflow.address
    );
    const finalBalances = await getBalances(accounts);
    assert.ok(cashflow.name === "Abc");
    assert.ok(cashflow.memo === "123");
    assert.ok(
      cashflow.sender.toString() === accounts.alice.publicKey.toString()
    );
    assert.ok(
      cashflow.receiver.toString() === accounts.bob.publicKey.toString()
    );
    assert.ok(cashflow.balance.toString() === balance.toString());
    assert.ok(cashflow.bounty.toString() === bounty.toString());
    assert.ok(cashflow.deltaBalance.toString() === deltaBalance.toString());
    assert.ok(cashflow.deltaBounty.toString() === deltaBounty.toString());
    assert.ok(cashflow.deltaTime.toString() === deltaTime.toString());
    assert.ok(finalBalances.alice === initialBalances.alice);
    assert.ok(finalBalances.bob === initialBalances.bob + deltaBalance);
    assert.ok(finalBalances.charlie === initialBalances.charlie);
    assert.ok(finalBalances.dana === initialBalances.dana + bounty);
    assert.ok(
      finalBalances.cashflow ===
        initialBalances.cashflow - deltaBalance - bounty
    );
  });
});
