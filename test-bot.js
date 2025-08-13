// Simple test script to verify everything works
const TelegramBot = require("node-telegram-bot-api")
const { ethers } = require("ethers")
require("dotenv").config()

async function testBot() {
  console.log("🧪 Testing Base Trading Bot Setup...\n")

  // Test 1: Environment Variables
  console.log("1. Checking environment variables...")
  const requiredVars = ["TELEGRAM_BOT_TOKEN", "BASE_RPC_URL", "ENCRYPTION_KEY"]

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: Set`)
    } else {
      console.log(`   ❌ ${varName}: Missing`)
      return
    }
  }

  // Test 2: Telegram Bot Connection
  console.log("\n2. Testing Telegram bot connection...")
  try {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN)
    const me = await bot.getMe()
    console.log(`   ✅ Bot connected: @${me.username}`)
    console.log(`   📝 Bot name: ${me.first_name}`)
  } catch (error) {
    console.log(`   ❌ Telegram connection failed: ${error.message}`)
    return
  }

  // Test 3: Base RPC Connection
  console.log("\n3. Testing Base blockchain connection...")
  try {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL)
    const network = await provider.getNetwork()
    const blockNumber = await provider.getBlockNumber()
    console.log(`   ✅ Connected to Base network`)
    console.log(`   🔗 Chain ID: ${network.chainId}`)
    console.log(`   📦 Latest block: ${blockNumber}`)
  } catch (error) {
    console.log(`   ❌ Base connection failed: ${error.message}`)
    return
  }

  // Test 4: Database Setup
  console.log("\n4. Testing database setup...")
  try {
    const Database = require("./src/database/database")
    const db = new Database()
    await db.init()
    console.log("   ✅ Database initialized successfully")
    db.close()
  } catch (error) {
    console.log(`   ❌ Database setup failed: ${error.message}`)
    return
  }

  console.log("\n🎉 All tests passed! Your bot is ready to run.")
  console.log("\n📱 Next steps:")
  console.log("   1. Run: npm start")
  console.log("   2. Open Telegram and search for your bot")
  console.log("   3. Send /start to begin trading")
}

testBot().catch(console.error)
