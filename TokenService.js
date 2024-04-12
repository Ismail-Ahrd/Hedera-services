const {
  Client,
  AccountId,
  PrivateKey,
  AccountCreateTransaction,
  Hbar,
  TransferTransaction,
  TokenAssociateTransaction,
  TokenMintTransaction,
  TokenUpdateTransaction,
  TokenCreateTransaction,
  TokenFeeScheduleUpdateTransaction,
  TokenType,
  TokenSupplyType,
  CustomRoyaltyFee,
  TokenInfoQuery,
  AccountBalanceQuery,
  CustomFixedFee,
  TokenId,
} = require("@hashgraph/sdk");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const operatorAccountId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const operatorAccountKey = PrivateKey.fromStringED25519(
  process.env.MY_PRIVATE_KEY
);

const client = Client.forTestnet();
client.setOperator(operatorAccountId, operatorAccountKey);

async function showAccountBalance(initialBalance, accountId, accountName) {
  const balanceQuery = new AccountBalanceQuery().setAccountId(accountId);
  const accountBalance = await balanceQuery.execute(client);
  console.log(
    "\x1b[31m%s\x1b[0m",
    "Account balance for account " +
      accountName +
      " is now = " +
      accountBalance.tokens
  );
  if (initialBalance == 0) initialBalance = accountBalance.hbars.toBigNumber();
  else
    console.log(
      "\x1b[31m%s\x1b[0m",
      "Difference from initial " +
        (accountBalance.hbars.toBigNumber() - initialBalance)
    );
  return accountBalance.hbars.toBigNumber();
}

