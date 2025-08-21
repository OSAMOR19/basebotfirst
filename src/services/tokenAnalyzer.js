const { ethers } = require("ethers")
const axios = require("axios")
const logger = require("../utils/logger")

class TokenAnalyzer {
  constructor() {
    this.provider = null
    this.initProvider()
  }

  async initProvider() {
    const rpcUrl = process.env.TESTNET_MODE === "true" ? process.env.BASE_TESTNET_RPC_URL : process.env.BASE_RPC_URL
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
  }

  // Get comprehensive token information
  async analyzeToken(tokenAddress) {
    try {
      logger.info(`Analyzing token: ${tokenAddress}`)

      const [
        tokenInfo,
        priceInfo,
        liquidityInfo,
        holderInfo,
        contractInfo
      ] = await Promise.all([
        this.getTokenInfo(tokenAddress),
        this.getPriceInfo(tokenAddress),
        this.getLiquidityInfo(tokenAddress),
        this.getHolderInfo(tokenAddress),
        this.getContractInfo(tokenAddress)
      ])

      return {
        success: true,
        tokenAddress,
        ...tokenInfo,
        ...priceInfo,
        ...liquidityInfo,
        ...holderInfo,
        ...contractInfo,
        analysis: await this.generateAnalysis(tokenAddress, tokenInfo, priceInfo, liquidityInfo)
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

  // Get basic token information
  async getTokenInfo(tokenAddress) {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)"
      ], this.provider)

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply()
      ])

      const formattedTotalSupply = ethers.formatUnits(totalSupply, decimals)

      return {
        name: name || "Unknown",
        symbol: symbol || "UNKNOWN",
        decimals: Number(decimals),
        totalSupply: formattedTotalSupply,
        totalSupplyRaw: totalSupply.toString()
      }
    } catch (error) {
      logger.error("Error getting token info:", error)
      return {
        name: "Unknown",
        symbol: "UNKNOWN",
        decimals: 18,
        totalSupply: "0",
        totalSupplyRaw: "0"
      }
    }
  }

  // Get price information
  async getPriceInfo(tokenAddress) {
    try {
      // This would integrate with price oracles or DEX quoters
      // For now, return placeholder data
      const currentPrice = await this.getCurrentPrice(tokenAddress)
      const priceChange24h = await this.getPriceChange24h(tokenAddress)

      return {
        currentPrice: currentPrice || "0.000001",
        priceChange24h: priceChange24h || "0",
        priceChange24hPercent: priceChange24h ? ((priceChange24h / currentPrice) * 100).toFixed(2) : "0"
      }
    } catch (error) {
      logger.error("Error getting price info:", error)
      return {
        currentPrice: "0.000001",
        priceChange24h: "0",
        priceChange24hPercent: "0"
      }
    }
  }

  // Get liquidity information
  async getLiquidityInfo(tokenAddress) {
    try {
      // This would check Uniswap V2/V3 pools
      // For now, return estimated data
      const liquidity = await this.estimateLiquidity(tokenAddress)
      const liquidityPercent = await this.calculateLiquidityPercent(tokenAddress)

      return {
        liquidity: liquidity || "0",
        liquidityPercent: liquidityPercent || "0",
        dex: "UniSwap V2/V3",
        poolAddress: await this.findPoolAddress(tokenAddress)
      }
    } catch (error) {
      logger.error("Error getting liquidity info:", error)
      return {
        liquidity: "0",
        liquidityPercent: "0",
        dex: "Unknown",
        poolAddress: "Unknown"
      }
    }
  }

  // Get holder information
  async getHolderInfo(tokenAddress) {
    try {
      // This would analyze top holders and distribution
      const holderCount = await this.getHolderCount(tokenAddress)
      const topHolders = await this.getTopHolders(tokenAddress)

      return {
        holderCount: holderCount || "0",
        topHolders: topHolders || [],
        isConcentrated: await this.isHolderConcentrated(tokenAddress)
      }
    } catch (error) {
      logger.error("Error getting holder info:", error)
      return {
        holderCount: "0",
        topHolders: [],
        isConcentrated: false
      }
    }
  }

  // Get contract security information
  async getContractInfo(tokenAddress) {
    try {
      const contractCode = await this.provider.getCode(tokenAddress)
      const isContract = contractCode !== "0x"

      const securityChecks = await this.performSecurityChecks(tokenAddress)

      return {
        isContract,
        isVerified: await this.isContractVerified(tokenAddress),
        hasProxy: await this.hasProxy(tokenAddress),
        securityChecks
      }
    } catch (error) {
      logger.error("Error getting contract info:", error)
      return {
        isContract: false,
        isVerified: false,
        hasProxy: false,
        securityChecks: {}
      }
    }
  }

  // Generate trading analysis
  async generateAnalysis(tokenAddress, tokenInfo, priceInfo, liquidityInfo) {
    try {
      const analysis = {
        riskLevel: "MEDIUM",
        recommendations: [],
        warnings: []
      }

      // Check liquidity
      if (Number(liquidityInfo.liquidity) < 1000) {
        analysis.riskLevel = "HIGH"
        analysis.warnings.push("⚠️ Low liquidity - High slippage risk")
      }

      // Check price volatility
      if (Math.abs(Number(priceInfo.priceChange24hPercent)) > 50) {
        analysis.warnings.push("⚠️ High price volatility")
      }

      // Check holder concentration
      if (liquidityInfo.isConcentrated) {
        analysis.warnings.push("⚠️ Concentrated holder distribution")
      }

      // Add recommendations
      if (Number(liquidityInfo.liquidity) > 10000) {
        analysis.recommendations.push("✅ Good liquidity for trading")
      }

      if (tokenInfo.isVerified) {
        analysis.recommendations.push("✅ Contract is verified")
      }

      return analysis
    } catch (error) {
      logger.error("Error generating analysis:", error)
      return {
        riskLevel: "UNKNOWN",
        recommendations: [],
        warnings: ["Unable to complete analysis"]
      }
    }
  }

  // Helper methods (implemented as placeholders for now)
  async getCurrentPrice(tokenAddress) {
    // This would integrate with price oracles
    return "0.000001"
  }

  async getPriceChange24h(tokenAddress) {
    // This would get 24h price change
    return "0"
  }

  async estimateLiquidity(tokenAddress) {
    // This would calculate actual liquidity
    return "50000"
  }

  async calculateLiquidityPercent(tokenAddress) {
    // This would calculate liquidity percentage
    return "15.5"
  }

  async findPoolAddress(tokenAddress) {
    // This would find the actual pool address
    return "0x..."
  }

  async getHolderCount(tokenAddress) {
    // This would get actual holder count
    return "150"
  }

  async getTopHolders(tokenAddress) {
    // This would get top holders
    return []
  }

  async isHolderConcentrated(tokenAddress) {
    // This would analyze holder distribution
    return false
  }

  async isContractVerified(tokenAddress) {
    // This would check if contract is verified on explorer
    return true
  }

  async hasProxy(tokenAddress) {
    // This would check for proxy contracts
    return false
  }

  async performSecurityChecks(tokenAddress) {
    // This would perform various security checks
    return {
      hasBlacklist: false,
      hasMaxTxLimit: false,
      hasMaxWalletLimit: false,
      isHoneypot: false
    }
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
      liquidityPercent,
      dex,
      holderCount,
      riskLevel,
      recommendations,
      warnings
    } = analysis

    let message = `🔍 **Token Analysis: ${name} (${symbol})**\n\n`
    message += `📍 **Contract:** \`${analysis.tokenAddress}\`\n\n`

    message += `**📊 Token Info:**\n`
    message += `• Name: ${name}\n`
    message += `• Symbol: ${symbol}\n`
    message += `• Price: $${currentPrice}\n`
    message += `• 24h Change: ${priceChange24hPercent}%\n\n`

    message += `**💧 Liquidity Info:**\n`
    message += `• DEX: ${dex}\n`
    message += `• Liquidity: $${liquidity}\n`
    message += `• Liquidity %: ${liquidityPercent}%\n\n`

    message += `**👥 Holder Info:**\n`
    message += `• Holders: ${holderCount}\n\n`

    message += `**⚠️ Risk Level: ${riskLevel}**\n\n`

    if (warnings.length > 0) {
      message += `**🚨 Warnings:**\n`
      warnings.forEach(warning => {
        message += `• ${warning}\n`
      })
      message += `\n`
    }

    if (recommendations.length > 0) {
      message += `**✅ Recommendations:**\n`
      recommendations.forEach(rec => {
        message += `• ${rec}\n`
      })
      message += `\n`
    }

    message += `**🔗 Links:**\n`
    message += `• [Scan](https://basescan.org/token/${analysis.tokenAddress})\n`
    message += `• [DexScreener](https://dexscreener.com/base/${analysis.tokenAddress})\n`

    return message
  }
}

module.exports = TokenAnalyzer
