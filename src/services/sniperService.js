const { ethers } = require("ethers")
const logger = require("../utils/logger")

class SniperService {
  constructor() {
    this.isRunning = false
    this.provider = null
    this.wsProvider = null
    this.activeTargets = new Map()
    this.uniswapV3Factory = process.env.UNISWAP_V3_FACTORY
    this.eventProcessingQueue = []
    this.isProcessingEvents = false
    this.maxRetries = 3
    this.retryDelay = 5000 // 5 seconds
  }

  async start() {
    try {
      if (this.isRunning) {
        logger.warn("Sniper service is already running")
        return
      }

      // Initialize WebSocket provider for real-time events
      let wsUrl = process.env.BASE_WSS_URL
      if (!wsUrl) {
        // Fallback: construct WSS URL from RPC URL if WSS URL is not provided
        const rpcUrl = process.env.TESTNET_MODE === "true" ? process.env.BASE_TESTNET_RPC_URL : process.env.BASE_RPC_URL
        if (rpcUrl) {
          wsUrl = rpcUrl.replace('https://', 'wss://')
        }
      }
      
      if (!wsUrl) {
        throw new Error("WebSocket URL is not available. Please set BASE_WSS_URL or ensure RPC URL is configured.")
      }

      logger.info(`Connecting to WebSocket: ${wsUrl}`)
      this.wsProvider = new ethers.WebSocketProvider(wsUrl)

      // Add error handling for WebSocket provider
      this.wsProvider.on("error", (error) => {
        logger.error("WebSocket provider error:", error)
      })

      this.wsProvider.on("close", () => {
        logger.warn("WebSocket connection closed")
        if (this.isRunning) {
          // Attempt to reconnect after a delay
          setTimeout(() => {
            logger.info("Attempting to reconnect WebSocket...")
            this.start()
          }, 5000)
        }
      })

      // Initialize regular provider
      const rpcUrl = process.env.TESTNET_MODE === "true" ? process.env.BASE_TESTNET_RPC_URL : process.env.BASE_RPC_URL
      if (!rpcUrl) {
        throw new Error("RPC URL environment variable is not set")
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl)

      this.isRunning = true

      // Start monitoring for new pairs
      this.monitorNewPairs()

      // Start monitoring for liquidity additions
      this.monitorLiquidityAdditions()

      logger.info("Sniper service started successfully")
    } catch (error) {
      logger.error("Error starting sniper service:", error)
      this.isRunning = false
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
      if (!this.uniswapV3Factory) {
        logger.error("UNISWAP_V3_FACTORY environment variable is not set")
        return
      }

      const factoryAbi = [
        "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)",
      ]

      const factory = new ethers.Contract(this.uniswapV3Factory, factoryAbi, this.wsProvider)

      factory.on("PoolCreated", async (token0, token1, fee, tickSpacing, pool, event) => {
        try {
          logger.info(`New pool created: ${pool} for tokens ${token0}/${token1}`)

          // Check if any of our targets match this new pair
          await this.checkSniperTargets(token0, token1, pool)
        } catch (error) {
          logger.error("Error processing pool creation event:", error)
        }
      })

      logger.info("Started monitoring for new Uniswap V3 pairs")
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
          try {
            // Validate log before processing
            if (!log) {
              logger.debug("Received null/undefined log in liquidity monitoring")
              return
            }

            // Add event to processing queue instead of processing immediately
            this.addEventToQueue(log)
          } catch (error) {
            logger.error("Error in liquidity event callback:", error)
          }
        },
      )

