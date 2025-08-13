const { ethers } = require("ethers")
const CryptoJS = require("crypto-js")
const logger = require("../utils/logger")

class WalletManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY
    if (!this.encryptionKey) {
      throw new Error("ENCRYPTION_KEY environment variable is required")
    }
  }

  // Generate a new wallet
  generateWallet() {
    try {
      const wallet = ethers.Wallet.createRandom()
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase,
      }
    } catch (error) {
      logger.error("Error generating wallet:", error)
      throw error
    }
  }

  // Encrypt private key
  encryptPrivateKey(privateKey, userPassphrase = "") {
    try {
      const combinedKey = this.encryptionKey + userPassphrase
      const encrypted = CryptoJS.AES.encrypt(privateKey, combinedKey).toString()
      return encrypted
    } catch (error) {
      logger.error("Error encrypting private key:", error)
      throw error
    }
  }

  // Decrypt private key
  decryptPrivateKey(encryptedPrivateKey, userPassphrase = "") {
    try {
      const combinedKey = this.encryptionKey + userPassphrase
      const decrypted = CryptoJS.AES.decrypt(encryptedPrivateKey, combinedKey)
      return decrypted.toString(CryptoJS.enc.Utf8)
    } catch (error) {
      logger.error("Error decrypting private key:", error)
      throw error
    }
  }

  // Create wallet instance from encrypted private key
  createWalletFromEncrypted(encryptedPrivateKey, userPassphrase = "") {
    try {
      const privateKey = this.decryptPrivateKey(encryptedPrivateKey, userPassphrase)
      const rpcUrl = process.env.TESTNET_MODE === "true" ? process.env.BASE_TESTNET_RPC_URL : process.env.BASE_RPC_URL

      const provider = new ethers.JsonRpcProvider(rpcUrl)
      return new ethers.Wallet(privateKey, provider)
    } catch (error) {
      logger.error("Error creating wallet from encrypted key:", error)
      throw error
    }
  }

  // Validate wallet address
  isValidAddress(address) {
    try {
      return ethers.isAddress(address)
    } catch (error) {
      return false
    }
  }

  // Import wallet from private key
  importWallet(privateKey) {
    try {
      const wallet = new ethers.Wallet(privateKey)
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
      }
    } catch (error) {
      logger.error("Error importing wallet:", error)
      throw new Error("Invalid private key")
    }
  }

  // Get wallet balance
  async getBalance(walletAddress) {
    try {
      const rpcUrl = process.env.TESTNET_MODE === "true" ? process.env.BASE_TESTNET_RPC_URL : process.env.BASE_RPC_URL

      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const balance = await provider.getBalance(walletAddress)
      return ethers.formatEther(balance)
    } catch (error) {
      logger.error("Error getting wallet balance:", error)
      throw error
    }
  }

  // Get token balance
  async getTokenBalance(walletAddress, tokenAddress) {
    try {
      const rpcUrl = process.env.TESTNET_MODE === "true" ? process.env.BASE_TESTNET_RPC_URL : process.env.BASE_RPC_URL

      const provider = new ethers.JsonRpcProvider(rpcUrl)

      // ERC20 ABI for balanceOf function
      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
      ]

      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider)
      const balance = await tokenContract.balanceOf(walletAddress)
      const decimals = await tokenContract.decimals()
      const symbol = await tokenContract.symbol()

      return {
        balance: ethers.formatUnits(balance, decimals),
        symbol,
        decimals,
      }
    } catch (error) {
      logger.error("Error getting token balance:", error)
      throw error
    }
  }
}

module.exports = WalletManager