async function main() {
  const initialBalanceOperatorAccount = await showAccountBalance(
    0,
    operatorAccountId,
    "operator"
  );

  console.log(
    "--------------------- Create Account B & C keys ---------------------"
  );
  const accountBCprivateKey = PrivateKey.generateED25519();
  const accountBCpublicKey = accountBCprivateKey.publicKey;

  console.log(
    "--------------------- Create Account B with 100 Hbar starting balance ---------------------"
  );

  const accountB = await new AccountCreateTransaction()
    .setKey(accountBCpublicKey)
    .setInitialBalance(Hbar.from(100))

    .execute(client);

  // Get the new account ID
  const getReceipt = await accountB.getReceipt(client);
  const accountBId = getReceipt.accountId;

  console.log("Account B Id = ", accountBId.toString());
  await showAccountBalance(
    initialBalanceOperatorAccount,
    operatorAccountId,
    "operator"
  );
  const initialBalanceAccountB = await showAccountBalance(0, accountBId, "B");

  console.log(
    "--------------------- Create Account C with 100 Hbar starting balance ---------------------"
  );

  const accountC = await new AccountCreateTransaction()
    .setKey(accountBCpublicKey)
    .setInitialBalance(Hbar.from(100))
    .execute(client);

  // Get the new account ID
  const getReceipt1 = await accountC.getReceipt(client);
  const accountCid = getReceipt1.accountId;

  console.log("account C Id =", accountCid.toString());
  await showAccountBalance(
    initialBalanceOperatorAccount,
    operatorAccountId,
    "operator"
  );
  const initialBalanceAccountC = await showAccountBalance(0, accountCid, "C");

  console.log("--------------------- Create Fee Key---------------------");
  //Create feeScheduleKey
  const feeScheduleKey = PrivateKey.generateED25519();
  const adminKey = PrivateKey.generateED25519();

  console.log(
    "--------------------- Create CustomRoyaltyFee---------------------"
  );
  //Create a royalty fee

  const firstFee = new CustomRoyaltyFee()
    .setNumerator(5) // The numerator of the fraction
    .setDenominator(100)
    .setFeeCollectorAccountId(operatorAccountId); // The denominator of the fraction; // The account that will receive the royalty fee

  console.log("--------------------- CreateNFT ---------------------");
  let tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName("MyNFT")
    .setTokenSymbol("MNFT")
    .setTokenMemo("TestMemo")
    .setTokenType(TokenType.NonFungibleUnique)
    .setMaxTransactionFee(100)
    .setInitialSupply(0)
    .setTreasuryAccountId(operatorAccountId)
    .setSupplyType(TokenSupplyType.Finite) // finite number of nfs that we can mint , infinite : we will not specify maxSupply
    .setMaxSupply(5) // we can mint only 5 NFTS
    .setSupplyKey(operatorAccountKey)
    .setCustomFees([firstFee])
    .setFeeScheduleKey(feeScheduleKey)
    .setAdminKey(adminKey)
    .freezeWith(client);

  //Sign with the feeScheduleKey and the AdminKey +TreasuryAccount
  let tokenCreateSign = await tokenCreateTx.sign(feeScheduleKey);
  let tokenCreateSign2 = await tokenCreateSign.sign(adminKey);
  let tokenCreateSubmit = await tokenCreateSign2.execute(client);
  let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
  let tokenId = tokenCreateRx.tokenId;
  console.log(`Created NFT collection with ID: ${tokenId}`);
  await showAccountBalance(
    initialBalanceOperatorAccount,
    operatorAccountId,
    "operator"
  );

  console.log(
    "--------------------- Get NFT Collection info------------------"
  );
  //Returns the info for the specified NFT ID
  const nftInfos = await new TokenInfoQuery()
    .setTokenId(tokenId)
    .execute(client);

  console.log("nftInfos tokenId=", nftInfos.tokenId.toString());

  console.log("--------------------- Update NFT ------------------");
  //Create the transaction and freeze for manual signing
  const tokenUpdateTx = new TokenUpdateTransaction()
    .setTokenId(tokenId)
    .setTokenMemo("test2")
    .freezeWith(client);

  //Sign the transaction with the admin key
  const signTokenUpdateTx = await tokenUpdateTx.sign(adminKey);

  //Submit the signed transaction to a Hedera network
  const tokenUpdateResponse = await signTokenUpdateTx.execute(client);

  //Request the receipt of the transaction
  const tokenUpdateReceipt = await tokenUpdateResponse.getReceipt(client);

  //Get the transaction consensus status
  const tokenUpdateTxStatus = tokenUpdateReceipt.status.toString();

  console.log("The transaction consensus status is " + tokenUpdateTxStatus);

  console.log("--------------------- Get NFT info ------------------");
  //Returns the info for the specified NFT ID
  const nftInfos2 = await new TokenInfoQuery()
    .setTokenId(tokenId)
    .execute(client);

  console.log("nftInfos memo=", nftInfos2.tokenMemo.toString());

  console.log("--------------------- Mint 2 NFTs ------------------");
  //Mint 2 NFTs
  const tokenMintTx = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata([Buffer.from("firstToken"), Buffer.from("secondToken")])
    .freezeWith(client);

  //Submit the transaction to a Hedera network, the transaction must be signed by the supply key in this case = operator key
  const tokenMintResponse = await tokenMintTx.execute(client);

  //Request the receipt of the transaction
  const tokenMintReceipt = await tokenMintResponse.getReceipt(client);

  //Get the transaction consensus status
  const tokenMintTxStatus = tokenMintReceipt.status;

  console.log(
    "The transaction consensus status " + tokenMintTxStatus.toString()
  );
  await showAccountBalance(
    initialBalanceOperatorAccount,
    operatorAccountId,
    "operator"
  );

  console.log(
    "--------------------- Associate Token with Account B ------------------"
  );
  //Associate a token to an account and freeze the unsigned transaction for signing
  const associateTokenTx = new TokenAssociateTransaction()
    .setAccountId(accountBId)
    .setTokenIds([tokenId])
    .freezeWith(client);

  //Sign with the private key of the account that is being associated to a token
  const associateTokenTxSign = await associateTokenTx.sign(accountBCprivateKey);

  //Submit the transaction to a Hedera network
  const associateTokenTxResponse = await associateTokenTxSign.execute(client);

  //Request the receipt of the transaction
  const associateTokenTxReceipt = await associateTokenTxResponse.getReceipt(
    client
  );

  //Get the transaction consensus status
  const associateTokenTxStatus = associateTokenTxReceipt.status;

  console.log(
    "The transaction consensus status " + associateTokenTxStatus.toString()
  );

  console.log(
    "--------------------- Associate Token with Account C ------------------"
  );
  //Associate a token to an account and freeze the unsigned transaction for signing
  const associateTokenTx2 = new TokenAssociateTransaction()
    .setAccountId(accountCid)
    .setTokenIds([tokenId])
    .freezeWith(client);

  //Sign with the private key of the account that is being associated to a token
  const associateTokenTxSign2 = await associateTokenTx2.sign(
    accountBCprivateKey
  );

  //Submit the transaction to a Hedera network
  const associateTokenTxResponse2 = await associateTokenTxSign2.execute(client);

  //Request the receipt of the transaction
  const associateTokenTxReceipt2 = await associateTokenTxResponse2.getReceipt(
    client
  );

  //Get the transaction consensus status
  const associateTokenTxStatus2 = associateTokenTxReceipt2.status;

  console.log(
    "The transaction consensus status " + associateTokenTxStatus2.toString()
  );

  console.log(
    "--------------------- Transfer NFTs from Operator to  Account B (no royalties) ------------------"
  );
  let tokenTransferTx = new TransferTransaction()
    .addNftTransfer(tokenId, 1, operatorAccountId, accountBId)
    .addNftTransfer(tokenId, 2, operatorAccountId, accountBId)

    .addHbarTransfer(accountBId, new Hbar(-50))
    .addHbarTransfer(operatorAccountId, new Hbar(50))
    .freezeWith(client);

  let tokenTransferTxSign = await tokenTransferTx.sign(accountBCprivateKey);
  let tokenTransferTxResponse = await tokenTransferTxSign.execute(client);

  let tokenTransferTxReceipt = await tokenTransferTxResponse.getReceipt(client);
  let record = await tokenTransferTxResponse.getRecord(client);
  TokenType.FungibleCommon;
  console.log("NFT transfer", tokenTransferTxReceipt.status.toString());
  await showAccountBalance(
    initialBalanceOperatorAccount,
    operatorAccountId,
    "operator"
  );
  await showAccountBalance(initialBalanceAccountB, accountBId, "B");

  console.log(
    "--------------------- Transfer NFT from  Account B to  Account C (royalties for Operator) ------------------"
  );
  let tokenTransferTx2 = new TransferTransaction()
    .addNftTransfer(tokenId, 1, accountBId, accountCid)
    .addHbarTransfer(accountCid, new Hbar(-50))
    .addHbarTransfer(accountBId, new Hbar(50))
    .freezeWith(client);

  let tokenTransferTx2Sign = await tokenTransferTx2.sign(accountBCprivateKey);
  let tokenTransferTx2Response = await tokenTransferTx2Sign.execute(client);

  let tokenTransferTx2Receipt = await tokenTransferTx2Response.getReceipt(
    client
  );

  await showAccountBalance(
    initialBalanceOperatorAccount,
    operatorAccountId,
    "operator"
  );
  await showAccountBalance(initialBalanceAccountB, accountBId, "B");
  await showAccountBalance(initialBalanceAccountC, accountCid, "C");

  console.log("NFT transfer status", tokenTransferTx2Receipt.status.toString());

  // console.log("--------------------- Update Custom Fees ---------------------");

  firstFee.setNumerator(10);
  //Create the transaction and freeze for manual signing
  const tokenUpdateTx2 = new TokenFeeScheduleUpdateTransaction()
    .setTokenId(tokenId)
    .setCustomFees([firstFee])
    .freezeWith(client);

  //Sign the transaction with the admin key
  const signTokenUpdateTx2 = await tokenUpdateTx2.sign(feeScheduleKey);

  //Submit the signed transaction to a Hedera network
  const tokenUpdateResponse2 = await signTokenUpdateTx2.execute(client);

  //Request the receipt of the transaction
  const tokenUpdateReceipt2 = await tokenUpdateResponse2.getReceipt(client);

  //Get the transaction consensus status
  const tokenUpdateTxStatus2 = tokenUpdateReceipt2.status.toString();

  console.log("The transaction consensus status is " + tokenUpdateTxStatus2);

  console.log(
    "NFT transfer status is ",
    tokenTransferTxReceipt.status.toString()
  );
  console.log(
    "--------------------- Transfer NFT #2 from Account C to operator Account (royalties for Operator) ------------------"
  );
  let tokenTransferTx3 = new TransferTransaction()
    .addNftTransfer(tokenId, 1, accountCid, operatorAccountId)
    .addHbarTransfer(operatorAccountId, new Hbar(-50))
    .addHbarTransfer(accountCid, new Hbar(50))
    .freezeWith(client);

  let tokenTransferTx3Sign = await tokenTransferTx3.sign(accountBCprivateKey);
  let tokenTransferTx3Response = await tokenTransferTx3Sign.execute(client);

  let tokenTransferTx3Receipt = await tokenTransferTx3Response.getReceipt(
    client
  );

  console.log(
    "NFT transfer status is ",
    tokenTransferTx3Receipt.status.toString()
  );

  await showAccountBalance(
    initialBalanceOperatorAccount,
    operatorAccountId,
    "operator"
  );
  await showAccountBalance(initialBalanceAccountB, accountBId, "B");
  await showAccountBalance(initialBalanceAccountC, accountCid, "C");

  process.exit(0);
}

main();
