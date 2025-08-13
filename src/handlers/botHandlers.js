const { generateReferralCode } = require("../utils/helpers")
const logger = require("../utils/logger")

class BotHandlers {
  constructor(bot, database, walletManager, tradingService, sniperService) {
    this.bot = bot
    this.db = database
    this.walletManager = walletManager
    this.tradingService = tradingService
    this.sniperService = sniperService
    this.userStates = new Map() // Track user conversation states
  }

  // Handle /start command
  async handleStart(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()
    const username = msg.from.username || msg.from.first_name

    try {
      // Check if user exists
      let user = await this.db.getUser(telegramId)

      if (!user) {
        // Create new user
        const referralCode = generateReferralCode()
        await this.db.createUser(telegramId, username, referralCode)
        user = await this.db.getUser(telegramId)
      }

      const welcomeMessage = `
🚀 *Welcome to Base Trading Bot!*

Your secure trading companion for Base blockchain.

*Main Features:*
• 💰 Buy/Sell tokens instantly
• 🎯 Auto-sniper for new launches
• 📊 Portfolio tracking & PNL
• 📋 Limit orders & DCA
• 👛 Secure wallet management

*Quick Actions:*
            `

      const keyboard = {
        inline_keyboard: [
          [
            { text: "💰 Buy", callback_data: "buy_menu" },
            { text: "💸 Sell", callback_data: "sell_menu" },
          ],
          [
            { text: "🎯 Auto Sniper", callback_data: "sniper_menu" },
            { text: "👛 Wallet", callback_data: "wallet_menu" },
          ],
          [
            { text: "📋 Limit Orders", callback_data: "limit_orders" },
            { text: "🔄 DCA", callback_data: "dca" },
          ],
          [
            { text: "📊 Positions", callback_data: "positions" },
            { text: "📈 PNL", callback_data: "pnl" },
          ],
          [
            { text: "🔗 Referral", callback_data: "referral" },
            { text: "⚙️ Settings", callback_data: "settings" },
          ],
        ],
      }

      await this.bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      })
    } catch (error) {
      logger.error("Error in handleStart:", error)
      await this.bot.sendMessage(chatId, "❌ An error occurred. Please try again.")
    }
  }

  // Handle wallet commands
  async handleWallet(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()

    try {
      const user = await this.db.getUser(telegramId)
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Please start the bot first with /start")
        return
      }

      const wallets = await this.db.getUserWallets(user.id)

      let message = "👛 *Wallet Management*\n\n"

      if (wallets.length > 0) {
        message += "*Your Wallets:*\n"
        for (const wallet of wallets) {
          const balance = await this.walletManager.getBalance(wallet.address)
          message += `• \`${wallet.address}\`\n  Balance: ${Number.parseFloat(balance).toFixed(4)} ETH\n\n`
        }
      } else {
        message += "No wallets found. Create or import one below.\n\n"
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: "🆕 Generate New", callback_data: "generate_wallet" },
            { text: "📥 Import Existing", callback_data: "import_wallet" },
          ],
          [{ text: "🔄 Refresh Balances", callback_data: "refresh_balances" }],
          [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
        ],
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      })
    } catch (error) {
      logger.error("Error in handleWallet:", error)
      await this.bot.sendMessage(chatId, "❌ Error loading wallet information.")
    }
  }

  // Handle buy commands
  async handleBuy(msg) {
    const chatId = msg.chat.id
    await this.showBuyMenu(chatId)
  }

  async showBuyMenu(chatId) {
    const message = `
💰 *Buy Tokens*

Select amount or enter custom:
        `

    const keyboard = {
      inline_keyboard: [
        [
          { text: "0.1 ETH", callback_data: "buy_0.1" },
          { text: "0.2 ETH", callback_data: "buy_0.2" },
        ],
        [
          { text: "0.5 ETH", callback_data: "buy_0.5" },
          { text: "1 ETH", callback_data: "buy_1" },
        ],
        [{ text: "💡 Custom Amount", callback_data: "buy_custom" }],
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
      ],
    }

    await this.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    })
  }

  // Handle sell commands
  async handleSell(msg) {
    const chatId = msg.chat.id
    await this.showSellMenu(chatId)
  }

  async showSellMenu(chatId) {
    const message = `
💸 *Sell Tokens*

Select percentage or custom amount:
        `

    const keyboard = {
      inline_keyboard: [
        [
          { text: "10%", callback_data: "sell_10" },
          { text: "25%", callback_data: "sell_25" },
        ],
        [
          { text: "50%", callback_data: "sell_50" },
          { text: "100%", callback_data: "sell_100" },
        ],
        [{ text: "💡 Custom Amount", callback_data: "sell_custom" }],
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
      ],
    }

    await this.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    })
  }

  // Handle positions
  async handlePositions(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()

    try {
      const user = await this.db.getUser(telegramId)
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Please start the bot first with /start")
        return
      }

      const trades = await this.db.getUserTrades(user.id, 50)

      if (trades.length === 0) {
        await this.bot.sendMessage(chatId, "📊 No positions found. Start trading to see your portfolio!")
        return
      }

      // Group trades by token
      const positions = {}
      for (const trade of trades) {
        if (!positions[trade.token_address]) {
          positions[trade.token_address] = {
            tokenAddress: trade.token_address,
            totalBought: 0,
            totalSold: 0,
            ethInvested: 0,
            ethReceived: 0,
          }
        }

        if (trade.trade_type === "buy") {
          positions[trade.token_address].totalBought += Number.parseFloat(trade.amount_tokens || 0)
          positions[trade.token_address].ethInvested += Number.parseFloat(trade.amount_eth)
        } else {
          positions[trade.token_address].totalSold += Number.parseFloat(trade.amount_tokens || 0)
          positions[trade.token_address].ethReceived += Number.parseFloat(trade.amount_eth)
        }
      }

      let message = "📊 *Your Positions*\n\n"

      for (const [tokenAddress, position] of Object.entries(positions)) {
        const currentHolding = position.totalBought - position.totalSold
        if (currentHolding > 0) {
          const avgBuyPrice = position.ethInvested / position.totalBought
          message += `🪙 \`${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-6)}\`\n`
          message += `   Holdings: ${currentHolding.toFixed(4)} tokens\n`
          message += `   Avg Buy: ${avgBuyPrice.toFixed(6)} ETH\n`
          message += `   Invested: ${position.ethInvested.toFixed(4)} ETH\n\n`
        }
      }

      if (message === "📊 *Your Positions*\n\n") {
        message += "No active positions found."
      }

      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
    } catch (error) {
      logger.error("Error in handlePositions:", error)
      await this.bot.sendMessage(chatId, "❌ Error loading positions.")
    }
  }

  // Handle PNL
  async handlePNL(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()

    try {
      const user = await this.db.getUser(telegramId)
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Please start the bot first with /start")
        return
      }

      const trades = await this.db.getUserTrades(user.id, 100)

      if (trades.length === 0) {
        await this.bot.sendMessage(chatId, "📈 No trades found. Start trading to see your PNL!")
        return
      }

      const pnl = await this.tradingService.calculatePNL(trades)

      const pnlEmoji = pnl.pnl >= 0 ? "📈" : "📉"
      const pnlColor = pnl.pnl >= 0 ? "🟢" : "🔴"

      const message = `
📈 *Profit & Loss Report*

${pnlColor} *Total PNL:* ${pnl.pnl.toFixed(4)} ETH (${pnl.pnlPercentage.toFixed(2)}%)

💰 *Total Invested:* ${pnl.totalInvested.toFixed(4)} ETH
💸 *Total Received:* ${pnl.totalReceived.toFixed(4)} ETH
📊 *Total Trades:* ${trades.length}

${pnlEmoji} Keep trading smart!
            `

      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
    } catch (error) {
      logger.error("Error in handlePNL:", error)
      await this.bot.sendMessage(chatId, "❌ Error calculating PNL.")
    }
  }

  // Handle sniper
  async handleSniper(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()

    try {
      const user = await this.db.getUser(telegramId)
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Please start the bot first with /start")
        return
      }

      const activeTargets = this.sniperService.getUserTargets(user.id)

      let message = "🎯 *Auto Sniper*\n\n"

      if (activeTargets.length > 0) {
        message += "*Active Targets:*\n"
        for (const target of activeTargets) {
          message += `• \`${target.tokenAddress.slice(0, 8)}...${target.tokenAddress.slice(-6)}\`\n`
          message += `  Amount: ${target.buyAmountEth} ETH\n`
          message += `  Slippage: ${target.slippage}%\n\n`
        }
      } else {
        message += "No active sniper targets.\n\n"
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: "➕ Add Target", callback_data: "add_sniper_target" }],
          [{ text: "🗑️ Remove Target", callback_data: "remove_sniper_target" }],
          [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
        ],
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      })
    } catch (error) {
      logger.error("Error in handleSniper:", error)
      await this.bot.sendMessage(chatId, "❌ Error loading sniper information.")
    }
  }

  // Handle referral
  async handleReferral(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()

    try {
      const user = await this.db.getUser(telegramId)
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Please start the bot first with /start")
        return
      }

      const referralLink = `https://t.me/your_bot_username?start=${user.referral_code}`

      const message = `
🔗 *Referral System*

*Your Referral Link:*
\`${referralLink}\`

*Stats:*
• Total Volume: ${user.total_volume.toFixed(4)} ETH
• Total Trades: ${user.total_trades}

*Rewards:*
• Earn ${process.env.REFERRAL_REWARD_PERCENTAGE * 100}% of referred users' trading fees
• Unlimited referrals
• Real-time tracking

Share your link and start earning! 💰
            `

      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
    } catch (error) {
      logger.error("Error in handleReferral:", error)
      await this.bot.sendMessage(chatId, "❌ Error loading referral information.")
    }
  }

  // Handle settings
  async handleSettings(msg) {
    const chatId = msg.chat.id

    const message = `
⚙️ *Settings*

Configure your trading preferences:
        `

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🎯 Default Slippage", callback_data: "set_slippage" },
          { text: "⛽ Gas Settings", callback_data: "set_gas" },
        ],
        [{ text: "🔔 Notifications", callback_data: "set_notifications" }],
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
      ],
    }

    await this.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    })
  }

  // Handle limit orders
  async handleLimitOrders(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()

    try {
      const user = await this.db.getUser(telegramId)
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Please start the bot first with /start")
        return
      }

      const activeOrders = await this.db.getActiveLimitOrders(user.id)

      let message = "📋 *Limit Orders*\n\n"

      if (activeOrders.length > 0) {
        message += "*Active Orders:*\n"
        for (const order of activeOrders) {
          message += `• ${order.order_type.toUpperCase()} \`${order.token_address.slice(0, 8)}...${order.token_address.slice(-6)}\`\n`
          message += `  Amount: ${order.amount_eth} ETH\n`
          message += `  Target: ${order.target_price} ETH\n\n`
        }
      } else {
        message += "No active limit orders.\n\n"
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: "➕ Create Buy Order", callback_data: "create_buy_limit" }],
          [{ text: "➕ Create Sell Order", callback_data: "create_sell_limit" }],
          [{ text: "🗑️ Cancel Order", callback_data: "cancel_limit_order" }],
          [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
        ],
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      })
    } catch (error) {
      logger.error("Error in handleLimitOrders:", error)
      await this.bot.sendMessage(chatId, "❌ Error loading limit orders.")
    }
  }

  // Handle DCA
  async handleDCA(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()

    try {
      const user = await this.db.getUser(telegramId)
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Please start the bot first with /start")
        return
      }

      const activeSchedules = await this.db.getActiveDCASchedules(user.id)

      let message = "🔄 *Dollar Cost Averaging*\n\n"

      if (activeSchedules.length > 0) {
        message += "*Active Schedules:*\n"
        for (const schedule of activeSchedules) {
          const nextExec = new Date(schedule.next_execution)
          message += `• \`${schedule.token_address.slice(0, 8)}...${schedule.token_address.slice(-6)}\`\n`
          message += `  Amount: ${schedule.amount_eth} ETH\n`
          message += `  Interval: ${schedule.interval_hours}h\n`
          message += `  Next: ${nextExec.toLocaleString()}\n\n`
        }
      } else {
        message += "No active DCA schedules.\n\n"
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: "➕ Create DCA Schedule", callback_data: "create_dca" }],
          [{ text: "🗑️ Cancel Schedule", callback_data: "cancel_dca" }],
          [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
        ],
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      })
    } catch (error) {
      logger.error("Error in handleDCA:", error)
      await this.bot.sendMessage(chatId, "❌ Error loading DCA schedules.")
    }
  }

  // Handle callback queries (button presses)
  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id
    const data = callbackQuery.data
    const telegramId = callbackQuery.from.id.toString()

    try {
      await this.bot.answerCallbackQuery(callbackQuery.id)

      switch (data) {
        case "main_menu":
          await this.handleStart({ chat: { id: chatId }, from: callbackQuery.from })
          break

        case "buy_menu":
          await this.showBuyMenu(chatId)
          break

        case "sell_menu":
          await this.showSellMenu(chatId)
          break

        case "wallet_menu":
          await this.handleWallet({ chat: { id: chatId }, from: callbackQuery.from })
          break

        case "generate_wallet":
          await this.generateNewWallet(chatId, telegramId)
          break

        case "import_wallet":
          await this.startWalletImport(chatId, telegramId)
          break

        case "positions":
          await this.handlePositions({ chat: { id: chatId }, from: callbackQuery.from })
          break

        case "pnl":
          await this.handlePNL({ chat: { id: chatId }, from: callbackQuery.from })
          break

        case "sniper_menu":
          await this.handleSniper({ chat: { id: chatId }, from: callbackQuery.from })
          break

        case "referral":
          await this.handleReferral({ chat: { id: chatId }, from: callbackQuery.from })
          break

        case "settings":
          await this.handleSettings({ chat: { id: chatId }, from: callbackQuery.from })
          break

        case "limit_orders":
          await this.handleLimitOrders({ chat: { id: chatId }, from: callbackQuery.from })
          break

        case "dca":
          await this.handleDCA({ chat: { id: chatId }, from: callbackQuery.from })
          break

        case "create_buy_limit":
          await this.startCreateLimitOrder(chatId, telegramId, "buy")
          break

        case "create_sell_limit":
          await this.startCreateLimitOrder(chatId, telegramId, "sell")
          break

        case "create_dca":
          await this.startCreateDCASchedule(chatId, telegramId)
          break

        default:
          if (data.startsWith("buy_")) {
            await this.handleBuyAmount(chatId, telegramId, data)
          } else if (data.startsWith("sell_")) {
            await this.handleSellAmount(chatId, telegramId, data)
          }
          break
      }
    } catch (error) {
      logger.error("Error in handleCallbackQuery:", error)
      await this.bot.sendMessage(chatId, "❌ An error occurred. Please try again.")
    }
  }

  // Generate new wallet
  async generateNewWallet(chatId, telegramId) {
    try {
      const user = await this.db.getUser(telegramId)
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Please start the bot first with /start")
        return
      }

      const wallet = this.walletManager.generateWallet()
      const encryptedPrivateKey = this.walletManager.encryptPrivateKey(wallet.privateKey)

      await this.db.saveWallet(user.id, wallet.address, encryptedPrivateKey)

      const message = `
✅ *New Wallet Generated!*

*Address:* \`${wallet.address}\`

*Mnemonic Phrase:*
\`${wallet.mnemonic}\`

⚠️ *IMPORTANT:* Save your mnemonic phrase securely! This is the only way to recover your wallet.

Your private key is encrypted and stored securely.
            `

      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
    } catch (error) {
      logger.error("Error generating wallet:", error)
      await this.bot.sendMessage(chatId, "❌ Error generating wallet. Please try again.")
    }
  }

  // Start wallet import process
  async startWalletImport(chatId, telegramId) {
    this.userStates.set(telegramId, { action: "import_wallet" })

    await this.bot.sendMessage(
      chatId,
      `
📥 *Import Wallet*

Please send your private key (it will be encrypted and stored securely):

⚠️ Make sure you're in a private chat and delete the message after sending.
        `,
      { parse_mode: "Markdown" },
    )
  }

  // Handle buy amount selection
  async handleBuyAmount(chatId, telegramId, data) {
    const amount = data.replace("buy_", "")

    if (amount === "custom") {
      this.userStates.set(telegramId, { action: "buy_custom" })
      await this.bot.sendMessage(chatId, "💰 Enter the amount of ETH you want to spend:")
      return
    }

    // Set state for token address input
    this.userStates.set(telegramId, { action: "buy_token", amount: Number.parseFloat(amount) })
    await this.bot.sendMessage(chatId, `💰 Enter the token contract address to buy ${amount} ETH worth:`)
  }

  // Handle sell amount selection
  async handleSellAmount(chatId, telegramId, data) {
    const percentage = data.replace("sell_", "")

    if (percentage === "custom") {
      this.userStates.set(telegramId, { action: "sell_custom" })
      await this.bot.sendMessage(chatId, "💸 Enter the amount or percentage to sell:")
      return
    }

    // Set state for token address input
    this.userStates.set(telegramId, { action: "sell_token", percentage: Number.parseFloat(percentage) })
    await this.bot.sendMessage(chatId, `💸 Enter the token contract address to sell ${percentage}%:`)
  }

  // Handle regular messages (user inputs)
  async handleMessage(msg) {
    const chatId = msg.chat.id
    const telegramId = msg.from.id.toString()
    const text = msg.text

    // Skip if it's a command
    if (text && text.startsWith("/")) {
      return
    }

    const userState = this.userStates.get(telegramId)
    if (!userState) {
      return
    }

    try {
      switch (userState.action) {
        case "import_wallet":
          await this.processWalletImport(chatId, telegramId, text)
          break

        case "buy_custom":
          await this.processBuyCustomAmount(chatId, telegramId, text)
          break

        case "buy_token":
          await this.processBuyToken(chatId, telegramId, text, userState.amount)
          break

        case "sell_custom":
          await this.processSellCustomAmount(chatId, telegramId, text)
          break

        case "sell_token":
          await this.processSellToken(chatId, telegramId, text, userState.percentage)
          break

        case "limit_order_type":
          await this.processLimitOrderToken(chatId, telegramId, text, userState.orderType)
          break

        case "limit_order_amount":
          await this.processLimitOrderAmount(chatId, telegramId, text, userState.orderType, userState.tokenAddress)
          break

        case "limit_order_price":
          await this.processLimitOrderPrice(chatId, telegramId, text, userState.orderType, userState.tokenAddress, userState.amount)
          break

        case "dca_token":
          await this.processDCAToken(chatId, telegramId, text)
          break

        case "dca_amount":
          await this.processDCAAmount(chatId, telegramId, text, userState.tokenAddress)
          break

        case "dca_interval":
          await this.processDCAInterval(chatId, telegramId, text, userState.tokenAddress, userState.amount)
          break
      }
    } catch (error) {
      logger.error("Error in handleMessage:", error)
      await this.bot.sendMessage(chatId, "❌ An error occurred processing your request.")
    }
  }

  // Process wallet import
  async processWalletImport(chatId, telegramId, privateKey) {
    try {
      const user = await this.db.getUser(telegramId)
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Please start the bot first with /start")
        return
      }

      const wallet = this.walletManager.importWallet(privateKey)
      const encryptedPrivateKey = this.walletManager.encryptPrivateKey(wallet.privateKey)

      await this.db.saveWallet(user.id, wallet.address, encryptedPrivateKey)

      this.userStates.delete(telegramId)

      await this.bot.sendMessage(
        chatId,
        `
✅ *Wallet Imported Successfully!*

*Address:* \`${wallet.address}\`

Your private key has been encrypted and stored securely.
            `,
        { parse_mode: "Markdown" },
      )
    } catch (error) {
      logger.error("Error importing wallet:", error)
      await this.bot.sendMessage(chatId, "❌ Invalid private key. Please try again.")
    }
  }

  // Process custom buy amount
  async processBuyCustomAmount(chatId, telegramId, amountText) {
    try {
      const amount = Number.parseFloat(amountText)
      if (isNaN(amount) || amount <= 0) {
        await this.bot.sendMessage(chatId, "❌ Please enter a valid amount.")
        return
      }

      this.userStates.set(telegramId, { action: "buy_token", amount })
      await this.bot.sendMessage(chatId, `💰 Enter the token contract address to buy ${amount} ETH worth:`)
    } catch (error) {
      await this.bot.sendMessage(chatId, "❌ Please enter a valid number.")
    }
  }

  // Process buy token
  async processBuyToken(chatId, telegramId, tokenAddress, amount) {
    try {
      if (!this.walletManager.isValidAddress(tokenAddress)) {
        await this.bot.sendMessage(chatId, "❌ Invalid token address. Please try again.")
        return
      }

      const user = await this.db.getUser(telegramId)
      const wallet = await this.db.getActiveWallet(user.id)

      if (!wallet) {
        await this.bot.sendMessage(chatId, "❌ No wallet found. Please create or import a wallet first.")
        return
      }

      this.userStates.delete(telegramId)

      await this.bot.sendMessage(
        chatId,
        `
🔄 *Processing Buy Order*

Token: \`${tokenAddress}\`
Amount: ${amount} ETH

Please wait...
            `,
        { parse_mode: "Markdown" },
      )

      // Execute the trade (this would be implemented with actual trading logic)
      // For now, just simulate
      await this.bot.sendMessage(
        chatId,
        `
✅ *Buy Order Submitted*

Transaction will be processed shortly. You'll receive a confirmation once completed.
            `,
      )
    } catch (error) {
      logger.error("Error processing buy token:", error)
      await this.bot.sendMessage(chatId, "❌ Error processing buy order.")
    }
  }

  // Similar methods for sell operations...
  async processSellCustomAmount(chatId, telegramId, amountText) {
    // Implementation similar to processBuyCustomAmount
  }

  async processSellToken(chatId, telegramId, tokenAddress, percentage) {
    // Implementation similar to processBuyToken but for selling
  }

  // Start creating limit order
  async startCreateLimitOrder(chatId, telegramId, orderType) {
    this.userStates.set(telegramId, { action: "limit_order_type", orderType })
    
    const message = `📋 *Create ${orderType.toUpperCase()} Limit Order*\n\nPlease enter the token contract address:`
    
    await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
  }

  // Start creating DCA schedule
  async startCreateDCASchedule(chatId, telegramId) {
    this.userStates.set(telegramId, { action: "dca_token" })
    
    const message = `🔄 *Create DCA Schedule*\n\nPlease enter the token contract address:`
    
    await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
  }

  // Process limit order token address
  async processLimitOrderToken(chatId, telegramId, tokenAddress, orderType) {
    try {
      if (!this.walletManager.isValidAddress(tokenAddress)) {
        await this.bot.sendMessage(chatId, "❌ Invalid token address. Please try again.")
        return
      }

      this.userStates.set(telegramId, { action: "limit_order_amount", orderType, tokenAddress })
      await this.bot.sendMessage(chatId, `💰 Enter the amount of ETH for the ${orderType} order:`)
    } catch (error) {
      logger.error("Error processing limit order token:", error)
      await this.bot.sendMessage(chatId, "❌ Error processing token address.")
    }
  }

  // Process limit order amount
  async processLimitOrderAmount(chatId, telegramId, amountText, orderType, tokenAddress) {
    try {
      const amount = Number.parseFloat(amountText)
      if (isNaN(amount) || amount <= 0) {
        await this.bot.sendMessage(chatId, "❌ Please enter a valid amount.")
        return
      }

      this.userStates.set(telegramId, { action: "limit_order_price", orderType, tokenAddress, amount })
      await this.bot.sendMessage(chatId, `🎯 Enter the target price in ETH for the ${orderType} order:`)
    } catch (error) {
      await this.bot.sendMessage(chatId, "❌ Please enter a valid number.")
    }
  }

  // Process limit order price
  async processLimitOrderPrice(chatId, telegramId, priceText, orderType, tokenAddress, amount) {
    try {
      const price = Number.parseFloat(priceText)
      if (isNaN(price) || price <= 0) {
        await this.bot.sendMessage(chatId, "❌ Please enter a valid price.")
        return
      }

      const user = await this.db.getUser(telegramId)
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Please start the bot first with /start")
        return
      }

      // Save limit order to database
      await this.db.saveLimitOrder(user.id, tokenAddress, orderType, amount, price)

      this.userStates.delete(telegramId)

      const message = `
✅ *Limit Order Created!*

*Type:* ${orderType.toUpperCase()}
*Token:* \`${tokenAddress}\`
*Amount:* ${amount} ETH
*Target Price:* ${price} ETH

Your order will be executed when the market price reaches your target.
        `

      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
    } catch (error) {
      logger.error("Error creating limit order:", error)
      await this.bot.sendMessage(chatId, "❌ Error creating limit order.")
    }
  }

  // Process DCA token address
  async processDCAToken(chatId, telegramId, tokenAddress) {
    try {
      if (!this.walletManager.isValidAddress(tokenAddress)) {
        await this.bot.sendMessage(chatId, "❌ Invalid token address. Please try again.")
        return
      }

      this.userStates.set(telegramId, { action: "dca_amount", tokenAddress })
      await this.bot.sendMessage(chatId, `💰 Enter the amount of ETH to buy each time:`)
    } catch (error) {
      logger.error("Error processing DCA token:", error)
      await this.bot.sendMessage(chatId, "❌ Error processing token address.")
    }
  }

  // Process DCA amount
  async processDCAAmount(chatId, telegramId, amountText, tokenAddress) {
    try {
      const amount = Number.parseFloat(amountText)
      if (isNaN(amount) || amount <= 0) {
        await this.bot.sendMessage(chatId, "❌ Please enter a valid amount.")
        return
      }

      this.userStates.set(telegramId, { action: "dca_interval", tokenAddress, amount })
      await this.bot.sendMessage(chatId, `⏰ Enter the interval in hours between purchases:`)
    } catch (error) {
      await this.bot.sendMessage(chatId, "❌ Please enter a valid number.")
    }
  }

  // Process DCA interval
  async processDCAInterval(chatId, telegramId, intervalText, tokenAddress, amount) {
    try {
      const interval = Number.parseFloat(intervalText)
      if (isNaN(interval) || interval <= 0) {
        await this.bot.sendMessage(chatId, "❌ Please enter a valid interval.")
        return
      }

      const user = await this.db.getUser(telegramId)
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Please start the bot first with /start")
        return
      }

      // Save DCA schedule to database
      await this.db.saveDCASchedule(user.id, tokenAddress, amount, interval)

      this.userStates.delete(telegramId)

      const message = `
✅ *DCA Schedule Created!*

*Token:* \`${tokenAddress}\`
*Amount:* ${amount} ETH
*Interval:* ${interval} hours

Your DCA schedule will automatically buy ${amount} ETH worth of tokens every ${interval} hours.
        `

      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
    } catch (error) {
      logger.error("Error creating DCA schedule:", error)
      await this.bot.sendMessage(chatId, "❌ Error creating DCA schedule.")
    }
  }
}

module.exports = BotHandlers
