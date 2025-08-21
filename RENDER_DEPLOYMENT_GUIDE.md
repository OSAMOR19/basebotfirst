# Render Deployment Guide

## Overview
This guide will help you deploy your Base Trading Bot to Render and avoid the common errors you've been experiencing.

## Key Issues Fixed

### 1. Buffer Overrun Errors
The main error you were seeing (`data out-of-bounds (buffer=0x, length=0, offset=32)`) has been fixed by:
- Adding proper validation for event data before processing
- Implementing a queue-based event processing system
- Adding defensive error handling for malformed events
- Graceful handling of WebSocket connection issues

### 2. Environment Configuration
Make sure your environment variables are properly set in Render:

```bash
# Required Environment Variables
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/your_api_key
BASE_TESTNET_RPC_URL=https://base-sepolia.g.alchemy.com/v2/your_api_key
BASE_WSS_URL=wss://base-mainnet.g.alchemy.com/v2/your_api_key
UNISWAP_V3_FACTORY=0x33128a8fc17869897dce68ed026d694621f6fdfd
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
ENCRYPTION_KEY=your_encryption_key
TESTNET_MODE=true
NODE_ENV=production
DATABASE_PATH=./data/bot.db
REFERRAL_REWARD_PERCENTAGE=0.01
```

## Render Configuration

### 1. Build Command
```bash
npm install
```

### 2. Start Command
```bash
node src/index.js
```

### 3. Environment Variables in Render
Go to your Render dashboard → Your Service → Environment → Add the variables listed above.

### 4. Health Check
Add a health check endpoint to your bot. You can add this to your `src/index.js`:

```javascript
// Add this after your bot initialization
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    sniperService: bot.sniperService.getServiceStatus()
  })
})

app.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`)
})
```

## Testing Before Deployment

1. **Run the test script locally:**
   ```bash
   node test-sniper-service.js
   ```

2. **Check your environment variables:**
   ```bash
   node -e "require('dotenv').config(); console.log('BASE_WSS_URL:', process.env.BASE_WSS_URL)"
   ```

## Monitoring After Deployment

### 1. Check Logs
Monitor your Render logs for these messages:
- ✅ "Sniper service started successfully"
- ✅ "Started monitoring for new Uniswap V3 pairs"
- ✅ "Started monitoring for liquidity additions"

### 2. Error Indicators
Watch for these errors and their solutions:

**WebSocket Connection Issues:**
```
Error: WebSocket URL is not available
```
**Solution:** Check your `BASE_WSS_URL` environment variable

**Event Processing Errors:**
```
Skipping liquidity event with empty or invalid data
```
**Solution:** This is now handled gracefully - no action needed

**Buffer Overrun Errors:**
```
data out-of-bounds (buffer=0x, length=0, offset=32)
```
**Solution:** Fixed with new validation logic

## Troubleshooting

### 1. Service Won't Start
- Check all environment variables are set
- Verify your Telegram bot token is valid
- Ensure your Alchemy API keys are working

### 2. WebSocket Connection Fails
- Verify your `BASE_WSS_URL` is correct
- Check if your Alchemy plan supports WebSocket connections
- Try using the fallback URL construction

### 3. High Memory Usage
- The queue system will automatically manage event processing
- Monitor the queue length in logs
- Use `clearEventQueue()` if needed

### 4. Frequent Reconnections
- Check your network stability
- Verify your Alchemy WebSocket endpoint
- Monitor for rate limiting

## Performance Optimization

### 1. Event Processing
- Events are now processed in batches with delays
- Malformed events are skipped gracefully
- Queue system prevents memory overflow

### 2. Logging
- Debug logs are limited to 1% of events to reduce noise
- Error logs include detailed context for debugging
- Service status monitoring available

## Security Considerations

1. **Environment Variables:** Never commit API keys to your repository
2. **Encryption Key:** Use a strong, unique encryption key
3. **Database:** Ensure your database path is writable in Render
4. **Rate Limiting:** Monitor your Alchemy API usage

## Support

If you continue to experience issues:

1. Check the Render logs for specific error messages
2. Run the test script locally to verify functionality
3. Verify all environment variables are correctly set
4. Monitor the service status using the health check endpoint

## Updates

The bot now includes:
- ✅ Robust error handling for malformed events
- ✅ Queue-based event processing
- ✅ Automatic WebSocket reconnection
- ✅ Graceful shutdown handling
- ✅ Service status monitoring
- ✅ Comprehensive logging and debugging
