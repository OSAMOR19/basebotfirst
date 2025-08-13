const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const fs = require("fs")
const logger = require("../utils/logger")

class Database {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || "./data/bot.db"
    this.db = null
  }

  async init() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.error("Database connection error:", err)
          reject(err)
        } else {
          logger.info("Connected to SQLite database")
          this.createTables().then(resolve).catch(reject)
        }
      })
    })
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                telegram_id TEXT UNIQUE NOT NULL,
                username TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                referral_code TEXT UNIQUE,
                referred_by TEXT,
                total_volume REAL DEFAULT 0,
                total_trades INTEGER DEFAULT 0
            )`,

      // Wallets table
      `CREATE TABLE IF NOT EXISTS wallets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                address TEXT NOT NULL,
                encrypted_private_key TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

      // Trades table
      `CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                wallet_address TEXT,
                token_address TEXT,
                trade_type TEXT, -- 'buy' or 'sell'
                amount_eth REAL,
                amount_tokens REAL,
                price REAL,
                gas_used REAL,
                tx_hash TEXT,
                status TEXT, -- 'pending', 'success', 'failed'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

      // Sniper targets table
      `CREATE TABLE IF NOT EXISTS sniper_targets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                token_address TEXT,
                buy_amount_eth REAL,
                max_gas_price REAL,
                slippage REAL DEFAULT 5.0,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

      // DCA schedules table
      `CREATE TABLE IF NOT EXISTS dca_schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                token_address TEXT,
                amount_eth REAL,
                interval_hours INTEGER,
                next_execution DATETIME,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

      // Limit orders table
      `CREATE TABLE IF NOT EXISTS limit_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                token_address TEXT,
                order_type TEXT, -- 'buy' or 'sell'
                amount_eth REAL,
                target_price REAL,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,
    ]

    for (const table of tables) {
      await this.run(table)
    }

    logger.info("Database tables created successfully")
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          logger.error("Database run error:", err)
          reject(err)
        } else {
          resolve({ id: this.lastID, changes: this.changes })
        }
      })
    })
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error("Database get error:", err)
          reject(err)
        } else {
          resolve(row)
        }
      })
    })
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error("Database all error:", err)
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }

  // User methods
  async createUser(telegramId, username, referralCode, referredBy = null) {
    const sql = `INSERT INTO users (telegram_id, username, referral_code, referred_by) 
                     VALUES (?, ?, ?, ?)`
    return this.run(sql, [telegramId, username, referralCode, referredBy])
  }

  async getUser(telegramId) {
    const sql = `SELECT * FROM users WHERE telegram_id = ?`
    return this.get(sql, [telegramId])
  }

  async updateUserStats(telegramId, volume, trades) {
    const sql = `UPDATE users SET total_volume = total_volume + ?, total_trades = total_trades + ? 
                     WHERE telegram_id = ?`
    return this.run(sql, [volume, trades, telegramId])
  }

  // Wallet methods
  async saveWallet(userId, address, encryptedPrivateKey) {
    const sql = `INSERT INTO wallets (user_id, address, encrypted_private_key) 
                     VALUES (?, ?, ?)`
    return this.run(sql, [userId, address, encryptedPrivateKey])
  }

  async getUserWallets(userId) {
    const sql = `SELECT * FROM wallets WHERE user_id = ? AND is_active = 1`
    return this.all(sql, [userId])
  }

  async getActiveWallet(userId) {
    const sql = `SELECT * FROM wallets WHERE user_id = ? AND is_active = 1 LIMIT 1`
    return this.get(sql, [userId])
  }

  // Trade methods
  async saveTrade(
    userId,
    walletAddress,
    tokenAddress,
    tradeType,
    amountEth,
    amountTokens,
    price,
    gasUsed,
    txHash,
    status,
  ) {
    const sql = `INSERT INTO trades (user_id, wallet_address, token_address, trade_type, amount_eth, amount_tokens, price, gas_used, tx_hash, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    return this.run(sql, [
      userId,
      walletAddress,
      tokenAddress,
      tradeType,
      amountEth,
      amountTokens,
      price,
      gasUsed,
      txHash,
      status,
    ])
  }

  async getUserTrades(userId, limit = 10) {
    const sql = `SELECT * FROM trades WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    return this.all(sql, [userId, limit])
  }

  async updateTradeStatus(txHash, status) {
    const sql = `UPDATE trades SET status = ? WHERE tx_hash = ?`
    return this.run(sql, [status, txHash])
  }

  // Limit Order methods
  async saveLimitOrder(userId, tokenAddress, orderType, amountEth, targetPrice) {
    const sql = `INSERT INTO limit_orders (user_id, token_address, order_type, amount_eth, target_price) 
                     VALUES (?, ?, ?, ?, ?)`
    return this.run(sql, [userId, tokenAddress, orderType, amountEth, targetPrice])
  }

  async getActiveLimitOrders(userId = null) {
    let sql = `SELECT * FROM limit_orders WHERE is_active = 1`
    let params = []
    
    if (userId) {
      sql += ` AND user_id = ?`
      params.push(userId)
    }
    
    sql += ` ORDER BY created_at ASC`
    return this.all(sql, params)
  }

  async updateLimitOrderStatus(orderId, isActive) {
    const sql = `UPDATE limit_orders SET is_active = ? WHERE id = ?`
    return this.run(sql, [isActive ? 1 : 0, orderId])
  }

  async deleteLimitOrder(orderId) {
    const sql = `DELETE FROM limit_orders WHERE id = ?`
    return this.run(sql, [orderId])
  }

  // DCA Schedule methods
  async saveDCASchedule(userId, tokenAddress, amountEth, intervalHours) {
    const nextExecution = new Date(Date.now() + intervalHours * 60 * 60 * 1000)
    const sql = `INSERT INTO dca_schedules (user_id, token_address, amount_eth, interval_hours, next_execution) 
                     VALUES (?, ?, ?, ?, ?)`
    return this.run(sql, [userId, tokenAddress, amountEth, intervalHours, nextExecution.toISOString()])
  }

  async getActiveDCASchedules(userId = null) {
    let sql = `SELECT * FROM dca_schedules WHERE is_active = 1`
    let params = []
    
    if (userId) {
      sql += ` AND user_id = ?`
      params.push(userId)
    }
    
    sql += ` ORDER BY next_execution ASC`
    return this.all(sql, params)
  }

  async getDueDCASchedules() {
    const sql = `SELECT * FROM dca_schedules WHERE is_active = 1 AND next_execution <= datetime('now')`
    return this.all(sql)
  }

  async updateDCANextExecution(scheduleId, nextExecution) {
    const sql = `UPDATE dca_schedules SET next_execution = ? WHERE id = ?`
    return this.run(sql, [nextExecution.toISOString(), scheduleId])
  }

  async updateDCAScheduleStatus(scheduleId, isActive) {
    const sql = `UPDATE dca_schedules SET is_active = ? WHERE id = ?`
    return this.run(sql, [isActive ? 1 : 0, scheduleId])
  }

  async deleteDCASchedule(scheduleId) {
    const sql = `DELETE FROM dca_schedules WHERE id = ?`
    return this.run(sql, [scheduleId])
  }

  // Sniper Target methods
  async saveSniperTarget(userId, tokenAddress, buyAmountEth, maxGasPrice, slippage) {
    const sql = `INSERT INTO sniper_targets (user_id, token_address, buy_amount_eth, max_gas_price, slippage) 
                     VALUES (?, ?, ?, ?, ?)`
    return this.run(sql, [userId, tokenAddress, buyAmountEth, maxGasPrice, slippage])
  }

  async getActiveSniperTargets(userId = null) {
    let sql = `SELECT * FROM sniper_targets WHERE is_active = 1`
    let params = []
    
    if (userId) {
      sql += ` AND user_id = ?`
      params.push(userId)
    }
    
    return this.all(sql, params)
  }

  async updateSniperTargetStatus(targetId, isActive) {
    const sql = `UPDATE sniper_targets SET is_active = ? WHERE id = ?`
    return this.run(sql, [isActive ? 1 : 0, targetId])
  }

  async deleteSniperTarget(targetId) {
    const sql = `DELETE FROM sniper_targets WHERE id = ?`
    return this.run(sql, [targetId])
  }

  close() {
    if (this.db) {
      this.db.close()
    }
  }
}

module.exports = Database
