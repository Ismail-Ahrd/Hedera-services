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
  TokenType,
  TokenCreateTransaction,
  TopicId,
  TokenAssociateTransaction,
} = require("@hashgraph/sdk");
require("dotenv").config();
const myAccountId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const myPrivateKey = PrivateKey.fromStringED25519(process.env.MY_PRIVATE_KEY);
const client = Client.forTestnet();
client.setOperator(myAccountId, myPrivateKey);
async function main() {
  const newAccountPrivateKey = PrivateKey.generateED25519();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;
  const newAccount = await new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.from(100))
    .setMaxAutomaticTokenAssociations(2)
    .execute(client);

  // Get the new account ID
  const getReceipt = await newAccount.getReceipt(client);
  const newAccountId = getReceipt.accountId;

  let tokenCreateTx = new TokenCreateTransaction()
    .setTokenName("MyNFT")
    .setTokenSymbol("MNFT")
    .setTokenMemo("TestMemo")
    .setTokenType(TokenType.FungibleCommon)
    .setInitialSupply(10000)
    .setTreasuryAccountId(myAccountId)

    .freezeWith(client);

  //Sign with the feeScheduleKey and the AdminKey +TreasuryAccount

  let tokenCreateSubmit = await tokenCreateTx.execute(client);
  let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
  let tokenId = tokenCreateRx.tokenId;
  console.log(`Created Token with ID: ${tokenId}`);

  // we don't need this
  //   const associateTx = await (
  //     await new TokenAssociateTransaction()
  //       .setAccountId(newAccountId)
  //       .setTokenIds([tokenId])
  //       .freezeWith(client)
  //       .sign(newAccountPrivateKey)
  //   ).execute(client);
  //   console.log(
  //     "Transacion status " +
  //       (await associateTx.getReceipt(client)).status.toString()
  //   );

  // we can't send more than  5000 (>=), if we want to send more than 5000 we need to associate
  const tx = await new TransferTransaction()
    .addTokenTransfer(tokenId, newAccountId, 4999)
    .addTokenTransfer(tokenId, myAccountId, -4999)
    .execute(client);
  await getBalance(client, newAccountId);
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
    "The new account balance is: " + accountBalance.tokens + " tinybar."
  );

  return accountBalance.hbars.toTinybars();
}
main();
