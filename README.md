# Baseplay Service Documentation

The Baseplay Service provides a simple way to integrate blockchain-based achievements, leaderboards, and score tracking into your web game. This documentation will guide you through the setup and usage of the service.

You can find this example page for any game in the dashboard as well.

## Setup

To use the Baseplay Service, include the following script tag in your HTML file:
```html
<script id="baseplay-service" src="https://baseplay.vercel.app/service.js?gameId=YOUR_GAME_ADDRESS"></script>
```
The `YOUR_GAME_ADDRESS` will be automatically replaced with your actual game contract address.

## Available Functions

### 1. Connect Wallet

Use this function to connect the user's wallet:
```javascript
async function connectWallet() {
  const account = await window.baseplayService.connectWallet();
  if (account) {
    console.log("Connected account:", account);
    // Update UI to show connected state
  } else {
    console.log("Failed to connect wallet");
  }
}
```

### 2. Get Wallet Address

Retrieve the connected wallet address:
```javascript
async function getWalletAddress() {
  const address = await window.baseplayService.getWalletAddress();
  console.log("Wallet address:", address);
}
```

### 3. Unlock Achievement Locally

Unlock an achievement for a player locally:
```javascript
async function unlockAchievementLocally(achievementId) {
  try {
    await window.baseplayService.unlockAchievementLocally(achievementId);
    console.log("Achievement unlocked locally:", achievementId);
  } catch (error) {
    console.error("Failed to unlock achievement locally:", error);
  }
}
```

### 4. Unlock Achievement On Chain

Unlock an achievement for a player on chain:
```javascript
async function unlockAchievementOnChain(achievementId) {
  try {
    await window.baseplayService.unlockAchievementOnChain(achievementId);
    console.log("Achievement unlocked on chain:", achievementId);
  } catch (error) {
    console.error("Failed to unlock achievement on chain:", error);
  }
}
```

### 5. Get Achievements

Retrieve all achievements for the connected player:
```javascript
async function getAchievements() {
  try {
    const achievements = await window.baseplayService.getAchievements();
    console.log("Player achievements:", achievements);
  } catch (error) {
    console.error("Failed to get achievements:", error);
  }
}
```

### 6. Get All Achievements

Retrieve all available achievements in the game:
```javascript
async function getAllAchievements() {
  try {
    const allAchievements = await window.baseplayService.getAllAchievements();
    console.log("All game achievements:", allAchievements);
  } catch (error) {
    console.error("Failed to get all achievements:", error);
  }
}
```

### 7. Show Leaderboard Toast

Display a toast notification with the current leaderboard:
```javascript
async function showLeaderboard() {
  try {
    await window.baseplayService.showLeaderboardToast();
  } catch (error) {
    console.error("Failed to show leaderboard:", error);
  }
}
```

### 8. Update Score

Update the player's score on the blockchain:
```javascript
async function updateScore(score) {
  try {
    await window.baseplayService.updateScore(score);
    console.log("Score updated:", score);
  } catch (error) {
    console.error("Failed to update score:", error);
  }
}
```

**Note:** The `unlockAchievementLocally` and `unlockAchievementOnChain` functions will automatically use the connected wallet address as the player address.

**Note:** Once an achievement is unlocked, it cannot be unlocked again. This applies to the example below as well.

## Example Usage

Here's a simple example of how to use these functions in your game:
```javascript
// Connect wallet when the game starts
document.addEventListener('DOMContentLoaded', async () => {
  await connectWallet();
});

// Unlock an achievement locally when the player completes a task
function onTaskComplete() {
  const achievementId = 1; // Replace with your actual achievement ID
  unlockAchievementLocally(achievementId);
}

// Unlock an achievement on chain when the player completes a major task
function onMajorTaskComplete() {
  const achievementId = 2; // Replace with your actual achievement ID
  unlockAchievementOnChain(achievementId);
}

// Update player's score
function onScoreChange(newScore) {
  updateScore(newScore);
}

// Show leaderboard when player clicks a button
function onLeaderboardButtonClick() {
  showLeaderboard();
}

// Get all player's achievements
async function displayPlayerAchievements() {
  const achievements = await getAchievements();
  // Display achievements in your UI
}

// Get all game achievements
async function displayAllGameAchievements() {
  const allAchievements = await getAllAchievements();
  // Display all achievements in your UI
}
```

## Styling

The Baseplay Service includes default styles for toast notifications and the leaderboard. You can customize these by overriding the CSS classes in your own stylesheet.
