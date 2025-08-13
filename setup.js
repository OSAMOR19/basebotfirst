#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

console.log('🚀 Base Trading Bot Setup\n')

// Check if .env exists
if (fs.existsSync('.env')) {
  console.log('⚠️  .env file already exists. Skipping setup.')
  console.log('📝 Edit .env manually if needed.')
  process.exit(0)
}

// Create .env from template
if (fs.existsSync('env.example')) {
  fs.copyFileSync('env.example', '.env')
  console.log('✅ Created .env from template')
} else {
  console.log('❌ env.example not found. Creating basic .env...')
  
  const envContent = `# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Base Blockchain Configuration  
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/your_api_key
BASE_TESTNET_RPC_URL=https://base-goerli.g.alchemy.com/v2/your_api_key
BASE_WSS_URL=wss://base-mainnet.g.alchemy.com/v2/your_api_key

# Uniswap V3 Configuration
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
UNISWAP_V3_FACTORY=0x33128a8fc17869897dce68ed026d694621f6fdfd

# Security
ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}

# Environment
TESTNET_MODE=true
NODE_ENV=development

# Database
DATABASE_PATH=./data/bot.db

# Referral System
REFERRAL_REWARD_PERCENTAGE=0.01
`
  
  fs.writeFileSync('.env', envContent)
  console.log('✅ Created basic .env file')
}

// Create necessary directories
const dirs = ['data', 'logs']
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`✅ Created ${dir}/ directory`)
  }
})

console.log('\n🎉 Setup complete!')
console.log('\n📋 Next steps:')
console.log('1. Edit .env and add your Telegram bot token')
console.log('2. Run: npm install')
console.log('3. Run: npm test')
console.log('4. Run: npm start')
console.log('\n📖 See TESTING_GUIDE.md for detailed instructions')
