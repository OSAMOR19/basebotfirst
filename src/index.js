const TelegramBot = require("node-telegram-bot-api")
const { ethers } = require("ethers")
const Database = require("./database/database")
const WalletManager = require("./services/walletManager")
const TradingService = require("./services/tradingService")
const SniperService = require("./services/sniperService")
const BackgroundService = require("./services/backgroundService")
const BotHandlers = require("./handlers/botHandlers")
const logger = require("./utils/logger")
require("dotenv").config()

class BaseTradingBot {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })
    this.database = new Database()
    this.walletManager = new WalletManager()
    this.tradingService = new TradingService()
    this.sniperService = new SniperService()
    this.backgroundService = new BackgroundService(
      this.database,
      this.tradingService,
      this.walletManager,
      this.bot
    )
    this.handlers = new BotHandlers(
      this.bot,
      this.database,
      this.walletManager,
      this.tradingService,
      this.sniperService,
    )

    this.init()
  }

  async init() {
    try {
      // Initialize database
      await this.database.init()

      // Initialize blockchain connection
      await this.initBlockchain()

      // Setup bot handlers
      this.setupHandlers()

      // Start sniper service with error handling
      try {
        await this.sniperService.start()
        logger.info("Sniper service started successfully")
      } catch (sniperError) {
        logger.error("Failed to start sniper service:", sniperError)
        logger.warn("Bot will continue without sniper functionality")
      }

      // Start background service for limit orders and DCA
      try {
        await this.backgroundService.start()
        logger.info("Background service started successfully")
      } catch (backgroundError) {
        logger.error("Failed to start background service:", backgroundError)
        logger.warn("Bot will continue without background services")
      }

      logger.info("Base Trading Bot initialized successfully")
      console.log("🚀 Base Trading Bot is running...")
      console.log("📱 Find your bot on Telegram and send /start to begin!")
    } catch (error) {
      logger.error("Failed to initialize bot:", error)
      process.exit(1)
    }
  }

  async initBlockchain() {
    const rpcUrl = process.env.TESTNET_MODE === "true" ? process.env.BASE_TESTNET_RPC_URL : process.env.BASE_RPC_URL

    this.provider = new ethers.JsonRpcProvider(rpcUrl)

    // Test connection
    const network = await this.provider.getNetwork()
    logger.info(`Connected to Base network: ${network.name} (Chain ID: ${network.chainId})`)
  }

  setupHandlers() {
    // Command handlers
    this.bot.onText(/\/start/, this.handlers.handleStart.bind(this.handlers))
    this.bot.onText(/\/wallet/, this.handlers.handleWallet.bind(this.handlers))
    this.bot.onText(/\/buy/, this.handlers.handleBuy.bind(this.handlers))
    this.bot.onText(/\/sell/, this.handlers.handleSell.bind(this.handlers))
    this.bot.onText(/\/positions/, this.handlers.handlePositions.bind(this.handlers))
    this.bot.onText(/\/pnl/, this.handlers.handlePNL.bind(this.handlers))
    this.bot.onText(/\/sniper/, this.handlers.handleSniper.bind(this.handlers))
    this.bot.onText(/\/limit/, this.handlers.handleLimitOrders.bind(this.handlers))
    this.bot.onText(/\/dca/, this.handlers.handleDCA.bind(this.handlers))
    this.bot.onText(/\/analyze/, this.handlers.handleAnalyze.bind(this.handlers))
    this.bot.onText(/\/ref/, this.handlers.handleReferral.bind(this.handlers))
    this.bot.onText(/\/settings/, this.handlers.handleSettings.bind(this.handlers))

    // Callback query handler for inline keyboards
    this.bot.on("callback_query", this.handlers.handleCallbackQuery.bind(this.handlers))

    // Message handler for user inputs
    this.bot.on("message", this.handlers.handleMessage.bind(this.handlers))

    // Error handler
    this.bot.on("error", (error) => {
      logger.error("Telegram bot error:", error)
    })
  }
}

// Start the bot
const bot = new BaseTradingBot()

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...')
  try {
    await bot.sniperService.stop()
    await bot.backgroundService.stop()
    process.exit(0)
  } catch (error) {
    logger.error('Error during shutdown:', error)
    process.exit(1)
  }
})

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...')
  try {
    await bot.sniperService.stop()
    await bot.backgroundService.stop()
    process.exit(0)
  } catch (error) {
    logger.error('Error during shutdown:', error)
    process.exit(1)
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})
