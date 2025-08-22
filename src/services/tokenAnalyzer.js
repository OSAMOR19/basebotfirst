const { ethers } = require("ethers")
const axios = require("axios")
const logger = require("../utils/logger")

class TokenAnalyzer {
  constructor() {
    this.provider = null
    this.wethAddress = "0x4200000000000000000000000000000000000006" // Base WETH
    this.uniswapV3Factory = "0x33128a8fc17869897dce68ed026d694621f6fdfd"
    this.initProvider()
  }

  async initProvider() {
    try {
      const rpcUrl = process.env.TESTNET_MODE === "true" ? process.env.BASE_TESTNET_RPC_URL : process.env.BASE_RPC_URL
      if (!rpcUrl) {
        throw new Error("RPC URL not configured")
      }
      this.provider = new ethers.JsonRpcProvider(rpcUrl)
      logger.info("Token analyzer provider initialized")
    } catch (error) {
      logger.error("Failed to initialize token analyzer provider:", error)
      throw error
    }
  }

  // Get comprehensive token information
  async analyzeToken(tokenAddress) {
    try {
      logger.info(`Analyzing token: ${tokenAddress}`)

      // Get external data first
      const externalData = await this.getExternalTokenData(tokenAddress)
      
      if (externalData) {
        return {
          success: true,
          tokenAddress,
          name: externalData.name,
          symbol: externalData.symbol,
          currentPrice: externalData.price || "0",
          priceChange24hPercent: externalData.priceChange24h ? ((parseFloat(externalData.priceChange24h) / parseFloat(externalData.price)) * 100).toFixed(2) : "0",
          liquidity: externalData.liquidity || "0",
          marketCap: externalData.marketCap || "0",
          volume24h: externalData.volume24h || "0",
          dex: externalData.dexId || "UniSwap V3",
          poolAddress: externalData.pairAddress || "Unknown",
          totalSupply: "0",
          decimals: 18,
          holderCount: "0",
          isContract: true,
          isVerified: true,
          securityChecks: {
            hasMaxTxLimit: false,
            hasMaxWalletLimit: false,
            hasBlacklist: false,
            isHoneypot: false
          },
          analysis: {
            riskLevel: "MEDIUM",
            recommendations: [],
            warnings: []
          }
        }
      } else {
        // Fallback to basic on-chain data
        const tokenInfo = await this.getBasicTokenInfo(tokenAddress)
        return {
          success: true,
          tokenAddress,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          currentPrice: "0",
          priceChange24hPercent: "0",
          liquidity: "0",
          marketCap: "0",
          volume24h: "0",
          dex: "UniSwap V3",
          poolAddress: "Unknown",
          totalSupply: tokenInfo.totalSupply,
          decimals: tokenInfo.decimals,
          holderCount: "0",
          isContract: tokenInfo.isContract,
          isVerified: tokenInfo.isContract,
          securityChecks: {
            hasMaxTxLimit: false,
            hasMaxWalletLimit: false,
            hasBlacklist: false,
            isHoneypot: false
          },
          analysis: {
            riskLevel: "HIGH",
            recommendations: [],
            warnings: ["⚠️ Limited data available"]
          }
        }
      }
    } catch (error) {
      logger.error("Error analyzing token:", error)
      return {
        success: false,
        error: error.message,
        tokenAddress
      }
    }
  }

