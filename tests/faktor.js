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
    const [invoiceAddress, invoiceBump] = await PublicKey.findProgramAddress(
      [alice.publicKey.toBuffer(), bob.publicKey.toBuffer()],
      program.programId
    );
    const [outflowAddress, outflowBump] = await PublicKey.findProgramAddress(
      ["outflow", bob.publicKey.toBuffer(), alice.publicKey.toBuffer()],
      program.programId
    );
    await airdrop(alice.publicKey);
    await airdrop(bob.publicKey);
    return {
      alice,
      bob,
      invoice: { address: invoiceAddress, bump: invoiceBump },
      outflow: { address: outflowAddress, bump: outflowBump },
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
      invoice: await provider.connection.getBalance(accounts.invoice.address),
      outflow: await provider.connection.getBalance(accounts.outflow.address),
    };
  }

  /** Invoices **/

  /**
   * issueInvoice - Issues an invoice with Alice as creditor and Bob as debtor.
   *
   * @param {object} accounts The accounts of the test case
   * @param {number} balance The invoice balance
   */
  async function issueInvoice(accounts, balance) {
    const memo = `Ceci n'est pas un mémo`;
    await program.rpc.issue(accounts.invoice.bump, new BN(balance), memo, {
      accounts: {
        invoice: accounts.invoice.address,
        creditor: accounts.alice.publicKey,
        debtor: accounts.bob.publicKey,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
      signers: [accounts.alice],
    });
  }

  it("Alice issues invoice", async () => {
    // Setup
    const accounts = await generateAccounts();

    // Test
    const initialBalances = await getBalances(accounts);
    await issueInvoice(accounts, 1234);

    // Validate
    const invoice = await program.account.invoice.fetch(
      accounts.invoice.address
    );
    const finalBalances = await getBalances(accounts);
    assert.ok(
      invoice.creditor.toString() === accounts.alice.publicKey.toString()
    );
    assert.ok(invoice.debtor.toString() === accounts.bob.publicKey.toString());
    assert.ok(invoice.balance.toString() === "1234");
    assert.ok(invoice.memo === "Ceci n'est pas un mémo");
    assert.ok(
      finalBalances.alice === initialBalances.alice - finalBalances.invoice
    );
    assert.ok(finalBalances.bob === initialBalances.bob);
    assert.ok(
      finalBalances.invoice === initialBalances.alice - finalBalances.alice
    );
  });

  it("Bob pays invoice in part", async () => {
    // Setup
    const accounts = await generateAccounts();
    await issueInvoice(accounts, 1234);

    // Test
    const initialBalances = await getBalances(accounts);
    const amount = 1000;
    await program.rpc.pay(new BN(amount), {
      accounts: {
        invoice: accounts.invoice.address,
        creditor: accounts.alice.publicKey,
        debtor: accounts.bob.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [accounts.bob],
    });

    // Validate
    const invoice = await program.account.invoice.fetch(
      accounts.invoice.address
    );
    const finalBalances = await getBalances(accounts);
    assert.ok(
      invoice.creditor.toString() === accounts.alice.publicKey.toString()
    );
    assert.ok(invoice.debtor.toString() === accounts.bob.publicKey.toString());
    assert.ok(invoice.balance.toString() === "234");
    assert.ok(invoice.memo === "Ceci n'est pas un mémo");
    assert.ok(finalBalances.alice === initialBalances.alice + amount);
    assert.ok(finalBalances.bob === initialBalances.bob - amount);
    assert.ok(finalBalances.invoice === initialBalances.invoice);
  });

  it("Bob pays invoice in full", async () => {
    // Setiup
    const accounts = await generateAccounts();
    await issueInvoice(accounts, 1234);

    // Test
    const initialBalances = await getBalances(accounts);
    const amount = 1234;
    await program.rpc.pay(new BN(amount), {
      accounts: {
        invoice: accounts.invoice.address,
        creditor: accounts.alice.publicKey,
        debtor: accounts.bob.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [accounts.bob],
    });

    // Validate
    await assert.rejects(
      program.account.invoice.fetch(accounts.invoice.address),
      {
        message: `Account does not exist ${accounts.invoice.address.toString()}`,
      }
    );
    const finalBalances = await getBalances(accounts);
    assert.ok(
      finalBalances.alice ===
        initialBalances.alice + initialBalances.invoice + amount
    );
    assert.ok(finalBalances.bob === initialBalances.bob - amount);
    assert.ok(finalBalances.invoice === 0);
  });

  it("Bob overpays invoice", async () => {
    // Setiup
    const accounts = await generateAccounts();
    await issueInvoice(accounts, 1234);

    // Test
    const initialBalances = await getBalances(accounts);
    let amount = 1234;
    await program.rpc.pay(new BN(amount * 10), {
      accounts: {
        invoice: accounts.invoice.address,
        creditor: accounts.alice.publicKey,
        debtor: accounts.bob.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [accounts.bob],
    });

    // Validate
    await assert.rejects(
      program.account.invoice.fetch(accounts.invoice.address),
      {
        message: `Account does not exist ${accounts.invoice.address.toString()}`,
      }
    );
    const finalBalances = await getBalances(accounts);
    assert.ok(
      finalBalances.alice ===
        initialBalances.alice + initialBalances.invoice + amount
    );
    assert.ok(finalBalances.bob === initialBalances.bob - amount);
    assert.ok(finalBalances.invoice === 0);
  });

  /** Outflows **/

  /**
   * createOutflow - Creates an outflow with Alice as debtor and Bob as creditor.
   *
   * @param {object} accounts The accounts of the test case
   * @param {number} balance The invoice balance
   */
  async function createOutflow(
    accounts,
    name,
    memo,
    balance,
    deltaBalance,
    deltaTime
  ) {
    await program.rpc.createOutflow(
      name,
      memo,
      new BN(balance),
      new BN(deltaBalance),
      new BN(deltaTime),
      accounts.outflow.bump,
      {
        accounts: {
          outflow: accounts.outflow.address,
          creditor: accounts.bob.publicKey,
          debtor: accounts.alice.publicKey,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
        },
        signers: [accounts.alice],
      }
    );
  }

  it("Alice creates an outflow", async () => {
    // Setup
    const accounts = await generateAccounts();

    // Test
    const initialBalances = await getBalances(accounts);
    const name = "Name";
    const memo = "Memo";
    const balance = 1000;
    const deltaBalance = 100;
    const deltaTime = 50;
    await createOutflow(accounts, name, memo, balance, deltaBalance, deltaTime);

    // Validate
    const outflow = await program.account.outflow.fetch(
      accounts.outflow.address
    );
    const finalBalances = await getBalances(accounts);
    assert.ok(outflow.name === "Name");
    assert.ok(outflow.memo === "Memo");
    assert.ok(
      outflow.creditor.toString() === accounts.bob.publicKey.toString()
    );
    assert.ok(
      outflow.debtor.toString() === accounts.alice.publicKey.toString()
    );
    assert.ok(outflow.deltaBalance.toString() === deltaBalance.toString());
    assert.ok(outflow.deltaTime.toString() === deltaTime.toString());
    assert.ok(finalBalances.alice <= initialBalances.alice - balance);
    assert.ok(finalBalances.bob === initialBalances.bob);
    assert.ok(finalBalances.outflow >= initialBalances.outflow + balance);
  });
});
