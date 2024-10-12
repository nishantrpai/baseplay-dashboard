window.addEventListener('load', async () => {
  // Load Feather Icons script
  const featherScript = document.createElement('script');
  featherScript.src = 'https://unpkg.com/feather-icons';
  featherScript.onload = () => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  };
  document.head.appendChild(featherScript);

  // Load Ethers.js script
  const ethersScript = document.createElement('script');
  ethersScript.src = 'https://cdn.jsdelivr.net/npm/ethers@5.0.0/dist/ethers.umd.min.js';
  document.head.appendChild(ethersScript);

  // Load jdenticon script
  const jdenticonScript = document.createElement('script');
  jdenticonScript.src = 'https://cdn.jsdelivr.net/npm/jdenticon@3.1.0/dist/jdenticon.min.js';
  document.head.appendChild(jdenticonScript);

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
          // Check if the user is on the Base Sepolia chain (chainId 84532)
          const chainId = await web3.eth.getChainId();
          if (chainId !== 84532n) {
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x14a34' }], // 84532 in hexadecimal
              });
            } catch (switchError) {
              // This error code indicates that the chain has not been added to MetaMask
              if (switchError.code === 4902) {
                try {
                  await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                      chainId: '0x14a34',
                      chainName: 'Base Sepolia Testnet',
                      nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18
                      },
                      rpcUrls: ['https://sepolia.base.org'],
                      blockExplorerUrls: ['https://sepolia.basescan.org']
                    }],
                  });
                } catch (addError) {
                  console.error('Failed to add Base Sepolia network:', addError);
                }
              } else {
                console.error('Failed to switch to Base Sepolia network:', switchError);
              }
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

        // Check and switch to Base Sepolia if necessary
        const chainId = await web3.eth.getChainId();
        if (chainId !== 84532n) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x14a34' }], // 84532 in hexadecimal
            });
          } catch (switchError) {
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0x14a34',
                    chainName: 'Base Sepolia Testnet',
                    nativeCurrency: {
                      name: 'ETH',
                      symbol: 'ETH',
                      decimals: 18
                    },
                    rpcUrls: ['https://sepolia.base.org'],
                    blockExplorerUrls: ['https://sepolia.basescan.org']
                  }],
                });

                // reload the page
                location.reload();
              } catch (addError) {
                console.error('Failed to add Base Sepolia network:', addError);
                return null;
              }
            } else {
              console.error('Failed to switch to Base Sepolia network:', switchError);
              return null;
            }
          }
        }

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
        "inputs": [
          { "internalType": "address", "name": "player", "type": "address" },
          { "internalType": "uint256", "name": "achievementId", "type": "uint256" }
        ],
        "name": "unlockAchievement",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "uint256", "name": "achievementId", "type": "uint256" }
        ],
        "name": "getAchievement",
        "outputs": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "string", "name": "imageURI", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "uint256", "name": "score", "type": "uint256" }
        ],
        "name": "updateScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getTopPlayers",
        "outputs": [
          {
            "components": [
              { "internalType": "address", "name": "player", "type": "address" },
              { "internalType": "uint256", "name": "score", "type": "uint256" }
            ],
            "internalType": "struct LeaderboardManager.LeaderboardEntry[10]",
            "name": "",
            "type": "tuple[10]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getAllAchievements",
        "outputs": [
          { "internalType": "string[]", "name": "names", "type": "string[]" },
          { "internalType": "string[]", "name": "descriptions", "type": "string[]" },
          { "internalType": "string[]", "name": "badges", "type": "string[]" },
          { "internalType": "uint256[]", "name": "playerCounts", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "address", "name": "player", "type": "address" }
        ],
        "name": "getMyAchievements",
        "outputs": [
          { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getGameDetails",
        "outputs": [
          { "internalType": "address", "name": "", "type": "address" },
          { "internalType": "string", "name": "", "type": "string" },
          { "internalType": "string", "name": "", "type": "string" },
          { "internalType": "string", "name": "", "type": "string" },
          { "internalType": "uint256", "name": "", "type": "uint256" }
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
        showToast("Failed to unlock achievement", "", "Transaction was denied or failed");
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
        showToast("Failed to unlock achievement", "", "An error occurred while unlocking the achievement");
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
        throw error; // Re-throw the error for better error handling
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
        throw error; // Re-throw the error for better error handling
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

    // Function to show leaderboard toast
    async function showLeaderboardToast() {
      try {
        let topPlayers = await gameContract.methods.getTopPlayers().call();
        
        topPlayers = topPlayers.filter(player => player.player !== '0x0000000000000000000000000000000000000000');

        // Create a new ethers provider
        const provider = new ethers.providers.JsonRpcProvider('https://eth-pokt.nodies.app');

        // Show loading toast
        const loadingToast = document.createElement('div');
        loadingToast.className = 'leaderboard-toast loading';
        loadingToast.innerHTML = `
          <h2>Loading Leaderboard...</h2>
          <div class="spinner"></div>
        `;
        document.body.appendChild(loadingToast);

        // Fetch ENS names for all players
        const playerWithENS = await Promise.all(topPlayers.map(async (player) => {
          const ens = await provider.lookupAddress(player.player);
          const displayAddress = player.player.slice(0, 6) + '...' + player.player.slice(-4);
          return {
            ...player,
            ens: ens || displayAddress
          };
        }));

        // Remove loading toast
        document.body.removeChild(loadingToast);

        const leaderboardToast = document.createElement('div');
        leaderboardToast.className = 'leaderboard-toast';
        
        let leaderboardContent = '<h2>🏆 Top 10 Players</h2><table class="leaderboard-table">';
        leaderboardContent += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';
        playerWithENS.forEach((player, index) => {
          leaderboardContent += `
            <tr>
              <td>${index + 1}</td>
              <td>
                <svg width="20" height="20" data-jdenticon-value="${player.player}" alt="${player.ens}"></svg>
                <a href="https://sepolia.basescan.org/address/${player.player}" target="_blank" rel="noopener noreferrer">${player.ens}</a>
              </td>
              <td><strong>${player.score}</strong></td>
            </tr>
          `;
        });
        leaderboardContent += '</table>';
        
        leaderboardToast.innerHTML = `
          <button class="close-button"><i data-feather="x"></i></button>
          ${leaderboardContent}
          <div class="powered-by">
            <a href="https://baseplay.vercel.app" target="_blank" rel="noopener noreferrer">Powered by BasePlayService</a>
          </div>
        `;
        
        document.body.appendChild(leaderboardToast);
        
        // Initialize Feather icons
        if (typeof feather !== 'undefined') {
          feather.replace();
        }

        // Initialize jdenticon
        if (typeof jdenticon !== 'undefined') {
          jdenticon();
        }
        
        const closeButton = leaderboardToast.querySelector('.close-button');
        closeButton.addEventListener('click', () => {
          document.body.removeChild(leaderboardToast);
        });
      } catch (error) {
        console.error("Failed to show leaderboard:", error);
      }
    }

    // Function to update score
    async function updateScore(score) {
      try {
        const playerAddress = await maintainSession();
        if (!playerAddress) {
          console.error("No wallet connected");
          return;
        }

        // Call the updateScore function and send a transaction
        const tx = await gameContract.methods.updateScore(score).send({ from: playerAddress });
        console.log("Score update transaction hash:", tx);

        console.log(`Score updated for ${playerAddress}: ${score}`);
      } catch (error) {
        console.error("Failed to update score:", error);
        showToast("Failed to update score", "", "Transaction was denied or failed");
      }
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
    window.baseplayService.showLeaderboardToast = showLeaderboardToast;
    window.baseplayService.updateScore = updateScore;
    window.baseplayService.currentAccount = null; // Add currentAccount property

    // Initialize currentAccount with the current active account
    window.baseplayService.currentAccount = await getWalletAddress();
  }

  // Add some basic styles for the toast and leaderboard
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

    .leaderboard-toast {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: white;
      color: #000;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
      z-index: 1000;
      max-width: 80%;
      max-height: 80%;
      min-width: 300px;
      max-width: 300px;
      min-height: 500px;
      overflow-y: auto;
    }

    .leaderboard-toast h2 {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      margin-top: 0;
      text-align: center;
    }

    .leaderboard-table {
      width: 100%;
      border-collapse: collapse;
    }

    .leaderboard-table th, .leaderboard-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }

    .leaderboard-table th {
      background-color: #f2f2f2;
      font-weight: bold;
    }

    .leaderboard-table td:first-child {
      width: 10%;
    }

    .leaderboard-table td:nth-child(2) {
      width: 60%;
    }

    .leaderboard-table td:last-child {
      width: 30%;
      text-align: right;
    }

    .leaderboard-table svg {
      vertical-align: middle;
      margin-right: 10px;
    }

    .close-button {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      color: #777;
    }

    .close-button svg {
      width: 12px !important;
      height: 12px !important;
    }

    .close-button:hover {
      opacity: 0.7;
    }

    .close-button svg {
      width: 24px;
      height: 24px;
    }

    .leaderboard-toast.loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-top: 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .powered-by {
      text-align: center;
      font-size: 10px;
      margin-top: 10px;
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
    }

    .powered-by a {
      color: #777;
      text-decoration: none;
    }

    .powered-by a:hover {
      text-decoration: underline;
    }
  `;
  document.head.appendChild(style);
});