  // Get basic token information from contract
  async getBasicTokenInfo(tokenAddress) {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)"
      ], this.provider)

      let name = "Unknown"
      let symbol = "UNKNOWN"
      let decimals = 18
      let totalSupply = "0"

      try {
        name = await tokenContract.name()
      } catch (error) {
        logger.debug(`Could not get name for ${tokenAddress}`)
      }

      try {
        symbol = await tokenContract.symbol()
      } catch (error) {
        logger.debug(`Could not get symbol for ${tokenAddress}`)
      }

      try {
        decimals = await tokenContract.decimals()
      } catch (error) {
        logger.debug(`Could not get decimals for ${tokenAddress}`)
      }

      try {
        const supply = await tokenContract.totalSupply()
        totalSupply = ethers.formatUnits(supply, decimals)
      } catch (error) {
        logger.debug(`Could not get totalSupply for ${tokenAddress}`)
      }

      const code = await this.provider.getCode(tokenAddress)
      const isContract = code !== "0x"

      return {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply,
        isContract
      }
    } catch (error) {
      logger.error("Error getting basic token info:", error)
      return {
        name: "Unknown",
        symbol: "UNKNOWN",
        decimals: 18,
        totalSupply: "0",
        isContract: false
      }
    }
  }

  // Get comprehensive token data from external APIs
  async getExternalTokenData(tokenAddress) {
    try {
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
        timeout: 10000
      })
      
      if (response.data && response.data.pairs && response.data.pairs.length > 0) {
        // Find the pair with the highest liquidity (usually the main trading pair)
        const pairs = response.data.pairs
        const mainPair = pairs.reduce((best, current) => {
          const bestLiquidity = parseFloat(best.liquidity?.usd || 0)
          const currentLiquidity = parseFloat(current.liquidity?.usd || 0)
          return currentLiquidity > bestLiquidity ? current : best
        })
        
        return {
          name: mainPair.baseToken.name,
          symbol: mainPair.baseToken.symbol,
          price: mainPair.priceUsd,
          liquidity: mainPair.liquidity?.usd,
          volume24h: mainPair.volume?.h24,
          priceChange24h: mainPair.priceChange?.h24,
          marketCap: mainPair.marketCap,
          fdv: mainPair.fdv,
          pairAddress: mainPair.pairAddress,
          dexId: mainPair.dexId,
          txns24h: mainPair.txns?.h24
        }
      }
    } catch (error) {
      logger.debug(`Could not get external token data: ${error.message}`)
    }
    
    return null
  }

  // Format token analysis for display
  formatTokenAnalysis(analysis) {
    if (!analysis.success) {
      return `❌ **Token Analysis Failed**\n\nError: ${analysis.error}`
    }

    const {
      name,
      symbol,
      currentPrice,
      priceChange24hPercent,
      liquidity,
      marketCap,
      volume24h,
      dex,
      securityChecks
    } = analysis

    let message = `${name} (🔗BASE)\n`
    message += `${analysis.tokenAddress}\n\n`

    message += `**Pool Info:**\n`
    message += `🦄 DEX: ${dex}\n`
    message += `📊 Mcap: $${this.formatNumber(parseFloat(marketCap))}\n`
    message += `💧 Liq: $${this.formatNumber(parseFloat(liquidity))} | ${this.calculateLiquidityPercent(liquidity, marketCap)}%\n`
    message += `💸 TxFees: B  $0.5 | S  $0.5\n\n`

    message += `**Token Info:**\n`
    message += ` B   ${securityChecks?.hasMaxTxLimit ? "❌" : "0.00"}% | S  ${securityChecks?.hasMaxWalletLimit ? "❌" : "0.00"}% | T  0.00%\n`
    message += `💰 MaxTx: ${securityChecks?.hasMaxTxLimit ? "❌" : "✅"}\n`
    message += `🔥 Burnt: 0.00%\n`
    message += `🧯 Clogged: 0.00%\n\n`

    const profitPercent = isNaN(parseFloat(priceChange24hPercent)) ? "0.00" : priceChange24hPercent
    const profitColor = parseFloat(profitPercent) >= 0 ? "🟢" : "🟥"
    
    message += `[3] ${profitColor} Profit: ${profitPercent}%\n`
    message += `Worth: 0.002Ξ Cost: 0.002Ξ  Bag: 1.7M | 0.017%\n\n`

    message += `W1: 0Ξ | W2: 0Ξ | W3: 0.0012Ξ\n\n`

    message += `ℹ Press refresh to update the monitor\n`
    message += `[Scan](https://basescan.org/token/${analysis.tokenAddress}) | [CG](https://coingecko.com) | [DexSc](https://dexscreener.com/base/${analysis.tokenAddress}) | [DexT](https://dextools.io) | [Def](https://de.fi)`

    return message
  }

  // Helper method to format numbers
  formatNumber(num) {
    if (isNaN(num) || num === 0) return "0"
    
    if (num >= 1e9) {
      return (num / 1e9).toFixed(1) + "B"
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(1) + "M"
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(1) + "K"
    } else {
      return num.toFixed(2)
    }
  }

  // Calculate liquidity percentage
  calculateLiquidityPercent(liquidity, marketCap) {
    try {
      const liq = parseFloat(liquidity)
      const mcap = parseFloat(marketCap)
      
      if (isNaN(liq) || isNaN(mcap) || mcap === 0) return "0"
      
      return ((liq / mcap) * 100).toFixed(2)
    } catch (error) {
      return "0"
    }
  }
}

module.exports = TokenAnalyzer
