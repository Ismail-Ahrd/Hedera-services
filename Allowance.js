const {
  TransferTransaction,
  Hbar,
  Client,
  AccountId,
  AccountCreateTransaction,
  AccountAllowanceApproveTransaction,
  AccountBalanceQuery,
  PrivateKey,
  TransactionId,
  TokenInfoQuery,
  TokenId,
  TokenCreateTransaction,
  TokenType,
} = require("@hashgraph/sdk");
let account1Info = {};
let account2Info = {};
let account3Info = {};
function account1Details() {
  return account1Info;
}
function account2Details() {
  return account2Info;
}
function account3Details() {
  return account3Info;
}
require("dotenv").config();

const myAccountId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const myPrivateKey = PrivateKey.fromStringED25519(process.env.MY_PRIVATE_KEY);
const client = Client.forTestnet();
client.setOperator(myAccountId, myPrivateKey);
//client.setDefaultMaxTransactionFee(new Hbar(10));
async function createAccounts() {
  account1Info = await createAccount();
  account2Info = await createAccount();
  account3Info = await createAccount();
}
async function createAccount() {
  let accountInfo = {};
  // Create KeyPair
  let privateKey = await PrivateKey.generateED25519Async();
  let publicKey = privateKey.publicKey;
  accountInfo["PrivateKey"] = privateKey.toString();
  accountInfo["PublicKey"] = publicKey.toString();
  //Create a new account with 100 Hbar starting balance
  const newAccountTx = await new AccountCreateTransaction()
    .setKey(publicKey)
    .setInitialBalance(Hbar.from(100))
    .execute(client);
  //Request the receipt of the transaction
  const receipt = await newAccountTx.getReceipt(client);
  //Get the account ID
  accountInfo["accountId"] = receipt.accountId.toString();
  console.log("Newly Created Account : ", accountInfo.accountId);
  return accountInfo;
}

async function createAllowance() {
  await createAccounts();
  const tx = await new AccountAllowanceApproveTransaction()
    .approveHbarAllowance(
      account1Info.accountId,
      account2Info.accountId,
      new Hbar(40)
    )

    .freezeWith(client)
    .sign(PrivateKey.fromString(account1Info.PrivateKey));
  const allowanceSubmit = await tx.execute(client);
  return await allowanceSubmit.getReceipt(client);
}
async function spendAllowance() {
  const approvedSendTx = await new TransferTransaction()
    .addApprovedHbarTransfer(account1Info.accountId, new Hbar(-20))
.setMaxTransactionFee
    .addHbarTransfer(account3Info.accountId, new Hbar(20))
    // Mandatory  : the sender who must pay for the fees and not the client ( operator )
    // if the operator is the sender and has an approve we will use just execute and the operator automatically pays the fees
    .setTransactionId(TransactionId.generate(account2Info.accountId))
    .freezeWith(client)
    .sign(PrivateKey.fromString(account2Info.PrivateKey));
  let tx = await approvedSendTx.execute(client);
  try {
    const receipt = await tx.getReceipt(client);
    const transactionStatus = receipt.status;
    console.log("Transaction status is " + transactionStatus.toString());
    //Create the account balance query
  } catch (e) {
    console.log(e.message);
  }
  const query1 = new AccountBalanceQuery().setAccountId(account1Info.accountId);
  const query2 = new AccountBalanceQuery().setAccountId(account2Info.accountId);
  const query3 = new AccountBalanceQuery().setAccountId(myAccountId);
  //Submit the query to a Hedera network
  const accountBalance = await query1.execute(client);
  const accountBalance2 = await query2.execute(client);
  const accountBalance3 = await query3.execute(client);

  //Print the balance of hbars
  console.log("Account 1 balance is " + accountBalance.hbars);
  console.log("Account 2 balance is " + accountBalance2.hbars);
  console.log("Operator balance is " + accountBalance3.hbars);
  //return await approvedSendSubmit.getReceipt(client)
}
async function main() {
  await createAllowance();
  await spendAllowance();
  await spendAllowance();
  process.exit(0);
}

// async function createAccount(privateKey, accountName) {
//   const accountATx = await new AccountCreateTransaction()
//     .setKey(privateKey.publicKey)
//     .setInitialBalance(Hbar.from(100))
//     .execute(client);
//   const accountAId = (await accountATx.getReceipt(client)).accountId;

//   console.log("Account Id " + accountName + " : " + accountAId.toString());
//   return accountAId;
// }

// async function getBalance(accountId, accountName) {
//   const balance = await new AccountBalanceQuery()
//     .setAccountId(accountId)
//     .execute(client);
//   console.log(
//     "Balance of the account " +
//       accountName +
//       " is : " +
//       balance.hbars.toString()
//   );
//   return balance.hbars;
// }

main();
