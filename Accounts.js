//ACCOUNT ED25519
//ACCOUNT ECDSA : must be used only with smart contracts

const {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
  TransferTransaction,
  AccountId,
} = require("@hashgraph/sdk");
require("dotenv").config();

function getOperatorKeys() {
  //Grab your Hedera testnet account ID and private key from your .env file
  const myAccountId = process.env.MY_ACCOUNT_ID;
  const myPrivateKey = process.env.MY_PRIVATE_KEY;

  // If we weren't able to grab it, we should throw a new error
  if (!myAccountId || !myPrivateKey) {
    throw new Error(
      "Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present"
    );
  }
  return { myAccountId, myPrivateKey };
}

function getClient(myAccountId, myPrivateKey) {
  //Create your Hedera Testnet client
  const client = Client.forTestnet();
  //Set your account as the client's operator
  client.setOperator(myAccountId, myPrivateKey);

  //Set the default maximum transaction fee (in Hbar)
  client.setDefaultMaxTransactionFee(new Hbar(100));

  //Set the maximum payment for queries (in Hbar)
  client.setDefaultMaxQueryPayment(new Hbar(100));
  return client;
}

async function createAccount(client, publicKey, initialBalance) {
  //Create a new account with 1,000 tinybar starting balance
  const newAccount = await new AccountCreateTransaction()
    .setKey(publicKey)
    .setInitialBalance(Hbar.fromTinybars(initialBalance))
    .execute(client);

  // Get the new account ID
  const getReceipt = await newAccount.getReceipt(client);
  const newAccountId = getReceipt.accountId;

  //Log the account ID
  console.log("The new account ID is: " + newAccountId);
  return newAccountId;
}

async function getBalance(client, accountId) {
  //Request the cost of the query
  //   const queryCost = await new AccountBalanceQuery()
  //     .setAccountId(newAccountId)
  //     .getCost(client);

  //   console.log("The cost of query is: " + queryCost);
  const accountBalance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);
  console.log(
    "The new account balance is: " +
      accountBalance.hbars.toTinybars() +
      " tinybar."
  );

  return accountBalance.hbars.toTinybars();
}

async function transfer(
  client,
  accountIdSender,
  senderKey,
  accountIdReceiver,
  amount
) {
  //Create the transfer transaction
  const transferTx = new TransferTransaction()

    .addHbarTransfer(accountIdSender, Hbar.fromTinybars(-amount))
    .addHbarTransfer(accountIdReceiver, Hbar.fromTinybars(amount))
    .freezeWith(client);

  // const signTx = await transferTx.sign(senderKey);
  const executeTx = await transferTx.execute(client);
  //Verify the transaction reached consensus
  //  const transactionR = await executeTx.getRecord(client);
  const transactionReceipt = await executeTx.getReceipt(client);
  console.log(
    "The transfer transaction from my account to the new account was: " +
      transactionReceipt.status.toString()
  );
}
async function environmentSetup() {
  const { myAccountId, myPrivateKey } = getOperatorKeys();

  const client = getClient(myAccountId, myPrivateKey);

  //Create new keys for an account
  const newAccountPrivateKey = PrivateKey.generateED25519();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;
  //Create a new account with 1,000 tinybar starting balance
  const newAccountId = await createAccount(client, newAccountPublicKey, 1000);

  //Verify the account balance

  const accountBalance = await getBalance(client, newAccountId);

  await transfer(client, myAccountId, myPrivateKey, newAccountId, 1000);
}
environmentSetup();
