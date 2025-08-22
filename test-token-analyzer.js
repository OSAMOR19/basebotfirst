const TokenAnalyzer = require('./src/services/tokenAnalyzer')
const logger = require('./src/utils/logger')
const axios = require('axios')
require('dotenv').config()

async function testTokenAnalyzer() {
  console.log('🧪 Testing Token Analyzer...')
  
  const analyzer = new TokenAnalyzer()
  
  try {
    // Test with a token that has data
    const testTokens = [
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC (has data)
      "0xe9434Fb1c4703d94a121ff5592817e79E164FB56"  // Lego Cult (no data)
    ]
    
    for (const tokenAddress of testTokens) {
      console.log(`\n🔍 Analyzing token: ${tokenAddress}`)
      
      // Wait for provider to initialize
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const analysis = await analyzer.analyzeToken(tokenAddress)
      
      if (analysis.success) {
        console.log('\n✅ Token analysis successful!')
        console.log('\n📝 Formatted Output:')
        console.log(analyzer.formatTokenAnalysis(analysis))
      } else {
        console.log('\n❌ Token analysis failed:')
        console.log(analysis.error)
      }
      
      console.log('\n' + '='.repeat(50))
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testTokenAnalyzer().then(() => {
  console.log('\n🎉 Token analyzer test completed!')
  process.exit(0)
}).catch((error) => {
  console.error('💥 Test failed:', error)
  process.exit(1)
})
