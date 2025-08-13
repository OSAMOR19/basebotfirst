# Base Blockchain Telegram Trading Bot

A comprehensive Telegram trading bot for Base blockchain with automated sniper functionality, wallet management, and advanced trading features.

## 🚀 Features

### Core Trading
- **Instant Buy/Sell** - Execute trades with preset amounts or custom values
- **Auto Sniper** - Automatically buy tokens when liquidity is added
- **Limit Orders** - Set buy/sell orders at specific prices
- **DCA (Dollar Cost Averaging)** - Schedule recurring purchases
- **Portfolio Tracking** - Real-time positions and PNL monitoring

### Wallet Management
- **Secure Storage** - Encrypted private key storage
- **Multi-Wallet Support** - Manage multiple wallets per user
- **Import/Generate** - Create new wallets or import existing ones
- **Balance Tracking** - Real-time ETH and token balances

### Advanced Features
- **Referral System** - Earn rewards from referred users
- **Real-time Monitoring** - WebSocket-based blockchain event tracking
- **Gas Optimization** - Smart gas price management
- **Slippage Protection** - Configurable slippage tolerance

## 🛠 Technical Stack

- **Backend**: Node.js with Express
- **Blockchain**: ethers.js for Base blockchain interaction
- **Database**: SQLite with encrypted storage
- **Telegram**: node-telegram-bot-api
- **Security**: AES encryption for private keys
- **Deployment**: Docker containerization

## 📋 Prerequisites

- Node.js 18+ 
- Telegram Bot Token (from @BotFather)
- Base RPC endpoint (Alchemy/Infura)
- Docker (for containerized deployment)

## 🚀 Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd base-trading-bot
npm install
\`\`\`

### 2. Environment Setup

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` with your configuration:

\`\`\`env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Base Blockchain Configuration  
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/your_api_key
BASE_TESTNET_RPC_URL=https://base-goerli.g.alchemy.com/v2/your_api_key
BASE_WSS_URL=wss://base-mainnet.g.alchemy.com/v2/your_api_key

# Security
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Environment
TESTNET_MODE=true
\`\`\`

### 3. Run the Bot

**Development:**
\`\`\`bash
npm run dev
\`\`\`

**Production:**
\`\`\`bash
npm start
\`\`\`

**Docker:**
\`\`\`bash
docker-compose up -d
\`\`\`

## 🏗 Project Structure

\`\`\`
src/
├── index.js              # Main bot entry point
├── database/
│   └── database.js       # SQLite database management
├── services/
│   ├── walletManager.js  # Wallet operations & encryption
│   ├── tradingService.js # DEX trading logic
│   └── sniperService.js  # Auto-sniper functionality
├── handlers/
│   └── botHandlers.js    # Telegram bot command handlers
└── utils/
    ├── logger.js         # Winston logging configuration
    └── helpers.js        # Utility functions
\`\`\`

## 🔧 Configuration

### Trading Settings
- **Default Slippage**: 5%
- **Gas Limit**: Auto-estimated with 20% buffer
- **Supported DEX**: Uniswap V3 on Base
- **Fee Tiers**: 0.3% (3000) default

### Security Features
- **Private Key Encryption**: AES-256 with user passphrases
- **Database Encryption**: Sensitive data encrypted at rest
- **Input Validation**: All user inputs sanitized
- **Rate Limiting**: Built-in protection against spam

## 📱 Bot Commands

### Basic Commands
- `/start` - Initialize bot and show main menu
- `/wallet` - Wallet management interface
- `/buy` - Quick buy interface
- `/sell` - Quick sell interface
- `/positions` - View current holdings
- `/pnl` - Profit/Loss summary
- `/sniper` - Auto-sniper management
- `/ref` - Referral system
- `/settings` - Bot configuration

### Trading Flow
1. **Setup Wallet** - Generate new or import existing
2. **Add Funds** - Send ETH to your wallet address
3. **Start Trading** - Use buy/sell commands or set up sniper
4. **Monitor** - Track positions and PNL

## 🎯 Auto Sniper

The sniper service monitors Base blockchain for:
- **New Pool Creation** - Uniswap V3 PoolCreated events
- **Liquidity Additions** - Large token transfers to pools
- **Custom Triggers** - User-defined conditions

### Sniper Configuration
\`\`\`javascript
{
  tokenAddress: "0x...",
  buyAmountEth: 0.1,
  maxGasPrice: 50, // gwei
  slippage: 5,     // percentage
  isActive: true
}
\`\`\`

## 🔒 Security Best Practices

### For Users
- **Never share private keys** in public channels
- **Use strong passphrases** for wallet encryption
- **Start with small amounts** for testing
- **Enable 2FA** on your Telegram account

### For Developers
- **Environment Variables** - Never commit sensitive data
- **Input Validation** - Sanitize all user inputs
- **Error Handling** - Graceful failure management
- **Logging** - Comprehensive audit trails

## 🧪 Testing

### Testnet Mode
Set `TESTNET_MODE=true` to use Base Goerli testnet:
- **Safe Testing** - No real funds at risk
- **Full Functionality** - All features available
- **Test Tokens** - Use faucets for test ETH

### Test Commands
\`\`\`bash
npm test                 # Run test suite
npm run test:coverage    # Coverage report
npm run test:integration # Integration tests
\`\`\`

## 🚀 Deployment

### VPS Deployment
\`\`\`bash
# Clone repository
git clone <repo-url>
cd base-trading-bot

# Install dependencies
npm ci --production

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start with PM2
npm install -g pm2
pm2 start src/index.js --name "base-bot"
pm2 save
pm2 startup
\`\`\`

### Docker Deployment
\`\`\`bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Update
docker-compose pull
docker-compose up -d
\`\`\`

## 📊 Monitoring

### Logs
- **Error Logs**: `logs/error.log`
- **Combined Logs**: `logs/combined.log`
- **Console Output**: Real-time in development

### Health Checks
- **Database Connection**: Automatic retry logic
- **RPC Endpoints**: Failover support
- **WebSocket**: Auto-reconnection
- **Memory Usage**: Built-in monitoring

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This bot is for educational purposes. Trading cryptocurrencies involves substantial risk of loss. Users are responsible for their own trading decisions and should never invest more than they can afford to lose.

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: Wiki
- **Community**: Telegram Group
- **Email**: support@example.com

---

**Happy Trading! 🚀**
