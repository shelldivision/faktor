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
const PROGRAM_AUTHORITY_SEED = "program_authority";
const TREASURY_SEED = "treasury";

describe("faktor", () => {
  // Test environment
  var programAuthority;
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
        "payment",
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
    balance,
    deltaBalance,
    deltaTime,
    factorableBalance
  ) {
    await program.rpc.createPayment(
      memo,
      new BN(balance),
      new BN(deltaBalance),
      new BN(deltaTime),
      new BN(factorableBalance),
      accounts.payment.bump,
      {
        accounts: {
          payment: accounts.payment.keys.publicKey,
          sender: accounts.alice.keys.publicKey,
          senderTokens: accounts.alice.tokens,
          receiver: accounts.bob.keys.publicKey,
          receiverTokens: accounts.bob.tokens,
          mint: WSOL_MINT,
          programAuthority: programAuthority,
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
        sender: accounts.alice.keys.publicKey,
        senderTokens: accounts.alice.tokens,
        receiver: accounts.bob.keys.publicKey,
        receiverTokens: accounts.bob.tokens,
        distributor: accounts.dana.keys.publicKey,
        programAuthority: programAuthority,
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
    const [_programAuthority, programAuthorityBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [PROGRAM_AUTHORITY_SEED],
        program.programId
      );
    programAuthority = _programAuthority;
    const [_treasury, treasuryBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [TREASURY_SEED],
        program.programId
      );
    treasury = _treasury;
    await program.rpc.initializeProgram(programAuthorityBump, treasuryBump, {
      accounts: {
        programAuthority: programAuthority,
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
    const balance = 1000;
    const deltaBalance = 100;
    const deltaTime = 50;
    const factorableBalance = 50;
    await createPayment(
      accounts,
      memo,
      balance,
      deltaBalance,
      deltaTime,
      factorableBalance
    );

    // Validate payment data.
    let expectedRent = 2449920;
    let expectedTransferFee =
      (balance / deltaBalance) *
      (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY);

    const payment = await program.account.payment.fetch(
      accounts.payment.keys.publicKey
    );
    assert.ok(payment.memo === "Abc");
    assert.ok(
      payment.sender.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment.receiver.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(payment.balance.toNumber() === balance);
    assert.ok(payment.deltaBalance.toNumber() === deltaBalance);
    assert.ok(payment.deltaTime.toNumber() === deltaTime);
    assert.ok(payment.factorableBalance.toNumber() === factorableBalance);

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

  it("Alice approves additional payment to Bob.", async () => {
    // Setup
    const accounts = await createAccounts();
    const memo = "Abc";
    const balance = 1000;
    const deltaBalance = 100;
    const deltaTime = 50;
    const factorableBalance = 50;
    await createPayment(
      accounts,
      memo,
      balance,
      deltaBalance,
      deltaTime,
      factorableBalance
    );

    // Test
    const initialBalances = await getBalances(accounts);
    const additionalBalance = 500;
    await program.rpc.approvePayment(new BN(additionalBalance), {
      accounts: {
        payment: accounts.payment.keys.publicKey,
        sender: accounts.alice.keys.publicKey,
        senderTokens: accounts.alice.tokens,
        receiver: accounts.bob.keys.publicKey,
        programAuthority: programAuthority,
        systemProgram: SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      },
      signers: [accounts.alice.keys],
    });

    // Validate payment data.
    let expectedTransferFee =
      (additionalBalance / deltaBalance) *
      (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_TREASURY);
    const payment = await program.account.payment.fetch(
      accounts.payment.keys.publicKey
    );
    assert.ok(payment.memo === "Abc");
    assert.ok(
      payment.sender.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment.receiver.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(payment.balance.toNumber() === balance + additionalBalance);
    assert.ok(payment.deltaBalance.toNumber() === deltaBalance);
    assert.ok(payment.deltaTime.toNumber() === deltaTime);
    assert.ok(payment.factorableBalance.toNumber() === factorableBalance);

    // Validate SOL balances.
    const finalBalances = await getBalances(accounts);
    assert.ok(
      finalBalances.alice.SOL ===
        initialBalances.alice.SOL - expectedTransferFee
    );
    assert.ok(finalBalances.bob.SOL === initialBalances.bob.SOL);
    assert.ok(finalBalances.charlie.SOL === initialBalances.charlie.SOL);
    assert.ok(finalBalances.dana.SOL === initialBalances.dana.SOL);
    assert.ok(
      finalBalances.payment.SOL ===
        initialBalances.payment.SOL + expectedTransferFee
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
    const balance = 1000;
    const deltaBalance = 100;
    const deltaTime = 50;
    const factorableBalance = 50;
    await createPayment(
      accounts,
      memo,
      balance,
      deltaBalance,
      deltaTime,
      factorableBalance
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
      payment.sender.toString() === accounts.alice.keys.publicKey.toString()
    );
    assert.ok(
      payment.receiver.toString() === accounts.bob.keys.publicKey.toString()
    );
    assert.ok(payment.balance.toNumber() === balance - deltaBalance);
    assert.ok(payment.deltaBalance.toNumber() === deltaBalance);
    assert.ok(payment.deltaTime.toNumber() === deltaTime);
    assert.ok(payment.factorableBalance.toNumber() === factorableBalance);

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
    assert.ok(
      finalBalances.alice.wSOL === initialBalances.alice.wSOL - deltaBalance
    );
    assert.ok(
      finalBalances.bob.wSOL === initialBalances.bob.wSOL + deltaBalance
    );
    assert.ok(finalBalances.charlie.wSOL === initialBalances.charlie.wSOL);
    assert.ok(finalBalances.dana.wSOL === initialBalances.dana.wSOL);
  });
});
