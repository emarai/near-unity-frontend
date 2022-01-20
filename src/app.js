import "./app.css";
import { Fragment, useEffect, useState } from "react";
import Unity, { UnityContext } from "react-unity-webgl";
import * as nearAPI from 'near-api-js';

const contractId = 'dev-1631277489384-75412609538902'

// This is the context that Unity will use to communicate with the React app.
const unityContext = new UnityContext({
  productName: "Near Unity WebGL Connection example",
  companyName: "Paras",
  // The url's of the Unity WebGL runtime, these paths are public and should be
  // accessible from the internet and relative to the index.html.
  loaderUrl: "build/build.loader.js",
  dataUrl: "build/build.data",
  frameworkUrl: "build/build.framework.js",
  codeUrl: "build/build.wasm",
  streamingAssetsUrl: "build/streamingassets",
  // Additional configuration options.
  webglContextAttributes: {
    preserveDrawingBuffer: true,
  },
});

// Initializing contract
async function initContract() {
  // get network configuration values from config.js
  // based on the network ID we pass to getConfig()
  const nearConfig = {
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    contractName: contractId,
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
    headers: {}
  }

  // create a keyStore for signing transactions using the user's key
  // which is located in the browser local storage after user logs in
  const keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore()

  // Initializing connection to the NEAR testnet
  const near = await nearAPI.connect({
    deps: {
      keyStore: keyStore
    },
    ...nearConfig
  });

  // Initialize wallet connection
  const walletConnection = new nearAPI.WalletConnection(near, '');

  // Load in user's account data
  let currentUser;
  if (walletConnection.getAccountId()) {
    currentUser = {
      // Gets the accountId as a string
      accountId: walletConnection.getAccountId(),
      // Gets the user's token balance
      balance: (await walletConnection.account().state()).amount,
    };
  }

  const contract = new nearAPI.Contract(
    walletConnection.account(),
    contractId,
    {
      viewMethods: ["ft_balance_of"],
      changeMethods: ["ft_transfer"],
    }
  )

  return { currentUser, nearConfig, walletConnection, contract };
}

function App() {
  // The app's state.
  const [isUnityMounted, setIsUnityMounted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [progression, setProgression] = useState(0);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [wallet, setWallet] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance]  = useState(0);

  useEffect(() => {
    unityContext.on("NearLogin", async function () {
      wallet?.requestSignIn(contractId, 'Near Unity Example')
    });

    unityContext.on("FtTransfer", async function (receiver_id, amount) {
      await contract.ft_transfer(
        {
          receiver_id: receiver_id,
          amount: amount
        },
        50000000000000,
        1
      )
    })

    unityContext.on("FtBalanceOf", async function (account_id) {
      setBalance(await contract.ft_balance_of({
        account_id: account_id
      }))
    })
  }, [wallet, contract])

  useEffect(() => {
    unityContext.on("canvas", handleOnUnityCanvas);
    unityContext.on("progress", handleOnUnityProgress);
    unityContext.on("loaded", handleOnUnityLoaded);
   
    const asyncInit = async () => {
      const init = await initContract()
      setWallet(init.walletConnection)
      setCurrentUser(init.currentUser)
      setContract(init.contract)
    }

    asyncInit()

    return function () {
      unityContext.removeAllEventListeners();
    };
  }, []);

  function handleOnUnityCanvas(canvas) {
    canvas?.setAttribute?.("role", "unityCanvas");
  }

  function handleOnUnityProgress(progression) {
    setProgression(progression);
  }

  function handleOnUnityLoaded() {
    setIsLoaded(true);
  }

  function handleOnClickUnMountUnity() {
    if (isLoaded === true) {
      setIsLoaded(false);
    }
    setIsUnityMounted(isUnityMounted === false);
  }

  return (
    <Fragment>
      <div className="wrapper">
        {/* Introduction text */}
        <h1>React Unity WebGL Tests</h1>
        {/* Some buttons to interact */}
        <button onClick={handleOnClickUnMountUnity}>(Un)mount Unity</button>
        {/* The Unity container */}
        {isUnityMounted === true && (
          <Fragment>
            <div className="unity-container">
              {/* The loading screen will be displayed here. */}
              {isLoaded === false && (
                <div className="loading-overlay">
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: progression * 100 + "%" }}
                    />
                  </div>
                </div>
              )}
              {/* The Unity app will be rendered here. */}
              <Unity className="unity-canvas" unityContext={unityContext} />
            </div>
            {/* Displaying some output values */}
            {currentUser && <p>{`AccountId: ${currentUser?.accountId}`}</p>}
            {balance != 0 && <p>{`Balance: ${balance}`}</p>}
          </Fragment>
        )}
      </div>
    </Fragment>
  );
}

export default App;
