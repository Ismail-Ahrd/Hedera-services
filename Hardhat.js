// Hardhat deploy script:
const { ethers } = require("hardhat");

async function main() {
  const HelloHedera = await ethers.getContractFactory("HelloHedera");

  const adressArgument = process.env.EVM_ADDRESS;

  const helloHedera = await HelloHedera.deploy(adressArgument);

  console.log("HelloHedera deployed to:", helloHedera.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// getMessage script

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const contractAddress = process.env.CONTRACT_ADDRESS;

  const helloHederaContract = await ethers.getContractAt(
    "HelloHedera",
    contractAddress
  );

  const message = await helloHederaContract.getMessage();
  console.log("Current message:", message);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//   set message script:
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const helloHederaContract = await ethers.getContractAt(
    "HelloHedera",
    contractAddress
  );
  const newMessage = "New Hello, Hedera!";
  const transaction = await helloHederaContract
    .connect(deployer)
    .setMessage(newMessage);
  await transaction.wait();
  console.log("Message set successfully!");

  const updatedMessage = await helloHederaContract.getMessage();
  console.log("Updated message:", updatedMessage);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// ethersjs, solidjs dapp

import { createEffect, createSignal, onCleanup } from "solid-js";
import { ethers } from "ethers";
import { JsonABI } from "./abi";

const App = () => {
  // Initialisation des variables
  const [provider, setProvider] = createSignal(null);
  const [wallet, setWallet] = createSignal(null);
  const [contract, setContract] = createSignal(null);
  const [message, setMessageText] = createSignal("");
  const [messageGetted, setMessageGetted] = createSignal("");
  // Initialisation du contrat avec l'interface ABI
  const initContract = async () => {
    try {
      console.log("Hello");
      const providerr = new ethers.JsonRpcProvider({
        url: "https://testnet.hashio.io/api",
      });
      const provider = new ethers.providers.JsonRpcProvider({
        url: "https://testnet.hashio.io/api",
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
      console.log(provider);
      const wallet = new ethers.Wallet(
        "0xe5d3730c3829588ea51d56cc00b6f5ebdc36ff2cc99547c680507d09ab50e948",
        provider
      );
      const contract = new ethers.Contract(
        "0x0bb8804312ea7c456a55cead0af66931290e4718",
        JsonABI,
        wallet
      );
      console.log(contract);
      setProvider(provider);
      setWallet(wallet);
      setContract(contract);
    } catch (error) {
      console.error("Erreur lors de l'initialisation du contrat :", error);
    }
  };

  // Appel de la fonction getMessage du contrat
  const getMessage = async () => {
    try {
      const message = await contract().getMessage();
      setMessageGetted(message);
      console.log("Message du contrat :", message);
    } catch (error) {
      console.error("Erreur lors de l'appel de getMessage :", error);
    }
  };

  // Appel de la fonction setMessage du contrat
  const setMessage = async () => {
    try {
      // Remplacez "Nouveau message" par le message que vous souhaitez définir
      await contract().setMessage(message(), { gasLimit: 300000 });
      setMessageText("");

      console.log("setMessage appelé avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'appel de setMessage :", error);
    }
  };

  // Appel de la fonction d'initialisation du contrat au chargement de la page
  createEffect(() => {
    initContract();
  });

  return (
    <div id="content">
      <input type="text" value={messageGetted()} />
      <button onClick={getMessage}>Get Message()</button>
      <br />
      <input
        type="text"
        value={message()}
        onChange={(e) => setMessageText(e.target.value)}
      />
      <button onClick={setMessage}>Set Message()</button>
    </div>
  );
};

export default App;
