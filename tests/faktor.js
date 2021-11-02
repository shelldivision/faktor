const assert = require("assert");
const anchor = require("@project-serum/anchor");
const solana = require("@solana/web3.js");
const spl = require("@solana/spl-token");

const { LAMPORTS_PER_SOL, SYSVAR_CLOCK_PUBKEY } = solana;
const { BN, Provider } = anchor;
const { Keypair, SystemProgram, PublicKey } = anchor.web3;
const { Token, TOKEN_PROGRAM_ID } = spl;

// Mints
const WSOL_MINT = new anchor.web3.PublicKey(
  "So11111111111111111111111111111111111111112"
);

// Fees
const TRANSFER_FEE_DISTRIBUTOR = 1000;
const TRANSFER_FEE_TREASURY = 1000;

// Seeds
const PAYMENT_SEED = Buffer.from("payment");
const TREASURY_SEED = Buffer.from("treasury");

describe("faktor", () => {
  // Test environment
  var treasury;
  const provider = Provider.local();
  const program = anchor.workspace.Faktor;
  anchor.setProvider(provider);

  /** HELPERS **/

  async function airdrop(publicKey, amount) {
    await provider.connection
      .requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL)
      .then((sig) => provider.connection.confirmTransaction(sig, "confirmed"));
  }

  /**
   * createAccounts - Generates keypairs, token accounts, and PDAs for participants and program accounts needed in a test case
   *
   * @returns {object} The accounts needed for a test case
   */
  async function createAccounts() {
    async function createAccount() {
      const keys = Keypair.generate();
      await airdrop(keys.publicKey, 5);
      const tokens = await Token.createWrappedNativeAccount(
        provider.connection,
        TOKEN_PROGRAM_ID,
        keys.publicKey,
        keys,
        4 * LAMPORTS_PER_SOL
      );
      return {
        keys,
        tokens,
      };
    }

    const alice = await createAccount();
    const bob = await createAccount();
    const charlie = await createAccount();
    const dana = await createAccount();
    const [payment, paymentBump] = await PublicKey.findProgramAddress(
      [
        PAYMENT_SEED,
        alice.keys.publicKey.toBuffer(),
        bob.keys.publicKey.toBuffer(),
      ],
      program.programId
    );
    return {
      alice,
      bob,
      charlie,
      dana,
      payment: {
        keys: {
          publicKey: payment,
        },
        bump: paymentBump,
      },
    };
  }

  /**
   * getBalances - Fetches the balances of Alice, Bob, and the invoice account.
   *
   * @returns {object} The balances
   */
  async function getBalances(accounts) {
    async function getBalance(pubkey) {
      return await provider.connection.getBalance(pubkey);
    }
    async function getTokenBalance(account) {
      const token = new Token(
        provider.connection,
        WSOL_MINT,
        TOKEN_PROGRAM_ID,
        account.keys
      );
      const tokensInfo = await token.getAccountInfo(account.tokens);
      return await tokensInfo.amount.toNumber();
    }

    return {
      alice: {
        SOL: await getBalance(accounts.alice.keys.publicKey),
        wSOL: await getTokenBalance(accounts.alice),
      },
      bob: {
        SOL: await getBalance(accounts.bob.keys.publicKey),
        wSOL: await getTokenBalance(accounts.bob),
      },
      charlie: {
        SOL: await getBalance(accounts.charlie.keys.publicKey),
        wSOL: await getTokenBalance(accounts.charlie),
      },
      dana: {
        SOL: await getBalance(accounts.dana.keys.publicKey),
        wSOL: await getTokenBalance(accounts.dana),
      },
      payment: {
        SOL: await getBalance(accounts.payment.keys.publicKey),
      },
      treasury: {
        SOL: await getBalance(treasury),
      },
    };
  }

  /** API **/

  /**
   * createPayment - Alice creates a payment to send SOL to Bob.
   */
  async function createPayment(
    accounts,
    memo,
    amount,
    authorizedBalance,
    recurrenceInterval
  ) {
    await program.rpc.createPayment(
      memo,
      new BN(amount),
      new BN(authorizedBalance),
      new BN(recurrenceInterval),
      accounts.payment.bump,
      {
        accounts: {
          payment: accounts.payment.keys.publicKey,
          debtor: accounts.alice.keys.publicKey,
          debtorTokens: accounts.alice.tokens,
          creditor: accounts.bob.keys.publicKey,
          creditorTokens: accounts.bob.tokens,
          mint: WSOL_MINT,
          systemProgram: SystemProgram.programId,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
        },
        signers: [accounts.alice.keys],
      }
    );
  }

  /**
   * distributePayment - Dana distributes a payment from Alice to Bob.
   */
  async function distributePayment(accounts) {
    await program.rpc.distributePayment({
      accounts: {
        payment: accounts.payment.keys.publicKey,
        debtor: accounts.alice.keys.publicKey,
        debtorTokens: accounts.alice.tokens,
        creditor: accounts.bob.keys.publicKey,
        creditorTokens: accounts.bob.tokens,
        distributor: accounts.dana.keys.publicKey,
        treasury: treasury,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
      signers: [accounts.dana.keys],
    });
  }

  before(async () => {
    const signer = Keypair.generate();
    await airdrop(signer.publicKey, 1);
    const [_treasury, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [TREASURY_SEED],
      program.programId
    );
    treasury = _treasury;
    await program.rpc.initializeTreasury(bump, {
      accounts: {
        treasury: treasury,
        signer: signer.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [signer],
    });
  });

  /** TESTS **/

  it("Alice creates a payment to Bob.", async () => {
    // Setup
    const accounts = await createAccounts();

    // Test
    const initialBalances = await getBalances(accounts);
    const memo = "Abc";
    const amount = 100;
    const authorizedBalance = 1000;
    const recurrenceInterval = 50;
    await createPayment(
      accounts,
      memo,
      amount,
      authorizedBalance,
      recurrenceInterval
    );

    // Validate payment data.
    let expectedRent = 2394240;
    let expectedTransferFee =
      (authorizedBalance / amount) *
      (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY);
    const payment = await program.account.payment.fetch(
      accounts.payment.keys.publicKey
    );
    assert.ok(payment.memo === "Abc");
    assert.ok(
      payment.debtor.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment.creditor.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.authorizedBalance.toNumber() === authorizedBalance);
    assert.ok(payment.recurrenceInterval.toNumber() === recurrenceInterval);

    // Validate SOL balances.
    const finalBalances = await getBalances(accounts);
    assert.ok(
      finalBalances.alice.SOL ===
        initialBalances.alice.SOL - expectedRent - expectedTransferFee
    );
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(finalBalances.dana.SOL === initialBalances.dana.SOL);
    assert.ok(
      finalBalances.payment.SOL ===
        initialBalances.payment.SOL + expectedRent + expectedTransferFee
    );
    assert.ok(finalBalances.treasury.SOL === initialBalances.treasury.SOL);

    // Validate wSOL balances.
    assert.ok(finalBalances.alice.wSOL === initialBalances.alice.wSOL);
    assert.ok(finalBalances.bob.wSOL === initialBalances.bob.wSOL);
    assert.ok(finalBalances.charlie.wSOL === initialBalances.charlie.wSOL);
    assert.ok(finalBalances.dana.wSOL === initialBalances.dana.wSOL);
  });

  it("Dana distributes a payment from Alice to Bob.", async () => {
    // Setup
    const accounts = await createAccounts();
    const memo = "Abc";
    const amount = 100;
    const authorizedBalance = 1000;
    const recurrenceInterval = 50;
    await createPayment(
      accounts,
      memo,
      amount,
      authorizedBalance,
      recurrenceInterval
    );

    // Test
    const initialBalances = await getBalances(accounts);
    await distributePayment(accounts);

    // Validate payment data.
    const payment = await program.account.payment.fetch(
      accounts.payment.keys.publicKey
    );
    assert.ok(payment.memo === "Abc");
    assert.ok(
      payment.debtor.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment.creditor.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(
      payment.authorizedBalance.toNumber() === authorizedBalance - amount
    );
    assert.ok(payment.recurrenceInterval.toNumber() === recurrenceInterval);

    // Validate SOL balances.
    const finalBalances = await getBalances(accounts);
    assert.ok(finalBalances.alice.SOL === initialBalances.alice.SOL);
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(
      finalBalances.dana.SOL ===
        initialBalances.dana.SOL + TRANSFER_FEE_DISTRIBUTOR
    );
    assert.ok(
      finalBalances.payment.SOL ===
        initialBalances.payment.SOL -
          TRANSFER_FEE_DISTRIBUTOR -
          TRANSFER_FEE_TREASURY
    );
    assert.ok(
      finalBalances.treasury.SOL ===
        initialBalances.treasury.SOL + TRANSFER_FEE_TREASURY
    );

    // Validate wSOL balances.
    assert.ok(finalBalances.alice.wSOL === initialBalances.alice.wSOL - amount);
    assert.ok(finalBalances.bob.wSOL === initialBalances.bob.wSOL + amount);
    assert.ok(finalBalances.charlie.wSOL === initialBalances.charlie.wSOL);
    assert.ok(finalBalances.dana.wSOL === initialBalances.dana.wSOL);
  });
});