      logger.info("Started monitoring for liquidity additions")
    } catch (error) {
      logger.error("Error monitoring liquidity additions:", error)
    }
  }

  // Add event to processing queue
  addEventToQueue(log) {
    this.eventProcessingQueue.push(log)
    
    // Start processing if not already processing
    if (!this.isProcessingEvents) {
      this.processEventQueue()
    }
  }

  // Process events from queue
  async processEventQueue() {
    if (this.isProcessingEvents || this.eventProcessingQueue.length === 0) {
      return
    }

    this.isProcessingEvents = true

    try {
      while (this.eventProcessingQueue.length > 0 && this.isRunning) {
        const log = this.eventProcessingQueue.shift()
        
        try {
          await this.processLiquidityEvent(log)
        } catch (error) {
          logger.error("Error processing event from queue:", error)
          // Don't re-add to queue to prevent infinite loops
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      logger.error("Error in event queue processing:", error)
    } finally {
      this.isProcessingEvents = false
      
      // If there are more events in queue, continue processing
      if (this.eventProcessingQueue.length > 0 && this.isRunning) {
        setTimeout(() => this.processEventQueue(), 1000)
      }
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
      // Validate log object
      if (!log || !log.data || log.data === '0x' || log.data.length === 0) {
        logger.debug("Skipping liquidity event with empty or invalid data")
        return
      }

      // Validate topics array
      if (!log.topics || !Array.isArray(log.topics) || log.topics.length === 0) {
        logger.debug("Skipping liquidity event with invalid topics")
        return
      }

      // Additional validation for data format
      if (typeof log.data !== 'string' || !log.data.startsWith('0x')) {
        logger.debug("Skipping liquidity event with invalid data format")
        return
      }

      // Validate data length (should be at least 64 characters for a uint256)
      if (log.data.length < 66) { // 0x + 64 hex chars
        logger.debug("Skipping liquidity event with insufficient data length")
        return
      }

      // Decode the transfer event and check if it's a significant liquidity addition
      const transferInterface = new ethers.Interface([
        "event Transfer(address indexed from, address indexed to, uint256 value)",
      ])

      // Create a proper log object for parsing
      const logObject = {
        data: log.data,
        topics: log.topics,
        address: log.address,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex
      }

      const decoded = transferInterface.parseLog(logObject)

      // Check if this is a transfer to a known DEX pool
      // and if the amount is significant enough to indicate liquidity addition
      if (decoded && decoded.args) {
        const { from, to, value } = decoded.args
        
        // Log the decoded event for debugging (only occasionally to avoid spam)
        if (Math.random() < 0.01) { // Log only 1% of events
          logger.debug(`Transfer event: from=${from}, to=${to}, value=${value.toString()}`)
        }
        
        // Here you can add logic to detect significant liquidity additions
        // For example, check if the transfer is to a known DEX pool address
        // and if the amount is above a certain threshold
      }
    } catch (error) {
      // More specific error handling
      if (error.code === 'BUFFER_OVERRUN' || error.message.includes('data out-of-bounds')) {
        logger.debug("Skipping malformed event data:", {
          hasData: !!log?.data,
          dataLength: log?.data ? log.data.length : 0,
          dataPreview: log?.data ? log.data.substring(0, 20) + '...' : 'none'
        })
      } else {
        logger.error("Error processing liquidity event:", error)
        // Log additional details for debugging
        if (log) {
          logger.debug("Log object details:", {
            hasData: !!log.data,
            dataLength: log.data ? log.data.length : 0,
            hasTopics: !!log.topics,
            topicsLength: log.topics ? log.topics.length : 0,
            address: log.address
          })
        }
      }
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

  // Get service status and statistics
  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      activeTargets: this.getActiveTargetsCount(),
      queueLength: this.eventProcessingQueue.length,
      isProcessingEvents: this.isProcessingEvents,
      hasWebSocketConnection: !!this.wsProvider,
      hasProvider: !!this.provider
    }
  }

  // Clear event queue (useful for debugging or when service is overwhelmed)
  clearEventQueue() {
    const queueLength = this.eventProcessingQueue.length
    this.eventProcessingQueue = []
    logger.info(`Cleared event queue with ${queueLength} pending events`)
    return queueLength
  }
}

module.exports = SniperService
