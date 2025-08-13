const cron = require("node-cron")
const logger = require("../utils/logger")

class BackgroundService {
  constructor(database, tradingService, walletManager, bot) {
    this.database = database
    this.tradingService = tradingService
    this.walletManager = walletManager
    this.bot = bot
    this.isRunning = false
  }

  async start() {
    if (this.isRunning) {
      logger.warn("Background service is already running")
      return
    }

    this.isRunning = true

    // Check limit orders every 30 seconds
    cron.schedule("*/30 * * * * *", async () => {
      await this.checkLimitOrders()
    })

    // Check DCA schedules every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
      await this.executeDCASchedules()
    })

    logger.info("Background service started successfully")
  }

  async stop() {
    this.isRunning = false
    logger.info("Background service stopped")
  }

  async checkLimitOrders() {
    try {
      const activeOrders = await this.database.getActiveLimitOrders()
      for (const order of activeOrders) {
        await this.processLimitOrder(order)
      }
    } catch (error) {
      logger.error("Error checking limit orders:", error)
    }
  }

  async processLimitOrder(order) {
    try {
      const currentPrice = await this.tradingService.getTokenPrice(order.token_address)
      if (!currentPrice || currentPrice === "0") return

      const price = Number.parseFloat(currentPrice)
      const targetPrice = Number.parseFloat(order.target_price)

      let shouldExecute = false
      if (order.order_type === "buy" && price <= targetPrice) {
        shouldExecute = true
      } else if (order.order_type === "sell" && price >= targetPrice) {
        shouldExecute = true
      }

      if (shouldExecute) {
        await this.executeLimitOrder(order)
      }
    } catch (error) {
      logger.error(`Error processing limit order ${order.id}:`, error)
    }
  }

  async executeLimitOrder(order) {
    try {
      logger.info(`Executing limit order ${order.id}: ${order.order_type} ${order.amount_eth} ETH`)

      const wallets = await this.database.getUserWallets(order.user_id)
      if (wallets.length === 0) return

      const wallet = wallets[0]
      const walletInstance = this.walletManager.createWalletFromEncrypted(wallet.encrypted_private_key)

      let result
      if (order.order_type === "buy") {
        result = await this.tradingService.buyToken(walletInstance, order.token_address, order.amount_eth)
      } else {
        const tokenBalance = await this.walletManager.getTokenBalance(wallet.address, order.token_address)
        result = await this.tradingService.sellToken(walletInstance, order.token_address, tokenBalance.balance)
      }

      if (result.success) {
        await this.database.saveTrade(
          order.user_id,
          wallet.address,
          order.token_address,
          order.order_type,
          order.amount_eth,
          0,
          order.target_price,
          result.gasUsed,
          result.txHash,
          result.status
        )

        await this.database.updateLimitOrderStatus(order.id, false)
        await this.notifyUser(order.user_id, `✅ Limit order executed!\n\nType: ${order.order_type.toUpperCase()}\nToken: ${order.token_address.slice(0, 8)}...${order.token_address.slice(-6)}\nAmount: ${order.amount_eth} ETH\nPrice: ${order.target_price} ETH\nTx: ${result.txHash}`)
      } else {
        await this.notifyUser(order.user_id, `❌ Limit order failed: ${result.error}`)
      }
    } catch (error) {
      logger.error(`Error executing limit order ${order.id}:`, error)
      await this.notifyUser(order.user_id, `❌ Limit order error: ${error.message}`)
    }
  }

  async executeDCASchedules() {
    try {
      const dueSchedules = await this.database.getDueDCASchedules()
      for (const schedule of dueSchedules) {
        await this.processDCASchedule(schedule)
      }
    } catch (error) {
      logger.error("Error executing DCA schedules:", error)
    }
  }

  async processDCASchedule(schedule) {
    try {
      logger.info(`Executing DCA schedule ${schedule.id}: ${schedule.amount_eth} ETH`)

      const wallets = await this.database.getUserWallets(schedule.user_id)
      if (wallets.length === 0) return

      const wallet = wallets[0]
      const walletInstance = this.walletManager.createWalletFromEncrypted(wallet.encrypted_private_key)

      const result = await this.tradingService.buyToken(walletInstance, schedule.token_address, schedule.amount_eth)

      if (result.success) {
        await this.database.saveTrade(
          schedule.user_id,
          wallet.address,
          schedule.token_address,
          "buy",
          schedule.amount_eth,
          0,
          0,
          result.gasUsed,
          result.txHash,
          result.status
        )

        const nextExecution = new Date(Date.now() + schedule.interval_hours * 60 * 60 * 1000)
        await this.database.updateDCANextExecution(schedule.id, nextExecution)

        await this.notifyUser(schedule.user_id, `✅ DCA purchase executed!\n\nToken: ${schedule.token_address.slice(0, 8)}...${schedule.token_address.slice(-6)}\nAmount: ${schedule.amount_eth} ETH\nNext: ${nextExecution.toLocaleString()}\nTx: ${result.txHash}`)
      } else {
        await this.notifyUser(schedule.user_id, `❌ DCA purchase failed: ${result.error}`)
      }
    } catch (error) {
      logger.error(`Error executing DCA schedule ${schedule.id}:`, error)
      await this.notifyUser(schedule.user_id, `❌ DCA error: ${error.message}`)
    }
  }

  async notifyUser(userId, message) {
    try {
      const user = await this.database.getUser(userId)
      if (user && user.telegram_id) {
        await this.bot.sendMessage(user.telegram_id, message)
      }
    } catch (error) {
      logger.error(`Error notifying user ${userId}:`, error)
    }
  }
}

module.exports = BackgroundService
