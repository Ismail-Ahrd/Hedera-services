const {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
  TopicInfoQuery,
  TopicUpdateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  AccountCreateTransaction,
} = require("@hashgraph/sdk");

require("dotenv").config();
const operatorId = process.env.MY_ACCOUNT_ID;
const operatorKey = process.env.MY_PRIVATE_KEY;
const client = Client.forTestnet().setOperator(operatorId, operatorKey);

async function main() {
  console.log("Create Keys---------------------");

  const adminKey = PrivateKey.generateED25519();

  const submitKey = PrivateKey.generateED25519();

  console.log("Create Topic---------------------");

  let topicCreationTx = new TopicCreateTransaction()
    .setTopicMemo("Test")
    .setAdminKey(adminKey.publicKey)
    .setSubmitKey(submitKey.publicKey)
    .freezeWith(client);
  //Get the admin key from the transaction
  const topicAdminKey = topicCreationTx.getAdminKey();
  let signTopicCreationTxwithAdminKey = await topicCreationTx.sign(adminKey);
  // Optional , we can create a topic without signing with the submit key
  let signTopicCreationTxwithSubmitKey =
    await signTopicCreationTxwithAdminKey.sign(submitKey);

  let executeTopicCreationTx = await signTopicCreationTxwithSubmitKey.execute(
    client
  );
  let topicCreationReceipt = await executeTopicCreationTx.getReceipt(client);
  let topicId = topicCreationReceipt.topicId;
  console.log(`Your topic ID is: ${topicId}`);

  console.log("Topic Info---------------------");

  const query = new TopicInfoQuery().setTopicId(topicId);

  const info = await query.execute(client);

  console.log(info);

  console.log("Update Topic Admin Key---------------------"); // we should sign the transaction with the older and the new admin key

  const newAdminKey = PrivateKey.generateECDSA();
  const topicUpdateTx = new TopicUpdateTransaction()
    .setTopicId(topicId)
    .setAdminKey(newAdminKey)
    .freezeWith(client);
  const signTopicUpdateTxWithOlderAdminKey = await topicUpdateTx.sign(adminKey);
  const signTopicUpdateTxWithNewAdminKey =
    await signTopicUpdateTxWithOlderAdminKey.sign(newAdminKey);

  const topicUpdateTxResponse = await signTopicUpdateTxWithNewAdminKey.execute(
    client
  );

  const topicUpdateReceipt = await topicUpdateTxResponse.getReceipt(client);

  const transactionStatus = topicUpdateReceipt.status.toString();

  console.log("The transaction consensus status is " + transactionStatus);

  console.log("Update Topic Memo---------------------"); // we should use the new admin key

  const topicUpdate2Txt = new TopicUpdateTransaction()
    .setTopicId(topicId)
    .setTopicMemo("Test2")
    .freezeWith(client);
  const signTopicUpdate2TxtWithAdminKey = await topicUpdate2Txt.sign(
    newAdminKey
  );
  const executeTopicUpdate2Txt = await signTopicUpdate2TxtWithAdminKey.execute(
    client
  );
  console.log("New Topic Info---------------------");

  const query2 = new TopicInfoQuery().setTopicId(topicId);

  const info2 = await query2.execute(client);

  console.log(info2);

  console.log("Topic Submit message---------------------");

  // let sendResponse = new TopicMessageSubmitTransaction({
  //   topicId: topicId,
  //   message: "Hello, World!",
  // }).freezeWith(client);

  let sendResponse = new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage("Hello")
    .freezeWith(client);

  const signWithSubmitKey = await sendResponse.sign(submitKey);
  const execute = await signWithSubmitKey.execute(client);
  const getReceipt = await execute.getReceipt(client);

  let sendResponse2 = new TopicMessageSubmitTransaction({
    topicId: topicId,
    message: "Hello, World! 2",
  }).freezeWith(client);

  const signWithSubmitKey2 = await sendResponse2.sign(submitKey);
  const execute2 = await signWithSubmitKey2.execute(client);
  const getReceipt2 = await execute2.getReceipt(client);

  console.log(
    "The message transaction status: " + getReceipt2.status.toString()
  );

  console.log("Get Topic message---------------------");

  new TopicMessageQuery()
    .setTopicId(topicId)
    .setStartTime(0) // time to start subscribing

    //.setLimit(2)  //we will receive only 2 messages from the canal,
    .subscribe(client, (message) => {
      let messageAsString = Buffer.from(message.contents, "utf8").toString();
      console.log(`Received: ${messageAsString}`);
      // process.exit();
    });

  let sendResponse3 = new TopicMessageSubmitTransaction({
    topicId: topicId,
    message: "Hello, World! 3",
  }).freezeWith(client);

  const signWithSubmitKey3 = await sendResponse3.sign(submitKey);
  const execute3 = await signWithSubmitKey3.execute(client);
  const getReceipt3 = await execute3.getReceipt(client);

  console.log(
    "The message transaction status: " + getReceipt3.status.toString()
  );
}
main();
