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

// Rend
const RENT_PAYMENT = 2442960;
const RENT_TRANSFER_LOG = 1677360;

// Seeds
const TREASURY_SEED = Buffer.from("treasury");

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
    return {
      alice,
      bob,
      charlie,
      dana,
    };
  }

  /**
   * getBalances - Fetches the balances of Alice, Bob, and the invoice account.
   *
   * @returns {object} The balances
   */
  async function getBalance(account) {
    return await provider.connection.getBalance(account);
  }
  async function getTokenBalance(tokenAccount) {
    const token = new Token(
      provider.connection,
      WSOL_MINT,
      TOKEN_PROGRAM_ID,
      Keypair.generate()
    );
    const tokensInfo = await token.getAccountInfo(tokenAccount);
    return await tokensInfo.amount.toNumber();
  }
  async function getAccountBalances(accounts) {
    return {
      alice: {
        SOL: await getBalance(accounts.alice.keys.publicKey),
        wSOL: await getTokenBalance(accounts.alice.tokens),
      },
      bob: {
        SOL: await getBalance(accounts.bob.keys.publicKey),
        wSOL: await getTokenBalance(accounts.bob.tokens),
      },
      charlie: {
        SOL: await getBalance(accounts.charlie.keys.publicKey),
        wSOL: await getTokenBalance(accounts.charlie.tokens),
      },
      dana: {
        SOL: await getBalance(accounts.dana.keys.publicKey),
        wSOL: await getTokenBalance(accounts.dana.tokens),
      },
      // payment1: {
      //   SOL: await getBalance(accounts.payment1.keys.publicKey),
      // },
      // payment2: {
      //   SOL: await getBalance(accounts.payment2.keys.publicKey),
      // },
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
    debtor,
    creditor,
    idempotencyKey,
    memo,
    amount,
    recurrenceInterval,
    nextTransferAt,
    completedAt
  ) {
    const [payment, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from(idempotencyKey),
        debtor.keys.publicKey.toBuffer(),
        creditor.keys.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.rpc.createPayment(
      idempotencyKey,
      memo,
      new BN(amount),
      new BN(recurrenceInterval),
      new BN(nextTransferAt),
      new BN(completedAt),
      bump,
      {
        accounts: {
          payment: payment,
          debtor: debtor.keys.publicKey,
          debtorTokens: debtor.tokens,
          creditor: creditor.keys.publicKey,
          creditorTokens: creditor.tokens,
          mint: WSOL_MINT,
          systemProgram: SystemProgram.programId,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
        },
        signers: [debtor.keys],
      }
    );

    return [payment, bump];
  }

  /**
   * distributePayment - Dana distributes a payment from Alice to Bob.
   */
  async function distributePayment(paymentAddress, payment, distributor) {
    const [transferLog, bump] = await PublicKey.findProgramAddress(
      [
        paymentAddress.toBuffer(),
        Buffer.from(payment.nextTransferAt.toString()),
      ],
      program.programId
    );

    await program.rpc.distributePayment(bump, {
      accounts: {
        payment: paymentAddress,
        transferLog: transferLog,
        debtor: payment.debtor,
        debtorTokens: payment.debtorTokens,
        creditor: payment.creditor,
        creditorTokens: payment.creditorTokens,
        distributor: distributor.publicKey,
        treasury: treasury,
        systemProgram: SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
      signers: [distributor],
    });

    return [transferLog, bump];
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
    const initialBalances = await getAccountBalances(accounts);
    const idempotencyKey = "1";
    const memo = "Abc";
    const amount = 100;
    const recurrenceInterval = 0;
    const now = new Date();
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(now);
    const [paymentAddress, bump] = await createPayment(
      accounts.alice,
      accounts.bob,
      idempotencyKey,
      memo,
      amount,
      recurrenceInterval,
      nextTransferAt,
      completedAt
    );

    // Validate payment data.
    const payment = await program.account.payment.fetch(paymentAddress);
    assert.ok(payment.idempotencyKey === idempotencyKey);
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
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.recurrenceInterval.toNumber() === recurrenceInterval);
    assert.ok(payment.nextTransferAt.toNumber() === nextTransferAt);
    assert.ok(payment.completedAt.toNumber() === completedAt);
    assert.ok(payment.bump === bump);

    // Validate SOL balances.
    const finalBalances = await getAccountBalances(accounts);
    const finalPaymentBalance = await getBalance(paymentAddress);
    assert.ok(
      finalBalances.alice.SOL ===
        initialBalances.alice.SOL -
          RENT_PAYMENT -
          TRANSFER_FEE_DISTRIBUTOR -
          TRANSFER_FEE_TREASURY
    );
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(finalBalances.dana.SOL === initialBalances.dana.SOL);
    assert.ok(finalBalances.treasury.SOL === initialBalances.treasury.SOL);
    assert.ok(
      finalPaymentBalance ===
        RENT_PAYMENT + TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY
    );

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
    const initialBalances = await getAccountBalances(accounts);
    const idempotencyKey = "1";
    const memo = "Abc";
    const amount = 100;
    const recurrenceInterval = 24 * 60 * 60; // Every 24 hours
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(threeDaysFromNow);
    const [paymentAddress, bump] = await createPayment(
      accounts.alice,
      accounts.bob,
      idempotencyKey,
      memo,
      amount,
      recurrenceInterval,
      nextTransferAt,
      completedAt
    );

    // Validate payment data.
    const EXPECTED_NUM_TRANSFERS = 3;
    const EXPECTED_TRANSFER_FEE =
      EXPECTED_NUM_TRANSFERS *
      (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY);
    const payment = await program.account.payment.fetch(paymentAddress);
    assert.ok(payment.idempotencyKey === idempotencyKey);
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
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.recurrenceInterval.toNumber() === recurrenceInterval);
    assert.ok(payment.nextTransferAt.toNumber() === nextTransferAt);
    assert.ok(payment.completedAt.toNumber() === completedAt);
    assert.ok(payment.bump === bump);

    // Validate SOL balances.
    const finalBalances = await getAccountBalances(accounts);
    const finalPaymentBalance = await getBalance(paymentAddress);
    assert.ok(
      finalBalances.alice.SOL ===
        initialBalances.alice.SOL - RENT_PAYMENT - EXPECTED_TRANSFER_FEE
    );
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(finalBalances.dana.SOL === initialBalances.dana.SOL);
    assert.ok(finalBalances.treasury.SOL === initialBalances.treasury.SOL);
    assert.ok(finalPaymentBalance === RENT_PAYMENT + EXPECTED_TRANSFER_FEE);

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
    const initialBalances = await getAccountBalances(accounts);
    const idempotencyKey1 = "1";
    const idempotencyKey2 = "2";
    const memo = "Abc";
    const amount = 100;
    const recurrenceInterval = 0;
    const now = new Date();
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(now);
    const [paymentAddress1, bump1] = await createPayment(
      accounts.alice,
      accounts.bob,
      idempotencyKey1,
      memo,
      amount,
      recurrenceInterval,
      nextTransferAt,
      completedAt
    );
    const [paymentAddress2, bump2] = await createPayment(
      accounts.alice,
      accounts.bob,
      idempotencyKey2,
      memo,
      amount,
      recurrenceInterval,
      nextTransferAt,
      completedAt
    );

    // Validate payment1 data.
    const payment1 = await program.account.payment.fetch(paymentAddress1);
    assert.ok(payment1.idempotencyKey === idempotencyKey1);
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
    assert.ok(payment1.amount.toNumber() === amount);
    assert.ok(payment1.recurrenceInterval.toNumber() === recurrenceInterval);
    assert.ok(payment1.nextTransferAt.toNumber() === nextTransferAt);
    assert.ok(payment1.completedAt.toNumber() === completedAt);
    assert.ok(payment1.bump === bump1);

    // Validate payment2 data.
    const payment2 = await program.account.payment.fetch(paymentAddress2);
    assert.ok(payment2.idempotencyKey === idempotencyKey2);
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
    assert.ok(payment2.amount.toNumber() === amount);
    assert.ok(payment2.recurrenceInterval.toNumber() === recurrenceInterval);
    assert.ok(payment2.nextTransferAt.toNumber() === nextTransferAt);
    assert.ok(payment2.completedAt.toNumber() === completedAt);
    assert.ok(payment2.bump === bump2);

    // Validate SOL balances.
    const finalBalances = await getAccountBalances(accounts);
    const finalPaymentBalance1 = await getBalance(paymentAddress1);
    const finalPaymentBalance2 = await getBalance(paymentAddress2);
    assert.ok(
      finalBalances.alice.SOL ===
        initialBalances.alice.SOL -
          2 * (RENT_PAYMENT + TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY)
    );
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(finalBalances.dana.SOL === initialBalances.dana.SOL);
    assert.ok(finalBalances.treasury.SOL === initialBalances.treasury.SOL);
    assert.ok(
      finalPaymentBalance1 ===
        RENT_PAYMENT + TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY
    );
    assert.ok(
      finalPaymentBalance2 ===
        RENT_PAYMENT + TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY
    );

    // Validate wSOL balances.
    assert.ok(finalBalances.alice.wSOL === initialBalances.alice.wSOL);
    assert.ok(finalBalances.bob.wSOL === initialBalances.bob.wSOL);
    assert.ok(finalBalances.charlie.wSOL === initialBalances.charlie.wSOL);
    assert.ok(finalBalances.dana.wSOL === initialBalances.dana.wSOL);
  });

  it("Assert Dana can distribute a one-time payment from Alice to Bob.", async () => {
    // Setup
    const accounts = await createAccounts();
    const idempotencyKey = "1";
    const memo = "Abc";
    const amount = 100;
    const recurrenceInterval = 0;
    const now = new Date();
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(now);
    const [paymentAddress, paymentBump] = await createPayment(
      accounts.alice,
      accounts.bob,
      idempotencyKey,
      memo,
      amount,
      recurrenceInterval,
      nextTransferAt,
      completedAt
    );
    await sleep(1000); // Wait 1s for the blockchain time to go past the nextTransferAt

    // Test
    const initialBalances = await getAccountBalances(accounts);
    const initialPaymentBalance = await getBalance(paymentAddress);
    const initialPayment = await program.account.payment.fetch(paymentAddress);
    const [transferLogAddress, transferLogBump] = await distributePayment(
      paymentAddress,
      initialPayment,
      accounts.dana.keys
    );

    // Validate payment data.
    const payment = await program.account.payment.fetch(paymentAddress);
    assert.ok(payment.idempotencyKey === idempotencyKey);
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
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.recurrenceInterval.toNumber() === recurrenceInterval);
    assert.ok(payment.nextTransferAt.toNumber() === 0);
    assert.ok(payment.completedAt.toNumber() === completedAt);
    assert.ok(payment.bump === paymentBump);

    // Validate transfer log
    const transferLog = await program.account.transferLog.fetch(
      transferLogAddress
    );
    assert.ok(transferLog.payment.toString() === paymentAddress.toString());
    assert.ok(
      transferLog.distributor.toString() ===
        accounts.dana.keys.publicKey.toString()
    );
    assert.ok(Object.keys(transferLog.status)[0] === "succeeded");
    assert.ok(transferLog.bump === transferLogBump);

    // Validate SOL balances.
    const finalBalances = await getAccountBalances(accounts);
    const finalPaymentBalance = await getBalance(paymentAddress);
    const finalTransferLogBalance = await getBalance(transferLogAddress);
    assert.ok(finalBalances.alice.SOL === initialBalances.alice.SOL);
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(
      finalBalances.dana.SOL ===
        initialBalances.dana.SOL - RENT_TRANSFER_LOG + TRANSFER_FEE_DISTRIBUTOR
    );
    assert.ok(
      finalBalances.treasury.SOL ===
        initialBalances.treasury.SOL + TRANSFER_FEE_TREASURY
    );
    assert.ok(
      finalPaymentBalance ===
        initialPaymentBalance - TRANSFER_FEE_DISTRIBUTOR - TRANSFER_FEE_TREASURY
    );
    assert.ok(finalTransferLogBalance === RENT_TRANSFER_LOG);

    // Validate wSOL balances.
    assert.ok(finalBalances.alice.wSOL === initialBalances.alice.wSOL - amount);
    assert.ok(finalBalances.bob.wSOL === initialBalances.bob.wSOL + amount);
    assert.ok(finalBalances.charlie.wSOL === initialBalances.charlie.wSOL);
    assert.ok(finalBalances.dana.wSOL === initialBalances.dana.wSOL);
  });

  it("Assert Dana can distribute one transfer of a recurring payment from Alice to Bob.", async () => {
    // Setup
    const accounts = await createAccounts();
    const idempotencyKey = "1";
    const memo = "Abc";
    const amount = 100;
    const recurrenceInterval = 24 * 60 * 60; // Every 24 hours
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(threeDaysFromNow);
    const [paymentAddress, paymentBump] = await createPayment(
      accounts.alice,
      accounts.bob,
      idempotencyKey,
      memo,
      amount,
      recurrenceInterval,
      nextTransferAt,
      completedAt
    );
    await sleep(1000); // Wait 1s for the blockchain time to go past the nextTransferAt

    // Test
    const initialBalances = await getAccountBalances(accounts);
    const initialPaymentBalance = await getBalance(paymentAddress);
    const initialPayment = await program.account.payment.fetch(paymentAddress);
    const [transferLogAddress, transferLogBump] = await distributePayment(
      paymentAddress,
      initialPayment,
      accounts.dana.keys
    );

    // Validate payment data.
    const payment = await program.account.payment.fetch(paymentAddress);
    assert.ok(payment.idempotencyKey === idempotencyKey);
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
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.recurrenceInterval.toNumber() === recurrenceInterval);
    assert.ok(
      payment.nextTransferAt.toNumber() === nextTransferAt + recurrenceInterval
    );
    assert.ok(payment.completedAt.toNumber() === completedAt);
    assert.ok(payment.bump === paymentBump);

    // Validate transfer log
    const transferLog = await program.account.transferLog.fetch(
      transferLogAddress
    );
    assert.ok(transferLog.payment.toString() === paymentAddress.toString());
    assert.ok(
      transferLog.distributor.toString() ===
        accounts.dana.keys.publicKey.toString()
    );
    assert.ok(Object.keys(transferLog.status)[0] === "succeeded");
    assert.ok(transferLog.bump === transferLogBump);

    // Validate SOL balances.
    const finalBalances = await getAccountBalances(accounts);
    const finalPaymentBalance = await getBalance(paymentAddress);
    const finalTransferLogBalance = await getBalance(transferLogAddress);
    assert.ok(finalBalances.alice.SOL === initialBalances.alice.SOL);
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(
      finalBalances.dana.SOL ===
        initialBalances.dana.SOL - RENT_TRANSFER_LOG + TRANSFER_FEE_DISTRIBUTOR
    );
    assert.ok(
      finalBalances.treasury.SOL ===
        initialBalances.treasury.SOL + TRANSFER_FEE_TREASURY
    );
    assert.ok(
      finalPaymentBalance ===
        initialPaymentBalance - TRANSFER_FEE_DISTRIBUTOR - TRANSFER_FEE_TREASURY
    );
    assert.ok(finalTransferLogBalance === RENT_TRANSFER_LOG);

    // Validate wSOL balances.
    assert.ok(finalBalances.alice.wSOL === initialBalances.alice.wSOL - amount);
    assert.ok(finalBalances.bob.wSOL === initialBalances.bob.wSOL + amount);
    assert.ok(finalBalances.charlie.wSOL === initialBalances.charlie.wSOL);
    assert.ok(finalBalances.dana.wSOL === initialBalances.dana.wSOL);
  });

  it("Assert Dana can distribute all transfers of a recurring payment from Alice to Bob.", async () => {
    // Setup
    const accounts = await createAccounts();
    const idempotencyKey = "1";
    const memo = "Abc";
    const amount = 100;
    const recurrenceInterval = 5; // Every 5 seconds
    const now = new Date();
    const twentySecondsFromNow = new Date(now.getTime() + 20 * 1000);
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(twentySecondsFromNow);
    const [paymentAddress, paymentBump] = await createPayment(
      accounts.alice,
      accounts.bob,
      idempotencyKey,
      memo,
      amount,
      recurrenceInterval,
      nextTransferAt,
      completedAt
    );
    await sleep(1000); // Wait 1s for the blockchain time to go past the nextTransferAt

    // Test transfer 1
    const initialBalances = await getAccountBalances(accounts);
    const initialPaymentBalance = await getBalance(paymentAddress);
    var initialPayment = await program.account.payment.fetch(paymentAddress);
    const [transferLogAddress1, transferLogBump1] = await distributePayment(
      paymentAddress,
      initialPayment,
      accounts.dana.keys
    );
    await sleep(5 * 1000);

    // Test transfer 2
    initialPayment = await program.account.payment.fetch(paymentAddress);
    const [transferLogAddress2, transferLogBump2] = await distributePayment(
      paymentAddress,
      initialPayment,
      accounts.dana.keys
    );
    await sleep(5 * 1000);

    // Test transfer 3
    initialPayment = await program.account.payment.fetch(paymentAddress);
    const [transferLogAddress3, transferLogBump3] = await distributePayment(
      paymentAddress,
      initialPayment,
      accounts.dana.keys
    );
    await sleep(5 * 1000);

    // Test transfer 4
    initialPayment = await program.account.payment.fetch(paymentAddress);
    const [transferLogAddress4, transferLogBump4] = await distributePayment(
      paymentAddress,
      initialPayment,
      accounts.dana.keys
    );

    // Validate payment data.
    const numTransfers = 4;
    const payment = await program.account.payment.fetch(paymentAddress);
    assert.ok(payment.idempotencyKey === idempotencyKey);
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
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.recurrenceInterval.toNumber() === recurrenceInterval);
    assert.ok(payment.nextTransferAt.toNumber() === 0);
    assert.ok(payment.completedAt.toNumber() === completedAt);
    assert.ok(payment.bump === paymentBump);

    // Validate SOL balances.
    const finalBalances = await getAccountBalances(accounts);
    const finalPaymentBalance = await getBalance(paymentAddress);
    assert.ok(finalBalances.alice.SOL === initialBalances.alice.SOL);
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(
      finalBalances.dana.SOL ===
        initialBalances.dana.SOL +
          numTransfers * (TRANSFER_FEE_DISTRIBUTOR - RENT_TRANSFER_LOG)
    );
    assert.ok(
      finalBalances.treasury.SOL ===
        initialBalances.treasury.SOL + TRANSFER_FEE_TREASURY * numTransfers
    );
    assert.ok(
      finalPaymentBalance ===
        initialPaymentBalance -
          numTransfers * (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY)
    );

    // Validate transfer log 1
    const transferLog1 = await program.account.transferLog.fetch(
      transferLogAddress1
    );
    assert.ok(transferLog1.payment.toString() === paymentAddress.toString());
    assert.ok(
      transferLog1.distributor.toString() ===
        accounts.dana.keys.publicKey.toString()
    );
    assert.ok(Object.keys(transferLog1.status)[0] === "succeeded");
    assert.ok(transferLog1.bump === transferLogBump1);

    // Validate transfer log 2
    const transferLog2 = await program.account.transferLog.fetch(
      transferLogAddress2
    );
    assert.ok(transferLog2.payment.toString() === paymentAddress.toString());
    assert.ok(
      transferLog2.distributor.toString() ===
        accounts.dana.keys.publicKey.toString()
    );
    assert.ok(Object.keys(transferLog2.status)[0] === "succeeded");
    assert.ok(transferLog2.bump === transferLogBump2);

    // Validate transfer log 3
    const transferLog3 = await program.account.transferLog.fetch(
      transferLogAddress3
    );
    assert.ok(transferLog3.payment.toString() === paymentAddress.toString());
    assert.ok(
      transferLog3.distributor.toString() ===
        accounts.dana.keys.publicKey.toString()
    );
    assert.ok(Object.keys(transferLog3.status)[0] === "succeeded");
    assert.ok(transferLog3.bump === transferLogBump3);

    // Validate transfer log 4
    const transferLog4 = await program.account.transferLog.fetch(
      transferLogAddress4
    );
    assert.ok(transferLog4.payment.toString() === paymentAddress.toString());
    assert.ok(
      transferLog4.distributor.toString() ===
        accounts.dana.keys.publicKey.toString()
    );
    assert.ok(Object.keys(transferLog4.status)[0] === "succeeded");
    assert.ok(transferLog4.bump === transferLogBump4);

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

  it("Assert payment fails if Alice revokes Faktor's transfer delegation.", async () => {
    // Setup
    const accounts = await createAccounts();
    const idempotencyKey = "1";
    const memo = "Abc";
    const amount = 100;
    const recurrenceInterval = 0;
    const now = new Date();
    const nextTransferAt = dateToSeconds(now);
    const completedAt = dateToSeconds(now);
    const [paymentAddress, paymentBump] = await createPayment(
      accounts.alice,
      accounts.bob,
      idempotencyKey,
      memo,
      amount,
      recurrenceInterval,
      nextTransferAt,
      completedAt
    );

    // Revoke Faktor permissions to transfer Alice's tokens.
    const token = new Token(
      provider.connection,
      WSOL_MINT,
      TOKEN_PROGRAM_ID,
      accounts.alice.keys
    );
    await token.revoke(accounts.alice.tokens, accounts.alice.keys.publicKey, [
      accounts.alice.keys,
    ]);
    await sleep(1000); // Wait 1s for the blockchain time to go past the nextTransferAt

    // Attempt to distribute the payment.
    const initialBalances = await getAccountBalances(accounts);
    const initialPaymentBalance = await getBalance(paymentAddress);
    const initialPayment = await program.account.payment.fetch(paymentAddress);
    const [transferLogAddress, transferLogBump] = await distributePayment(
      paymentAddress,
      initialPayment,
      accounts.dana.keys
    );

    // Validate payment data.
    const payment = await program.account.payment.fetch(paymentAddress);
    assert.ok(payment.idempotencyKey === idempotencyKey);
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
    assert.ok(payment.amount.toNumber() === amount);
    assert.ok(payment.recurrenceInterval.toNumber() === recurrenceInterval);
    assert.ok(payment.nextTransferAt.toNumber() === 0);
    assert.ok(payment.completedAt.toNumber() === completedAt);
    assert.ok(payment.bump === paymentBump);

    // Validate transfer log
    const transferLog = await program.account.transferLog.fetch(
      transferLogAddress
    );
    assert.ok(transferLog.payment.toString() === paymentAddress.toString());
    assert.ok(
      transferLog.distributor.toString() ===
        accounts.dana.keys.publicKey.toString()
    );
    assert.ok(Object.keys(transferLog.status)[0] === "failed");
    assert.ok(transferLog.bump === transferLogBump);

    // Validate SOL balances.
    const finalBalances = await getAccountBalances(accounts);
    const finalPaymentBalance = await getBalance(paymentAddress);
    assert.ok(finalBalances.alice.SOL === initialBalances.alice.SOL);
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(
      finalBalances.dana.SOL ===
        initialBalances.dana.SOL - RENT_TRANSFER_LOG + TRANSFER_FEE_DISTRIBUTOR
    );
    assert.ok(
      finalBalances.treasury.SOL ===
        initialBalances.treasury.SOL + TRANSFER_FEE_TREASURY
    );
    assert(
      finalPaymentBalance ===
        initialPaymentBalance - TRANSFER_FEE_DISTRIBUTOR - TRANSFER_FEE_TREASURY
    );

    // Validate wSOL balances.
    assert.ok(finalBalances.alice.wSOL === initialBalances.alice.wSOL);
    assert.ok(finalBalances.bob.wSOL === initialBalances.bob.wSOL);
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
