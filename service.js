window.addEventListener('load', async () => {
  const gameAddressElement = document.getElementById('baseplay-service');
  const gameAddress = gameAddressElement?.getAttribute('src')?.replace('service.js?gameId=', '') || '';
  console.log(gameAddress);
  if (!gameAddress) {
    console.error("Game address not provided in query parameters.");
  } else {
    let web3;
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
      web3 = new Web3('http://127.0.0.1:8545'); // Connect to Hardhat node for localhost
    } else if (typeof window.ethereum !== 'undefined') {
      // Use the browser's injected provider for non-localhost domains
      web3 = new Web3(window.ethereum);

      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        console.error("User denied account access");
        return;
      }
    } else {
      console.error("Please install MetaMask or use a localhost environment!");
      return;
    }

    // Function to connect wallet
    async function connectWallet() {
      try {
        const accounts = await web3.eth.getAccounts();
        console.log("Wallet connected:", accounts[0]);
        return accounts[0];
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    }

    // Function to get wallet address
    async function getWalletAddress() {
      try {
        const accounts = await web3.eth.getAccounts();
        console.log("Wallet address:", accounts[0]);
        return accounts[0];
      } catch (error) {
        console.error("Failed to get wallet address:", error);
      }
    }

    // Maintain session
    async function maintainSession() {
      const accounts = await web3.eth.getAccounts();
      if (accounts.length > 0) {
        console.log("Session maintained for:", accounts[0]);
        return accounts[0];
      } else {
        return await connectWallet();
      }
    }

    // ABI of the Game contract
    const gameABI = [
      {
        "name": "unlockAchievement",
        "type": "function",
        "inputs": [
          { "name": "player", "type": "address" },
          { "name": "achievementId", "type": "uint256" }
        ],
        "outputs": []
      },
      {
        "name": "getAchievement",
        "type": "function",
        "inputs": [
          { "name": "achievementId", "type": "uint256" }
        ],
        "outputs": [
          { "name": "name", "type": "string" },
          { "name": "description", "type": "string" },
          { "name": "imageURI", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
      }
      // Add other function signatures if needed
    ];

    // Create a contract instance
    const gameContract = new web3.eth.Contract(gameABI, gameAddress);

    // Function to unlock an achievement
    async function unlockAchievement(playerAddress, achievementId) {
      try {
        const signer = await maintainSession();
        // TODO: commented for testing
        // const tx = await gameContract.methods.unlockAchievement(playerAddress, achievementId).send({ from: signer });
        // console.log(`Achievement ${achievementId} unlocked for player ${playerAddress}`);
        
        // Get achievement details
        const achievement = await gameContract.methods.getAchievement(achievementId).call();
        showToast(`Achievement Unlocked: ${achievement.name}`, achievement.imageURI);
      } catch (error) {
        console.error("Failed to unlock achievement:", error);
      }
    }

    // Function to show a beautiful toast notification with image
    function showToast(message, imageUrl) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `
        <img src="${imageUrl}" alt="Achievement Badge" style="width: 50px; height: 50px; margin-right: 10px;">
        <span>${message}</span>
      `;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('show');
      }, 100);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }

    // Example usage
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    if (connectWalletBtn) {
      connectWalletBtn.addEventListener('click', async () => {
        await connectWallet();
      });
    }

    const unlockAchievementBtn = document.getElementById('unlockAchievementBtn');
    if (unlockAchievementBtn) {
      unlockAchievementBtn.addEventListener('click', async () => {
        const playerAddress = await getWalletAddress(); // Replace with actual player address
        const achievementId = 0; // Replace with actual achievement ID
        const gameAddressInput = document.getElementById('gameAddress');
        const gameAddressValue = gameAddressInput instanceof HTMLInputElement ? gameAddressInput.value : '';

        if (!gameAddressValue) {
          console.error("Game address not provided.");
          return;
        }

        await unlockAchievement(playerAddress, achievementId);
      });
    }
  }

  // Add some basic styles for the toast
  const style = document.createElement('style');
  style.innerHTML = `
    .toast {
      visibility: hidden;
      background-color: rgba(255, 255, 255, 0.8);
      color: #000;
      text-align: center;
      border-radius: 2px;
      padding: 10px;
      position: fixed;
      z-index: 1;
      left: 50%;
      transform: translateX(-50%);
      bottom: 30px;
      font-size: 16px;
      transition: visibility 0.5s, opacity 0.5s, bottom 0.5s;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50px;
      max-width: 80%;
      width: auto;
    }

    .toast img {
      width: 30px;
      height: 30px;
      margin-right: 3px;
    }

    .toast span {
      font-size: 14px;
      font-weight: 500;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }

    .toast.show {
      visibility: visible;
      opacity: 1;
      bottom: 50px;
    }
  `;
  document.head.appendChild(style);
});
