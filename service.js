window.addEventListener('load', async () => {
  const gameAddressElement = document.getElementById('baseplay-service');
  const gameAddress = new URL(gameAddressElement?.src).searchParams.get('gameId') || '';
  console.log(gameAddress);
  if (!gameAddress) {
    console.error("Game address not provided in query parameters.");
  } else {
    let web3;
    const hostname = window.location.hostname;
    let isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    isLocal = false; // for local testing set true
    if (isLocal) {
      web3 = new Web3('http://127.0.0.1:8545'); // Connect to Hardhat node for localhost
    } else if (typeof window.ethereum !== 'undefined') {
      // Use the browser's injected provider for non-localhost domains
      web3 = new Web3(window.ethereum);

      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (!isLocal) { 
          // Check if the user is on the Sepolia chain (chainId 84352)
          const chainId = await web3.eth.getChainId();
          if (chainId !== 84352n) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x149f0' }] // 0x149f0 is the hexadecimal representation of 84352
            });
          } catch (switchError) {
            console.error("Failed to switch to Sepolia chain:", switchError);
            return;
            }
          }
        }
      } catch (error) {
        console.error("User denied account access or failed to switch chain:", error);
        return;
      }
    } else {
      console.error("Please install MetaMask or use a localhost environment!");
      return;
    }

    // Function to connect wallet and get current active account
    async function connectWallet() {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const currentAccount = accounts[0];
        console.log("Wallet connected:", currentAccount);
        window.ethereum.on('accountsChanged', function(accounts) {
          console.log("Accounts changed:", accounts);
          window.baseplayService.currentAccount = accounts[0];
        });
        return currentAccount;
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        return null;
      }
    }

    // Function to get current active wallet address
    async function getWalletAddress() {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const currentAccount = accounts[0];
        return currentAccount;
      } catch (error) {
        console.error("Failed to get wallet address:", error);
        return null;
      }
    }

    // Maintain session
    async function maintainSession() {
      const currentAccount = await getWalletAddress();
      if (currentAccount) {
        console.log("Session maintained for:", currentAccount);
        return currentAccount;
      } else {
        return await connectWallet();
      }
    }

    // Updated ABI of the Game contract
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
      },
      {
        "name": "updateScore",
        "type": "function",
        "inputs": [
          { "name": "score", "type": "uint256" }
        ],
        "outputs": []
      },
      {
        "name": "getTopPlayers",
        "type": "function",
        "inputs": [],
        "outputs": [
          {
            "components": [
              { "name": "player", "type": "address" },
              { "name": "score", "type": "uint256" }
            ],
            "name": "",
            "type": "tuple[10]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "name": "getAllAchievements",
        "type": "function",
        "inputs": [],
        "outputs": [
          { "name": "names", "type": "string[]" },
          { "name": "descriptions", "type": "string[]" },
          { "name": "badges", "type": "string[]" },
          { "name": "playerCounts", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "name": "getMyAchievements",
        "type": "function",
        "inputs": [
          { "name": "player", "type": "address" }
        ],
        "outputs": [
          { "name": "", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "name": "getGameDetails",
        "type": "function",
        "inputs": [],
        "outputs": [
          { "name": "", "type": "address" },
          { "name": "", "type": "string" },
          { "name": "", "type": "string" },
          { "name": "", "type": "string" },
          { "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // Create a contract instance
    web3.eth.setProvider(web3.currentProvider);
    const gameContract = new web3.eth.Contract(gameABI, gameAddress);

    // Function to unlock an achievement and save on chain
    async function unlockAchievementOnChain(achievementId) {
      try {
        const playerAddress = await maintainSession();
        if (!playerAddress) {
          console.error("No wallet connected");
          return;
        }

        // Check if the achievement is already unlocked on chain
        const onChainAchievements = await gameContract.methods.getMyAchievements(playerAddress).call();
        if (onChainAchievements.includes(achievementId.toString())) {
          console.log(`Achievement ${achievementId} is already unlocked on chain for ${playerAddress}`);
          return;
        }

        // Call the unlockAchievement function and send a transaction
        const tx = await gameContract.methods.unlockAchievement(playerAddress, achievementId).send({ from: playerAddress });
        console.log("Transaction hash:", tx);

        // Save achievement locally
        let achievements = JSON.parse(localStorage.getItem('achievements')) || {};
        achievements[playerAddress] = [...(achievements[playerAddress] || []), achievementId];
        achievements[playerAddress].push({ id: achievementId, savedOnChain: true });
        localStorage.setItem('achievements', JSON.stringify(achievements));

        // Get achievement details
        const achievement = await gameContract.methods.getAchievement(achievementId).call();
        showToast(`Achievement Unlocked on Chain: ${achievement.name}`, achievement.imageURI, achievement.description);

        console.log(`Achievement ${achievementId} unlocked for ${playerAddress}`);
      } catch (error) {
        console.error("Failed to unlock achievement on chain:", error);
      }
    }

    // Function to unlock an achievement and save locally
    async function unlockAchievementLocally(achievementId) {
      try {
        const playerAddress = await maintainSession();
        if (!playerAddress) {
          console.error("No wallet connected");
          return;
        }

        // Get locally stored achievements
        let achievements = JSON.parse(localStorage.getItem('achievements')) || {};
        if (!achievements[playerAddress]) {
          achievements[playerAddress] = [];
        }

        // Check if the achievement is already unlocked locally
        if (achievements[playerAddress].some(ach => ach.id === achievementId)) {
          console.log(`Achievement ${achievementId} is already unlocked locally for ${playerAddress}`);
          return;
        }

        // Save achievement locally
        achievements[playerAddress].push({ id: achievementId, savedOnChain: false });
        localStorage.setItem('achievements', JSON.stringify(achievements));

        // Get achievement details
        const achievement = await gameContract.methods.getAchievement(achievementId).call();
        showToast(`Achievement Unlocked: ${achievement.name}`, achievement.imageURI, achievement.description);

        console.log(`Achievement ${achievementId} unlocked for ${playerAddress}`);
      } catch (error) {
        console.error("Failed to unlock achievement locally:", error);
      }
    }

    // Function to get achievements
    async function getAchievements() {
      try {
        const playerAddress = await maintainSession();
        if (!playerAddress) {
          console.error("No wallet connected");
          return [];
        }

        // Get achievements from the blockchain
        const onChainAchievements = await gameContract.methods.getMyAchievements(playerAddress).call();

        // Get locally stored achievements
        const localAchievements = JSON.parse(localStorage.getItem('achievements')) || {};
        const playerLocalAchievements = localAchievements[playerAddress] || [];

        // Combine and deduplicate achievements
        const allAchievements = [...new Set([...onChainAchievements, ...playerLocalAchievements.map(ach => ach.id)])];

        // Fetch details for each achievement
        const achievementDetails = await Promise.all(
          allAchievements.map(async (id) => {
            const details = await gameContract.methods.getAchievement(id).call();
            return { id, ...details };
          })
        );

        return achievementDetails;
      } catch (error) {
        console.error("Failed to get achievements:", error);
        return [];
      }
    }

    // Function to get all achievements
    async function getAllAchievements() {
      try {
        // Get all achievements from the blockchain
        const allAchievements = await gameContract.methods.getAllAchievements().call();

        // Map the achievements to a more readable format
        const achievements = allAchievements.names.map((name, index) => ({
          name,
          description: allAchievements.descriptions[index],
          badge: allAchievements.badges[index],
          playerCount: allAchievements.playerCounts[index]
        }));

        return achievements;
      } catch (error) {
        console.error("Failed to get all achievements:", error);
        return [];
      }
    }

    // Function to show a beautiful toast notification with image
    function showToast(message, imageUrl, description = '') {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `
        <img src="${imageUrl}" alt="Achievement Badge" style="width: 50px; height: 50px; margin-right: 10px;">
        <div>
          <span>${message}</span><br>
          <span style="font-size: 12px; color: #666;">${description}</span>
        </div>
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

    // Expose functions to window.baseplayService
    if (!window.baseplayService) {
      window.baseplayService = {};
    }
    window.baseplayService.connectWallet = connectWallet;
    window.baseplayService.getWalletAddress = getWalletAddress;
    window.baseplayService.unlockAchievementOnChain = unlockAchievementOnChain;
    window.baseplayService.unlockAchievementLocally = unlockAchievementLocally;
    window.baseplayService.getAchievements = getAchievements;
    window.baseplayService.getAllAchievements = getAllAchievements;
    window.baseplayService.currentAccount = null; // Add currentAccount property

    // Initialize currentAccount with the current active account
    window.baseplayService.currentAccount = await getWalletAddress();
  }

  // Add some basic styles for the toast
  const style = document.createElement('style');
  style.innerHTML = `
    .toast {
      visibility: hidden;
      background-color: rgba(255, 255, 255, 0.9);
      color: #000;
      text-align: left;
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
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
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
