const SniperService = require('./src/services/sniperService')
const logger = require('./src/utils/logger')
require('dotenv').config()

async function healthCheck() {
  console.log('🏥 Running Health Check...')
  
  const sniperService = new SniperService()
  
  try {
    // Check environment variables
    console.log('\n📋 Environment Variables:')
    const requiredVars = [
      'TELEGRAM_BOT_TOKEN',
      'BASE_RPC_URL', 
      'BASE_TESTNET_RPC_URL',
      'BASE_WSS_URL',
      'UNISWAP_V3_FACTORY',
      'TESTNET_MODE'
    ]
    
    for (const varName of requiredVars) {
      const value = process.env[varName]
      if (value) {
        console.log(`✅ ${varName}: Set`)
      } else {
        console.log(`❌ ${varName}: Not set`)
      }
    }
    
    // Test WebSocket URL construction
    console.log('\n🔌 WebSocket URL Test:')
    let wsUrl = process.env.BASE_WSS_URL
    if (!wsUrl) {
      const rpcUrl = process.env.TESTNET_MODE === "true" ? process.env.BASE_TESTNET_RPC_URL : process.env.BASE_RPC_URL
      if (rpcUrl) {
        wsUrl = rpcUrl.replace('https://', 'wss://')
        console.log(`🔄 Constructed WSS URL: ${wsUrl}`)
      } else {
        console.log('❌ No RPC URL available for WSS construction')
      }
    } else {
      console.log(`✅ Using provided WSS URL: ${wsUrl}`)
    }
    
    // Test service status
    console.log('\n📊 Service Status:')
    const status = sniperService.getServiceStatus()
    console.log(JSON.stringify(status, null, 2))
    
    // Test WebSocket connection (if possible)
    if (wsUrl) {
      console.log('\n🔗 Testing WebSocket Connection:')
      try {
        const { ethers } = require('ethers')
        const testProvider = new ethers.WebSocketProvider(wsUrl)
        
        // Set a timeout for the connection test
        const connectionPromise = testProvider.getNetwork()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
        
        const network = await Promise.race([connectionPromise, timeoutPromise])
        console.log(`✅ WebSocket connection successful: ${network.name} (Chain ID: ${network.chainId})`)
        
        await testProvider.destroy()
      } catch (wsError) {
        console.log(`❌ WebSocket connection failed: ${wsError.message}`)
      }
    }
    
    console.log('\n✅ Health check completed!')
    
  } catch (error) {
    console.error('❌ Health check failed:', error)
  }
}

// Run health check
healthCheck().then(() => {
  console.log('\n🎉 Health check finished!')
  process.exit(0)
}).catch((error) => {
  console.error('💥 Health check error:', error)
  process.exit(1)
})
