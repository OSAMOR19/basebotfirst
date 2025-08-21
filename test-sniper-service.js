const SniperService = require('./src/services/sniperService')
const logger = require('./src/utils/logger')
require('dotenv').config()

async function testSniperService() {
  console.log('🧪 Testing Sniper Service...')
  
  const sniperService = new SniperService()
  
  try {
    // Test 1: Check environment variables
    console.log('\n📋 Environment Check:')
    console.log('BASE_WSS_URL:', process.env.BASE_WSS_URL ? '✅ Set' : '❌ Not set')
    console.log('BASE_RPC_URL:', process.env.BASE_RPC_URL ? '✅ Set' : '❌ Not set')
    console.log('BASE_TESTNET_RPC_URL:', process.env.BASE_TESTNET_RPC_URL ? '✅ Set' : '❌ Not set')
    console.log('UNISWAP_V3_FACTORY:', process.env.UNISWAP_V3_FACTORY ? '✅ Set' : '❌ Not set')
    console.log('TESTNET_MODE:', process.env.TESTNET_MODE)
    
    // Test 2: Test malformed event data handling
    console.log('\n🔧 Testing Malformed Event Handling:')
    
    const malformedLogs = [
      null,
      undefined,
      {},
      { data: null },
      { data: '0x' },
      { data: '0x123', topics: null },
      { data: '0x123', topics: [] },
      { data: '0x123', topics: ['0x123'] }, // Too short
      { data: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', topics: ['0x123'] } // Valid format
    ]
    
    for (let i = 0; i < malformedLogs.length; i++) {
      const log = malformedLogs[i]
      console.log(`Test ${i + 1}: Processing ${JSON.stringify(log)}`)
      
      try {
        await sniperService.processLiquidityEvent(log)
        console.log(`  ✅ Test ${i + 1} passed (no crash)`)
      } catch (error) {
        console.log(`  ❌ Test ${i + 1} failed:`, error.message)
      }
    }
    
    // Test 3: Test service status
    console.log('\n📊 Service Status:')
    const status = sniperService.getServiceStatus()
    console.log(JSON.stringify(status, null, 2))
    
    // Test 4: Test queue operations
    console.log('\n📦 Queue Operations:')
    console.log('Initial queue length:', sniperService.eventProcessingQueue.length)
    
    // Add some test events to queue
    sniperService.addEventToQueue({ data: '0x123', topics: ['0x456'] })
    sniperService.addEventToQueue({ data: '0x789', topics: ['0xabc'] })
    
    console.log('After adding events:', sniperService.eventProcessingQueue.length)
    
    // Clear queue
    const cleared = sniperService.clearEventQueue()
    console.log('Cleared events:', cleared)
    console.log('Final queue length:', sniperService.eventProcessingQueue.length)
    
    console.log('\n✅ All tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testSniperService().then(() => {
  console.log('\n🎉 Sniper service test completed!')
  process.exit(0)
}).catch((error) => {
  console.error('💥 Test failed:', error)
  process.exit(1)
})
