# 🧪 Base Trading Bot - Testing Guide

## 📱 **How Telegram Bots Work**

Unlike websites, Telegram bots are **background services** that:
- Run continuously on your server/computer
- Listen for messages from users
- Respond with text, buttons, and interactive menus
- Process commands and user inputs

## 🚀 **Step-by-Step Testing Setup**

### **1. Create Your Telegram Bot**

1. **Open Telegram** and search for `@BotFather`
2. **Send `/newbot`** to BotFather
3. **Choose a name** for your bot (e.g., "My Trading Bot")
4. **Choose a username** ending in "bot" (e.g., "mytradingbot123")
5. **Copy the bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### **2. Set Up Environment Variables**

1. **Copy the environment template:**
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` with your values:**
   ```env
   # Replace with your actual bot token
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   
   # Generate a random 32-character encryption key
   ENCRYPTION_KEY=abcdef1234567890abcdef1234567890
   
   # For testing, use testnet
   TESTNET_MODE=true
   
   # You can get free RPC URLs from Alchemy or Infura
   BASE_TESTNET_RPC_URL=https://base-goerli.g.alchemy.com/v2/your_api_key
   ```

### **3. Install Dependencies**

```bash
npm install
```

### **4. Test the Setup**

```bash
npm test
```

This will verify:
- ✅ Environment variables are set
- ✅ Telegram bot connection works
- ✅ Base blockchain connection works
- ✅ Database setup works

### **5. Start the Bot**

```bash
npm start
```

You should see:
```
🚀 Base Trading Bot is running...
📱 Find your bot on Telegram and send /start to begin!
```

### **6. Test Your Bot on Telegram**

1. **Find your bot** in Telegram (search the username you created)
2. **Send `/start`** to begin
3. **Test the features:**

## 🎯 **Testing Features**

### **Basic Commands**
- `/start` - Main menu
- `/wallet` - Wallet management
- `/buy` - Buy tokens
- `/sell` - Sell tokens
- `/positions` - View holdings
- `/pnl` - Profit/Loss
- `/sniper` - Auto-sniper
- `/limit` - Limit orders
- `/dca` - Dollar Cost Averaging
- `/ref` - Referral system
- `/settings` - Bot settings

### **Interactive Testing Flow**

1. **Start with `/start`**
   - Should show welcome message with buttons

2. **Test Wallet Creation**
   - Click "👛 Wallet"
   - Click "🆕 Generate New"
   - Should create a new wallet with address and mnemonic

3. **Test Buy Menu**
   - Click "💰 Buy"
   - Select an amount (0.1 ETH)
   - Enter a token address (for testing, use: `0x4200000000000000000000000000000000000006`)
   - Should show processing message

4. **Test Limit Orders**
   - Click "📋 Limit Orders"
   - Click "➕ Create Buy Order"
   - Follow the prompts to create a limit order

5. **Test DCA**
   - Click "🔄 DCA"
   - Click "➕ Create DCA Schedule"
   - Follow the prompts to create a DCA schedule

## 🔧 **Troubleshooting**

### **Bot Not Responding**
- Check if the bot is running (`npm start`)
- Verify your bot token is correct
- Make sure you're messaging the right bot

### **Database Errors**
- Check if the `data/` directory exists
- Verify database permissions
- Check the logs in `logs/` directory

### **Blockchain Connection Issues**
- Verify your RPC URL is correct
- Check if you have internet connection
- For testnet, make sure `TESTNET_MODE=true`

### **Environment Variables**
- Make sure `.env` file exists
- Verify all required variables are set
- Check for typos in variable names

## 📊 **What You Can Test**

### **✅ Fully Functional**
- Bot startup and connection
- User registration and management
- Wallet creation and import
- Interactive menus and buttons
- Database operations
- Basic command handling

### **⚠️ Partially Functional (Needs Real Trading)**
- Buy/Sell operations (simulated)
- Auto-sniper (monitoring only)
- Limit orders (stored, not executed)
- DCA schedules (stored, not executed)

### **❌ Requires Real Integration**
- Actual blockchain transactions
- Real token trading
- Price oracles
- Gas optimization

## 🎮 **Testing Tips**

1. **Start Small**: Test basic commands first
2. **Use Testnet**: Set `TESTNET_MODE=true` for safe testing
3. **Check Logs**: Monitor `logs/` directory for errors
4. **Test User Flow**: Go through complete user journeys
5. **Test Error Handling**: Try invalid inputs and edge cases

## 🚨 **Important Notes**

- **Never use real private keys** in testing
- **Start with testnet** to avoid real transactions
- **Keep your bot token secret**
- **Monitor logs** for any issues
- **Test thoroughly** before using real funds

## 📞 **Getting Help**

If you encounter issues:
1. Check the logs in `logs/` directory
2. Verify all environment variables are set
3. Ensure your bot token is correct
4. Test with the provided test script (`npm test`)

Happy testing! 🚀
