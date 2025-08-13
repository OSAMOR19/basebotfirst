const crypto = require("crypto")

// Generate a unique referral code
function generateReferralCode(length = 8) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

// Format ETH amount for display
function formatEthAmount(amount) {
  const num = Number.parseFloat(amount)
  if (num === 0) return "0"
  if (num < 0.0001) return num.toExponential(2)
  if (num < 1) return num.toFixed(6)
  return num.toFixed(4)
}

// Format token amount for display
function formatTokenAmount(amount, decimals = 18) {
  const num = Number.parseFloat(amount)
  if (num === 0) return "0"
  if (num < 1) return num.toFixed(6)
  if (num < 1000) return num.toFixed(2)
  if (num < 1000000) return (num / 1000).toFixed(2) + "K"
  return (num / 1000000).toFixed(2) + "M"
}

// Validate Ethereum address
function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Calculate percentage change
function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) return 0
  return ((newValue - oldValue) / oldValue) * 100
}

// Sleep function for delays
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Generate random delay between min and max milliseconds
function randomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Truncate address for display
function truncateAddress(address, startLength = 6, endLength = 4) {
  if (!address) return ""
  if (address.length <= startLength + endLength) return address
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

// Convert Wei to ETH
function weiToEth(wei) {
  return Number.parseFloat(wei) / Math.pow(10, 18)
}

// Convert ETH to Wei
function ethToWei(eth) {
  return Math.floor(Number.parseFloat(eth) * Math.pow(10, 18))
}

module.exports = {
  generateReferralCode,
  formatEthAmount,
  formatTokenAmount,
  isValidEthereumAddress,
  calculatePercentageChange,
  sleep,
  randomDelay,
  truncateAddress,
  weiToEth,
  ethToWei,
}
