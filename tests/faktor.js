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

// Keys
const IDEMPOTENCY_KEY_1 = "1";
const IDEMPOTENCY_KEY_2 = "2";

describe("faktor", () => {
  // Test environment
  var treasury;
  const provider = Provider.local();
  const program = anchor.workspace.Faktor;
  anchor.setProvider(provider);

  /** HELPERS **/

  /**
   * createAccounts - Generates keypairs, token accounts, and PDAs for participants and program accounts needed in a test case
   *
   * @returns {object} The accounts needed for a test case
   */
  async function createAccounts() {
    async function createAccount() {
      const keys = Keypair.generate();
      await airdrop(provider.connection, keys.publicKey, 5);
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
    const [payment1, payment1Bump] = await PublicKey.findProgramAddress(
      [
        PAYMENT_SEED,
        Buffer.from(IDEMPOTENCY_KEY_1),
        alice.keys.publicKey.toBuffer(),
        bob.keys.publicKey.toBuffer(),
      ],
      program.programId
    );
    const [payment2, payment2Bump] = await PublicKey.findProgramAddress(
      [
        PAYMENT_SEED,
        Buffer.from(IDEMPOTENCY_KEY_2),
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
      payment1: {
        keys: {
          publicKey: payment1,
        },
        bump: payment1Bump,
      },
      payment2: {
        keys: {
          publicKey: payment2,
        },
        bump: payment2Bump,
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
      payment1: {
        SOL: await getBalance(accounts.payment1.keys.publicKey),
      },
      payment2: {
        SOL: await getBalance(accounts.payment2.keys.publicKey),
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
    idempotencyKey,
    memo,
    amount,
    transferInterval,
    nextTransferAt,
    completedAt
  ) {
    let payment;
    let bump;
    switch (idempotencyKey) {
      case IDEMPOTENCY_KEY_1:
        payment = accounts.payment1.keys.publicKey;
        bump = accounts.payment1.bump;
        break;
      case IDEMPOTENCY_KEY_2:
        payment = accounts.payment2.keys.publicKey;
        bump = accounts.payment2.bump;
        break;
      default:
        break;
    }

    await program.rpc.createPayment(
      idempotencyKey,
      memo,
      new BN(amount),
      new BN(transferInterval),
      new BN(nextTransferAt),
      new BN(completedAt),
      bump,
      {
        accounts: {
          payment: payment,
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
        payment: accounts.payment1.keys.publicKey,
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
    await airdrop(provider.connection, signer.publicKey, 1);
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

  it("Assert Alice can schedule a one-time payment to Bob.", async () => {
    // Setup
    const accounts = await createAccounts();

    // Test
    const initialBalances = await getBalances(accounts);
    const memo = "Abc";
    const amount = 100;
    const transferInterval = 0;
    const now = new Date();
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(now);
    await createPayment(
      accounts,
      IDEMPOTENCY_KEY_1,
      memo,
      amount,
      transferInterval,
      nextTransferAt,
      completedAt
    );

    // Validate payment data.
    let expectedRent = 2498640;
    let expectedTransferFee = TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY;
    const payment = await program.account.payment.fetch(
      accounts.payment1.keys.publicKey
    );
    assert.ok(payment.idempotencyKey === IDEMPOTENCY_KEY_1);
    assert.ok(payment.memo === "Abc");
    assert.ok(
      payment.debtor.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment.debtorTokens.toString() === accounts.alice.tokens.toString()
    );
    assert.ok(
      payment.creditor.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(
      payment.creditorTokens.toString() === accounts.bob.tokens.toString()
    );
    assert.ok(payment.mint.toString() === WSOL_MINT.toString());
    assert.ok(Object.keys(payment.status)[0] === "scheduled");
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.transferInterval.toNumber() === transferInterval);
    assert.ok(payment.nextTransferAt.toNumber() === nextTransferAt);
    assert.ok(payment.completedAt.toNumber() === completedAt);

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
      finalBalances.payment1.SOL ===
        initialBalances.payment1.SOL + expectedRent + expectedTransferFee
    );
    assert.ok(finalBalances.treasury.SOL === initialBalances.treasury.SOL);

    // Validate wSOL balances.
    assert.ok(finalBalances.alice.wSOL === initialBalances.alice.wSOL);
    assert.ok(finalBalances.bob.wSOL === initialBalances.bob.wSOL);
    assert.ok(finalBalances.charlie.wSOL === initialBalances.charlie.wSOL);
    assert.ok(finalBalances.dana.wSOL === initialBalances.dana.wSOL);
  });

  it("Assert Alice can schedule a recurring payment to Bob.", async () => {
    // Setup
    const accounts = await createAccounts();

    // Test
    const initialBalances = await getBalances(accounts);
    const memo = "Abc";
    const amount = 100;
    const transferInterval = 24 * 60 * 60; // Every 24 hours
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(threeDaysFromNow);
    await createPayment(
      accounts,
      IDEMPOTENCY_KEY_1,
      memo,
      amount,
      transferInterval,
      nextTransferAt,
      completedAt
    );

    // Validate payment data.
    let expectedRent = 2498640;
    let exectedNumTransfers = 3;
    let expectedTransferFee =
      exectedNumTransfers * (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY);
    const payment = await program.account.payment.fetch(
      accounts.payment1.keys.publicKey
    );
    assert.ok(payment.idempotencyKey === IDEMPOTENCY_KEY_1);
    assert.ok(payment.memo === "Abc");
    assert.ok(
      payment.debtor.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment.debtorTokens.toString() === accounts.alice.tokens.toString()
    );
    assert.ok(
      payment.creditor.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(
      payment.creditorTokens.toString() === accounts.bob.tokens.toString()
    );
    assert.ok(payment.mint.toString() === WSOL_MINT.toString());
    assert.ok(Object.keys(payment.status)[0] === "scheduled");
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.transferInterval.toNumber() === transferInterval);
    assert.ok(payment.nextTransferAt.toNumber() === nextTransferAt);
    assert.ok(payment.completedAt.toNumber() === completedAt);

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
      finalBalances.payment1.SOL ===
        initialBalances.payment1.SOL + expectedRent + expectedTransferFee
    );
    assert.ok(finalBalances.treasury.SOL === initialBalances.treasury.SOL);

    // Validate wSOL balances.
    assert.ok(finalBalances.alice.wSOL === initialBalances.alice.wSOL);
    assert.ok(finalBalances.bob.wSOL === initialBalances.bob.wSOL);
    assert.ok(finalBalances.charlie.wSOL === initialBalances.charlie.wSOL);
    assert.ok(finalBalances.dana.wSOL === initialBalances.dana.wSOL);
  });

  it("Assert Alice can schedule two payments to Bob with separate idempotency keys.", async () => {
    // Setup
    const accounts = await createAccounts();

    // Test
    const initialBalances = await getBalances(accounts);
    const memo = "Abc";
    const amount = 100;
    const transferInterval = 0;
    const now = new Date();
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(now);
    await createPayment(
      accounts,
      IDEMPOTENCY_KEY_1,
      memo,
      amount,
      transferInterval,
      nextTransferAt,
      completedAt
    );
    await createPayment(
      accounts,
      IDEMPOTENCY_KEY_2,
      memo,
      amount,
      transferInterval,
      nextTransferAt,
      completedAt
    );

    // Validate payment1 data.
    let expectedRent = 2498640;
    let expectedTransferFee = TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY;
    const payment1 = await program.account.payment.fetch(
      accounts.payment1.keys.publicKey
    );
    assert.ok(payment1.idempotencyKey === IDEMPOTENCY_KEY_1);
    assert.ok(payment1.memo === "Abc");
    assert.ok(
      payment1.debtor.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment1.debtorTokens.toString() === accounts.alice.tokens.toString()
    );
    assert.ok(
      payment1.creditor.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(
      payment1.creditorTokens.toString() === accounts.bob.tokens.toString()
    );
    assert.ok(payment1.mint.toString() === WSOL_MINT.toString());
    assert.ok(Object.keys(payment1.status)[0] === "scheduled");
    assert.ok(payment1.amount.toNumber() === amount);
    assert.ok(payment1.transferInterval.toNumber() === transferInterval);
    assert.ok(payment1.nextTransferAt.toNumber() === nextTransferAt);
    assert.ok(payment1.completedAt.toNumber() === completedAt);

    // Validate payment2 data.
    const payment2 = await program.account.payment.fetch(
      accounts.payment2.keys.publicKey
    );
    assert.ok(payment2.idempotencyKey === IDEMPOTENCY_KEY_2);
    assert.ok(payment2.memo === "Abc");
    assert.ok(
      payment2.debtor.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment2.debtorTokens.toString() === accounts.alice.tokens.toString()
    );
    assert.ok(
      payment2.creditor.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(
      payment2.creditorTokens.toString() === accounts.bob.tokens.toString()
    );
    assert.ok(payment2.mint.toString() === WSOL_MINT.toString());
    assert.ok(Object.keys(payment2.status)[0] === "scheduled");
    assert.ok(payment2.amount.toNumber() === amount);
    assert.ok(payment2.transferInterval.toNumber() === transferInterval);
    assert.ok(payment2.nextTransferAt.toNumber() === nextTransferAt);
    assert.ok(payment2.completedAt.toNumber() === completedAt);

    // Validate SOL balances.
    const finalBalances = await getBalances(accounts);
    assert.ok(
      finalBalances.alice.SOL ===
        initialBalances.alice.SOL - 2 * (expectedRent + expectedTransferFee)
    );
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(finalBalances.dana.SOL === initialBalances.dana.SOL);
    assert.ok(
      finalBalances.payment1.SOL ===
        initialBalances.payment1.SOL + expectedRent + expectedTransferFee
    );
    assert.ok(
      finalBalances.payment2.SOL ===
        initialBalances.payment2.SOL + expectedRent + expectedTransferFee
    );
    assert.ok(finalBalances.treasury.SOL === initialBalances.treasury.SOL);

    // Validate wSOL balances.
    assert.ok(finalBalances.alice.wSOL === initialBalances.alice.wSOL);
    assert.ok(finalBalances.bob.wSOL === initialBalances.bob.wSOL);
    assert.ok(finalBalances.charlie.wSOL === initialBalances.charlie.wSOL);
    assert.ok(finalBalances.dana.wSOL === initialBalances.dana.wSOL);
  });

  it("Assert Dana can distribute a one-time payment from Alice to Bob.", async () => {
    // Setup
    const accounts = await createAccounts();
    const memo = "Abc";
    const amount = 100;
    const transferInterval = 0;
    const now = new Date();
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(now);
    await createPayment(
      accounts,
      IDEMPOTENCY_KEY_1,
      memo,
      amount,
      transferInterval,
      nextTransferAt,
      completedAt
    );
    await sleep(1000); // Wait 1s for the blockchain time to go past the nextTransferAt

    // Test
    const initialBalances = await getBalances(accounts);
    await distributePayment(accounts);

    // Validate payment data.
    const payment = await program.account.payment.fetch(
      accounts.payment1.keys.publicKey
    );
    assert.ok(payment.idempotencyKey === IDEMPOTENCY_KEY_1);
    assert.ok(payment.memo === "Abc");
    assert.ok(
      payment.debtor.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment.debtorTokens.toString() === accounts.alice.tokens.toString()
    );
    assert.ok(
      payment.creditor.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(
      payment.creditorTokens.toString() === accounts.bob.tokens.toString()
    );
    assert.ok(payment.mint.toString() === WSOL_MINT.toString());
    assert.ok(Object.keys(payment.status)[0] === "completed");
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.transferInterval.toNumber() === transferInterval);
    assert.ok(
      payment.nextTransferAt.toNumber() === nextTransferAt + transferInterval
    );
    assert.ok(payment.completedAt.toNumber() === completedAt);

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
      finalBalances.payment1.SOL ===
        initialBalances.payment1.SOL -
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

  it("Assert Dana can distribute one transfer of a recurring payment from Alice to Bob.", async () => {
    // Setup
    const accounts = await createAccounts();
    const memo = "Abc";
    const amount = 100;
    const transferInterval = 24 * 60 * 60; // Every 24 hours
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(threeDaysFromNow);
    await createPayment(
      accounts,
      IDEMPOTENCY_KEY_1,
      memo,
      amount,
      transferInterval,
      nextTransferAt,
      completedAt
    );
    await sleep(1000); // Wait 1s for the blockchain time to go past the nextTransferAt

    // Test
    const initialBalances = await getBalances(accounts);
    await distributePayment(accounts);

    // Validate payment data.
    const payment = await program.account.payment.fetch(
      accounts.payment1.keys.publicKey
    );
    assert.ok(payment.idempotencyKey === IDEMPOTENCY_KEY_1);
    assert.ok(payment.memo === "Abc");
    assert.ok(
      payment.debtor.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment.debtorTokens.toString() === accounts.alice.tokens.toString()
    );
    assert.ok(
      payment.creditor.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(
      payment.creditorTokens.toString() === accounts.bob.tokens.toString()
    );
    assert.ok(payment.mint.toString() === WSOL_MINT.toString());
    assert.ok(Object.keys(payment.status)[0] === "scheduled");
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.transferInterval.toNumber() === transferInterval);
    assert.ok(
      payment.nextTransferAt.toNumber() === nextTransferAt + transferInterval
    );
    assert.ok(payment.completedAt.toNumber() === completedAt);

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
      finalBalances.payment1.SOL ===
        initialBalances.payment1.SOL -
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

  it("Assert Dana can distribute all transfers of a recurring payment from Alice to Bob.", async () => {
    // Setup
    const accounts = await createAccounts();
    const memo = "Abc";
    const amount = 100;
    const transferInterval = 5; // Every 5 seconds
    const now = new Date();
    const twentySecondsFromNow = new Date(now.getTime() + 20 * 1000);
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(twentySecondsFromNow);
    await createPayment(
      accounts,
      IDEMPOTENCY_KEY_1,
      memo,
      amount,
      transferInterval,
      nextTransferAt,
      completedAt
    );
    await sleep(1000); // Wait 1s for the blockchain time to go past the nextTransferAt

    // Test
    const initialBalances = await getBalances(accounts);
    await distributePayment(accounts);
    await sleep(5 * 1000);
    await distributePayment(accounts);
    await sleep(5 * 1000);
    await distributePayment(accounts);
    await sleep(5 * 1000);
    await distributePayment(accounts);

    // Validate payment data.
    const numTransfers = 4;
    const payment = await program.account.payment.fetch(
      accounts.payment1.keys.publicKey
    );
    assert.ok(payment.idempotencyKey === IDEMPOTENCY_KEY_1);
    assert.ok(payment.memo === "Abc");
    assert.ok(
      payment.debtor.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment.debtorTokens.toString() === accounts.alice.tokens.toString()
    );
    assert.ok(
      payment.creditor.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(
      payment.creditorTokens.toString() === accounts.bob.tokens.toString()
    );
    assert.ok(payment.mint.toString() === WSOL_MINT.toString());
    assert.ok(Object.keys(payment.status)[0] === "completed");
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.transferInterval.toNumber() === transferInterval);
    assert.ok(
      payment.nextTransferAt.toNumber() ===
        nextTransferAt + transferInterval * numTransfers
    );
    assert.ok(payment.completedAt.toNumber() === completedAt);

    // Validate SOL balances.
    const finalBalances = await getBalances(accounts);
    assert.ok(finalBalances.alice.SOL === initialBalances.alice.SOL);
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(
      finalBalances.dana.SOL ===
        initialBalances.dana.SOL + TRANSFER_FEE_DISTRIBUTOR * numTransfers
    );
    assert.ok(
      finalBalances.payment1.SOL ===
        initialBalances.payment1.SOL -
          (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY) * numTransfers
    );
    assert.ok(
      finalBalances.treasury.SOL ===
        initialBalances.treasury.SOL + TRANSFER_FEE_TREASURY * numTransfers
    );

    // Validate wSOL balances.
    assert.ok(
      finalBalances.alice.wSOL ===
        initialBalances.alice.wSOL - amount * numTransfers
    );
    assert.ok(
      finalBalances.bob.wSOL ===
        initialBalances.bob.wSOL + amount * numTransfers
    );
    assert.ok(finalBalances.charlie.wSOL === initialBalances.charlie.wSOL);
    assert.ok(finalBalances.dana.wSOL === initialBalances.dana.wSOL);
  });
});

/** UTILITIES **/

async function airdrop(connection, publicKey, amount) {
  await connection
    .requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL)
    .then((sig) => connection.confirmTransaction(sig, "confirmed"));
}

function dateToSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
