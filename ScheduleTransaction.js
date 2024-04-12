const {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  AccountBalanceQuery,
  TransferTransaction,
  AccountId,
  Hbar,
  ScheduleInfoQuery,
  KeyList,
  ScheduleSignTransaction,
  ScheduleCreateTransaction,
} = require("@hashgraph/sdk");
require("dotenv").config();
const myAccountId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const myPrivateKey = PrivateKey.fromStringED25519(process.env.MY_PRIVATE_KEY);
const client = Client.forTestnet();
client.setOperator(myAccountId, myPrivateKey);

// Task 1
async function createSchedule() {
  // Création du compte A
  //   const receiverAccountPrivateKey = PrivateKey.generate();
  //   const receiverAccountPublicKey = receiverAccountPrivateKey.publicKey;

  // generate some keys
  const privateKey1 = PrivateKey.generateED25519();
  const publicKey1 = privateKey1.publicKey;
  const privateKey2 = PrivateKey.generateED25519();
  const publicKey2 = privateKey2.publicKey;
  const privateKey3 = PrivateKey.generateED25519();
  const publicKey3 = privateKey3.publicKey;
  // create a keylist
  const keyList = KeyList.from([publicKey1, publicKey2]);
  // add a key to a keylist
  keyList.push(publicKey3);
  keyList.setThreshold(2);
  const accountA = await new AccountCreateTransaction()
    .setKey(keyList)
    .setInitialBalance(Hbar.from(10)) // Solde initial du compte A
    .execute(client);

  const rec1 = await accountA.getReceipt(client);
  const senderAccountId = rec1.accountId;
  console.log("Compte d'envoie créé : " + senderAccountId);

  const nodeId = [];
  nodeId.push(new AccountId(4)); // node where the transaction will be sent after submission (.execute)

  // const nodeId = new AccountId();
  const memo = "Sheduling - 54";
  //Create a transaction to schedule

  // Transaction not sent yet , it must be signed ,but at least with 2 private keys from the predefined List of keys of the
  const transferTransaction = new TransferTransaction()
    .addHbarTransfer(myAccountId, 1)
    .addHbarTransfer(senderAccountId, -1)
    .schedule()
    .setScheduleMemo(memo)
    //required for scheduled transactions
    .setNodeAccountIds(nodeId);

  const transaction = transferTransaction.freezeWith(client);

  //Serialization and base64 Encoding
  const serializedTx = transaction.toBytes();
  const txBase64 = Buffer.from(serializedTx).toString("base64");

  // Decode 1
  const transactionRebuiltRaw = Buffer.from(txBase64, "base64");
  const transactionRebuilt = TransferTransaction.fromBytes(
    transactionRebuiltRaw
  );

  //if we sign by <2  the transaction will fail but status == Success
  const signedTransaction = await transactionRebuilt
    .addSignature(publicKey1, privateKey1.signTransaction(transaction))
    .addSignature(publicKey2, privateKey2.signTransaction(transaction))
    .addSignature(publicKey3, privateKey3.signTransaction(transaction))
    .execute(client);

  const accountABalance2 = await new AccountBalanceQuery()
    .setAccountId(senderAccountId)
    .execute(client);

  console.log("Balance du compte d'envoi=", accountABalance2.hbars.toString());

  const txResponse = await signedTransaction.execute(client);
  const receipt = await txResponse.getReceipt(client);

  console.log(
    `TX ${txResponse.transactionId.toString()} status: ${receipt.status}`
  );
  console.log(`scheduleId ${receipt.scheduleId.toString()}`);

  const accountABalance = await new AccountBalanceQuery()
    .setAccountId(senderAccountId)
    .execute(client);

  console.log("Balance du compte d'envoi'", accountABalance.hbars.toString());

  console.log("//////////////////////////////////////");
  console.log("Another way to create a scheduled transaction");

  // must not add freeze
  const transferTransaction2 = new TransferTransaction()
    .addHbarTransfer(myAccountId, 1)
    .addHbarTransfer(senderAccountId, -1);

  const transaction2 = await new ScheduleCreateTransaction()
    .setScheduledTransaction(transferTransaction2)
    //By default the payer is the creator of the ScheduleTransaction in this case the operator
    .setPayerAccountId(senderAccountId)
    .setNodeAccountIds
    .execute(client);
  const scheduleId = (await transaction2.getReceipt(client)).scheduleId;
  console.log("ScheduledId : ", scheduleId.toString());
  await getBalance(client, senderAccountId);

  const signTransaction = await new ScheduleSignTransaction()
    .setScheduleId(scheduleId)
    .freezeWith(client)
    .sign(privateKey1);

  //Sign with the client operator key to pay for the transaction and submit to a Hedera network
  await signTransaction.execute(client);
  await getBalance(client, senderAccountId);
  const signTransaction2 = await new ScheduleSignTransaction()
    .setScheduleId(scheduleId)
    .freezeWith(client)
    .sign(privateKey2);
  await getBalance(client, myAccountId);
  //Sign with the client operator key to pay for the transaction and submit to a Hedera network
  await signTransaction2.execute(client);

  setTimeout(async () => {
    await getBalance(client, senderAccountId);
    await getBalance(client, myAccountId);
  }, 2000);
}
async function getBalance(client, accountId) {
  const accountBalance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);
  console.log("The  balance is: " + accountBalance.hbars.toString());

  return accountBalance.hbars.toTinybars();
}
createSchedule();
