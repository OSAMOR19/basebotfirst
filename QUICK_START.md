# ⚡ Quick Start Guide

## 🚀 **Get Your Bot Running in 5 Minutes**

### **Step 1: Create Your Telegram Bot**
1. Open Telegram → Search `@BotFather`
2. Send `/newbot`
3. Choose name: "My Trading Bot"
4. Choose username: "mytradingbot123" (must end in "bot")
5. **Copy the token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### **Step 2: Setup Project**
```bash
# Run setup script
npm run setup

# Install dependencies
npm install
```

### **Step 3: Configure Environment**
Edit `.env` file:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
ENCRYPTION_KEY=abcdef1234567890abcdef1234567890
TESTNET_MODE=true
```

### **Step 4: Test Setup**
```bash
npm test
```

### **Step 5: Start Bot**
```bash
npm start
```

### **Step 6: Test on Telegram**
1. Find your bot in Telegram
2. Send `/start`
3. Test the buttons and features!

## 🎯 **What You Can Test Right Now**

✅ **Fully Working:**
- Bot startup and connection
- User registration
- Wallet creation
- Interactive menus
- Database operations
- All command handlers

⚠️ **Simulated (Safe for Testing):**
- Buy/Sell operations
- Limit orders (stored, not executed)
- DCA schedules (stored, not executed)
- Auto-sniper (monitoring only)

## 🔧 **Troubleshooting**

**Bot not responding?**
- Check if `npm start` is running
- Verify your bot token is correct
- Make sure you're messaging the right bot

**Setup errors?**
- Run `npm run setup` again
- Check if `.env` file exists
- Verify all dependencies are installed

## 📱 **Testing Flow**

1. **Send `/start`** → Should show main menu
2. **Click "👛 Wallet"** → Should show wallet options
3. **Click "🆕 Generate New"** → Should create wallet
4. **Click "💰 Buy"** → Should show buy options
5. **Test other features** → All buttons should work

## 🎉 **You're Ready!**

Your bot is now fully functional for testing. All the core features work, and you can safely test the interface without any real transactions.

For detailed testing instructions, see `TESTING_GUIDE.md`
