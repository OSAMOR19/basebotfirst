const { ethers } = require("ethers")
const logger = require("../utils/logger")

class SniperService {
  constructor() {
    this.isRunning = false
    this.provider = null
    this.wsProvider = null
    this.activeTargets = new Map()
    this.uniswapV3Factory = process.env.UNISWAP_V3_FACTORY
  }

  async start() {
    try {
      if (this.isRunning) {
        logger.warn("Sniper service is already running")
        return
      }

      // Initialize WebSocket provider for real-time events
      const wsUrl = process.env.BASE_WSS_URL
      this.wsProvider = new ethers.WebSocketProvider(wsUrl)

      // Initialize regular provider
      const rpcUrl = process.env.TESTNET_MODE === "true" ? process.env.BASE_TESTNET_RPC_URL : process.env.BASE_RPC_URL
      this.provider = new ethers.JsonRpcProvider(rpcUrl)

      this.isRunning = true

      // Start monitoring for new pairs
      this.monitorNewPairs()

      // Start monitoring for liquidity additions
      this.monitorLiquidityAdditions()

      logger.info("Sniper service started successfully")
    } catch (error) {
      logger.error("Error starting sniper service:", error)
      throw error
    }
  }

  async stop() {
    this.isRunning = false
    if (this.wsProvider) {
      await this.wsProvider.destroy()
    }
    logger.info("Sniper service stopped")
  }

  // Monitor for new Uniswap V3 pairs
  async monitorNewPairs() {
    try {
      const factoryAbi = [
        "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)",
      ]

      const factory = new ethers.Contract(this.uniswapV3Factory, factoryAbi, this.wsProvider)

      factory.on("PoolCreated", async (token0, token1, fee, tickSpacing, pool, event) => {
        logger.info(`New pool created: ${pool} for tokens ${token0}/${token1}`)

        // Check if any of our targets match this new pair
        await this.checkSniperTargets(token0, token1, pool)
      })
    } catch (error) {
      logger.error("Error monitoring new pairs:", error)
    }
  }

  // Monitor for liquidity additions
  async monitorLiquidityAdditions() {
    try {
      // Monitor for Transfer events that might indicate liquidity additions
      const transferEventSignature = ethers.id("Transfer(address,address,uint256)")

      this.wsProvider.on(
        {
          topics: [transferEventSignature],
        },
        async (log) => {
          // Process potential liquidity addition
          await this.processLiquidityEvent(log)
        },
      )
    } catch (error) {
      logger.error("Error monitoring liquidity additions:", error)
    }
  }

  // Add a sniper target
  async addTarget(userId, tokenAddress, buyAmountEth, maxGasPrice, slippage = 5) {
    try {
      const target = {
        userId,
        tokenAddress: tokenAddress.toLowerCase(),
        buyAmountEth,
        maxGasPrice,
        slippage,
        isActive: true,
        createdAt: new Date(),
      }

      this.activeTargets.set(`${userId}_${tokenAddress.toLowerCase()}`, target)

      logger.info(`Sniper target added for user ${userId}: ${tokenAddress}`)
      return true
    } catch (error) {
      logger.error("Error adding sniper target:", error)
      return false
    }
  }

  // Remove a sniper target
  async removeTarget(userId, tokenAddress) {
    try {
      const key = `${userId}_${tokenAddress.toLowerCase()}`
      const removed = this.activeTargets.delete(key)

      if (removed) {
        logger.info(`Sniper target removed for user ${userId}: ${tokenAddress}`)
      }

      return removed
    } catch (error) {
      logger.error("Error removing sniper target:", error)
      return false
    }
  }

  // Check if new pair matches any sniper targets
  async checkSniperTargets(token0, token1, poolAddress) {
    try {
      const wethAddress =
        process.env.TESTNET_MODE === "true"
          ? "0x4200000000000000000000000000000000000006" // Base Goerli WETH
          : "0x4200000000000000000000000000000000000006" // Base Mainnet WETH

      let targetToken = null

      // Check if this is a WETH pair
      if (token0.toLowerCase() === wethAddress.toLowerCase()) {
        targetToken = token1
      } else if (token1.toLowerCase() === wethAddress.toLowerCase()) {
        targetToken = token0
      }

      if (!targetToken) {
        return // Not a WETH pair, skip
      }

      // Check if any active targets match this token
      for (const [key, target] of this.activeTargets) {
        if (target.tokenAddress === targetToken.toLowerCase() && target.isActive) {
          logger.info(`Sniper target matched! Executing buy for ${targetToken}`)
          await this.executeSniperBuy(target, poolAddress)
        }
      }
    } catch (error) {
      logger.error("Error checking sniper targets:", error)
    }
  }

  // Execute sniper buy
  async executeSniperBuy(target, poolAddress) {
    try {
      // This would integrate with your trading service and wallet manager
      // to execute the actual buy transaction

      logger.info(`Executing sniper buy for user ${target.userId}`)
      logger.info(`Token: ${target.tokenAddress}`)
      logger.info(`Amount: ${target.buyAmountEth} ETH`)
      logger.info(`Pool: ${poolAddress}`)

      // Mark target as executed
      target.isActive = false

      // Here you would:
      // 1. Get user's wallet from database
      // 2. Create wallet instance
      // 3. Execute buy transaction with high gas price
      // 4. Save trade to database
      // 5. Notify user via Telegram

      return true
    } catch (error) {
      logger.error("Error executing sniper buy:", error)
      return false
    }
  }

  // Process liquidity events
  async processLiquidityEvent(log) {
    try {
      // Decode the transfer event and check if it's a significant liquidity addition
      // This is a simplified version - you'd want more sophisticated detection

      const transferInterface = new ethers.Interface([
        "event Transfer(address indexed from, address indexed to, uint256 value)",
      ])

      const decoded = transferInterface.parseLog(log)

      // Check if this is a transfer to a known DEX pool
      // and if the amount is significant enough to indicate liquidity addition
    } catch (error) {
      logger.error("Error processing liquidity event:", error)
    }
  }

  // Get active targets for a user
  getUserTargets(userId) {
    const userTargets = []
    for (const [key, target] of this.activeTargets) {
      if (target.userId === userId && target.isActive) {
        userTargets.push(target)
      }
    }
    return userTargets
  }

  // Get all active targets count
  getActiveTargetsCount() {
    let count = 0
    for (const [key, target] of this.activeTargets) {
      if (target.isActive) count++
    }
    return count
  }
}

module.exports = SniperService
