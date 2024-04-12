console.clear();
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
const fs = require("fs");
const {
  AccountId,
  PrivateKey,
  Client,
  FileCreateTransaction,
  ContractCallQuery,
  ContractExecuteTransaction,
  ContractCreateTransaction,
  ContractFunctionParameters,
  ContractInfoQuery,
  Hbar,
  AccountCreateTransaction,
} = require("@hashgraph/sdk");

const operatorId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const operatorKey = PrivateKey.fromStringED25519(process.env.MY_PRIVATE_KEY);

const client = Client.forTestnet();
client.setOperator(operatorId, operatorKey);

async function deploySmartContract() {
  //Import the compiled contract from the HelloHedera.json file
  const rawdataTest = fs.readFileSync(`${__dirname}/HelloHedera.json`);
  const rawdataTestJSon = JSON.parse(rawdataTest);
  const bytecode = rawdataTestJSon.bytecode;

  //Create a file on Hedera and store the hex-encoded bytecode
  const fileCreateTx = new FileCreateTransaction()
    //Set the bytecode of the contract
    .setContents(bytecode);

  //Submit the file to the Hedera test network signing with the transaction fee payer key specified with the client
  const submitTx = await fileCreateTx.execute(client);

  //Get the receipt of the file create transaction
  const fileReceipt = await submitTx.getReceipt(client);

  //Get the file ID from the receipt
  const bytecodeFileId = fileReceipt.fileId;

  //Log the file ID
  console.log("The smart contract byte code file ID is " + bytecodeFileId);

  console.log("address", operatorId.toSolidityAddress().toString());

  // Instantiate the contract instance
  const contractTx = new ContractCreateTransaction()
    //Set the file ID of the Hedera file storing the bytecode
    .setBytecodeFileId(bytecodeFileId)
    //Set the gas to instantiate the contract
    .setGas(1000000)
    //Provide the constructor parameters for the contract
    .setConstructorParameters(
      new ContractFunctionParameters().addAddress(
        operatorId.toSolidityAddress()
      )
    );

  //Submit the transaction to the Hedera test network
  const contractResponse = await contractTx.execute(client);

  //Get the receipt of the file create transaction
  const contractReceipt = await contractResponse.getReceipt(client);

  //Get the smart contract ID
  const newContractId = contractReceipt.contractId;

  //Log the smart contract ID
  console.log("The smart contract ID is " + newContractId);
  return newContractId;
}

async function queryMessage(contractId) {
  const contractQuery = new ContractCallQuery()
    //Set the gas for the query
    .setGas(1000000)
    //Set the contract ID to return the request for
    .setContractId(contractId)
    //Set the contract function to call
    .setFunction("get_address")
    //Set the query payment for the node returning the request
    //This value must cover the cost of the request otherwise will fail
    .setQueryPayment(new Hbar(2));

  //Submit to a Hedera network
  const getMessage = await contractQuery.execute(client);

  // Get a string from the result at index 0
  const message = getMessage.getAddress(0).toString();

  //Log the message
  console.log("The contract message: " + message);
}

async function setMessage(contractId, accountId) {
  //Create the transaction to update the contract message
  const contractExecTx = new ContractExecuteTransaction()
    //Set the ID of the contract
    .setContractId(contractId)
    //Set the gas for the contract call
    .setGas(1000000)
    //Set the contract function to call
    .setFunction(
      "set_address",
      new ContractFunctionParameters().addAddress(accountId.toSolidityAddress())
    );

  //Submit the transaction to a Hedera network and store the response
  const submitExecTx = await contractExecTx.execute(client);

  //Get the receipt of the transaction
  const record = await submitExecTx.getRecord(client);
  console.log(
    "Updated message successfully",
    AccountId.fromSolidityAddress(record.contractFunctionResult.getAddress(0))
  );
}

async function getSmartContractInfo(contractId) {
  //Create the query
  const query = new ContractInfoQuery().setContractId(contractId);

  //Sign the query with the client operator private key and submit to a Hedera network
  const info = await query.execute(client);

  console.log(info);
}

async function main() {
  console.log("Create new account Key ---------------------");
  const newAccountPrivateKey = PrivateKey.generateED25519();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;

  console.log("Create Account  ---------------------");

  const newAccount = await new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.from(100))
    .execute(client);

  // Get the new account ID
  const getReceipt = await newAccount.getReceipt(client);
  const newAccountId = getReceipt.accountId;

  console.log("accountId is " + newAccountId);

  const contractId = await deploySmartContract();
  // await getSmartContractInfo(contractId);
  await queryMessage(contractId);
  //console.log(AccountId.fromString("0.0.2842147").toSolidityAddress().toString())
  await setMessage(contractId, newAccountId);
  await queryMessage(contractId);
  process.exit(0);
}

main();
