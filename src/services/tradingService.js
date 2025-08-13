const { ethers } = require("ethers")
const logger = require("../utils/logger")

class TradingService {
  constructor() {
    this.uniswapV3Router = process.env.UNISWAP_V3_ROUTER
    this.wethAddress =
      process.env.TESTNET_MODE === "true"
        ? "0x4200000000000000000000000000000000000006" // Base Goerli WETH
        : "0x4200000000000000000000000000000000000006" // Base Mainnet WETH

    // Uniswap V3 Router ABI (simplified)
    this.routerAbi = [
      "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
      "function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)",
    ]
  }

  // Buy tokens with ETH
  async buyToken(wallet, tokenAddress, ethAmount, slippage = 5) {
    try {
      logger.info(`Buying ${ethAmount} ETH worth of ${tokenAddress}`)

      const router = new ethers.Contract(this.uniswapV3Router, this.routerAbi, wallet)

      // Calculate minimum amount out with slippage
      const amountIn = ethers.parseEther(ethAmount.toString())
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

      // Get quote first (you'd implement this based on Uniswap V3 quoter)
      const amountOutMinimum = await this.getAmountOutMinimum(tokenAddress, amountIn, slippage)

      const params = {
        tokenIn: this.wethAddress,
        tokenOut: tokenAddress,
        fee: 3000, // 0.3% fee tier
        recipient: wallet.address,
        deadline: deadline,
        amountIn: amountIn,
        amountOutMinimum: amountOutMinimum,
        sqrtPriceLimitX96: 0,
      }

      // Estimate gas
      const gasEstimate = await router.exactInputSingle.estimateGas(params, { value: amountIn })
      const gasPrice = await wallet.provider.getFeeData()

      // Execute trade
      const tx = await router.exactInputSingle(params, {
        value: amountIn,
        gasLimit: gasEstimate,
        gasPrice: gasPrice.gasPrice,
      })

      logger.info(`Buy transaction sent: ${tx.hash}`)

      // Wait for confirmation
      const receipt = await tx.wait()

      return {
        success: true,
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? "success" : "failed",
      }
    } catch (error) {
      logger.error("Error buying token:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Sell tokens for ETH
  async sellToken(wallet, tokenAddress, tokenAmount, slippage = 5) {
    try {
      logger.info(`Selling ${tokenAmount} of ${tokenAddress}`)

      // First approve the router to spend tokens
      await this.approveToken(wallet, tokenAddress, tokenAmount)

      const router = new ethers.Contract(this.uniswapV3Router, this.routerAbi, wallet)

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

      // Get token decimals
      const tokenContract = new ethers.Contract(tokenAddress, ["function decimals() view returns (uint8)"], wallet)
      const decimals = await tokenContract.decimals()
      const amountIn = ethers.parseUnits(tokenAmount.toString(), decimals)

      // Calculate minimum ETH out with slippage
      const amountOutMinimum = await this.getEthAmountOutMinimum(tokenAddress, amountIn, slippage)

      const params = {
        tokenIn: tokenAddress,
        tokenOut: this.wethAddress,
        fee: 3000, // 0.3% fee tier
        recipient: wallet.address,
        deadline: deadline,
        amountIn: amountIn,
        amountOutMinimum: amountOutMinimum,
        sqrtPriceLimitX96: 0,
      }

      // Execute trade
      const tx = await router.exactInputSingle(params)

      logger.info(`Sell transaction sent: ${tx.hash}`)

      // Wait for confirmation
      const receipt = await tx.wait()

      return {
        success: true,
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? "success" : "failed",
      }
    } catch (error) {
      logger.error("Error selling token:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Create limit order
  async createLimitOrder(userId, tokenAddress, orderType, amountEth, targetPrice) {
    try {
      logger.info(`Creating ${orderType} limit order for ${tokenAddress} at ${targetPrice} ETH`)
      
      // Store limit order in database (this would be implemented in database.js)
      // For now, return success
      return {
        success: true,
        orderId: Date.now(), // In real implementation, this would be the database ID
        message: `${orderType.toUpperCase()} limit order created at ${targetPrice} ETH`
      }
    } catch (error) {
      logger.error("Error creating limit order:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Check and execute limit orders
  async checkLimitOrders() {
    try {
      // Get current token price and check against limit orders
      // This would be implemented with a price oracle or DEX quoter
      logger.info("Checking limit orders...")
      
      // In a real implementation, you would:
      // 1. Fetch all active limit orders from database
      // 2. Get current market prices
      // 3. Execute orders that meet conditions
      // 4. Update order status
      
      return true
    } catch (error) {
      logger.error("Error checking limit orders:", error)
      return false
    }
  }

  // Create DCA schedule
  async createDCASchedule(userId, tokenAddress, amountEth, intervalHours) {
    try {
      logger.info(`Creating DCA schedule for ${tokenAddress}: ${amountEth} ETH every ${intervalHours} hours`)
      
      const nextExecution = new Date(Date.now() + intervalHours * 60 * 60 * 1000)
      
      // Store DCA schedule in database (this would be implemented in database.js)
      return {
        success: true,
        scheduleId: Date.now(),
        nextExecution: nextExecution,
        message: `DCA schedule created: ${amountEth} ETH every ${intervalHours} hours`
      }
    } catch (error) {
      logger.error("Error creating DCA schedule:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Execute DCA orders
  async executeDCASchedules() {
    try {
      logger.info("Executing DCA schedules...")
      
      // In a real implementation, you would:
      // 1. Fetch all DCA schedules that are due
      // 2. Execute the trades
      // 3. Update next execution time
      // 4. Notify users
      
      return true
    } catch (error) {
      logger.error("Error executing DCA schedules:", error)
      return false
    }
  }

  // Approve token spending
  async approveToken(wallet, tokenAddress, amount) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          "function approve(address spender, uint256 amount) returns (bool)",
          "function decimals() view returns (uint8)",
        ],
        wallet,
      )

      const decimals = await tokenContract.decimals()
      const amountToApprove = ethers.parseUnits(amount.toString(), decimals)

      const tx = await tokenContract.approve(this.uniswapV3Router, amountToApprove)
      await tx.wait()

      logger.info(`Token approved: ${tx.hash}`)
      return true
    } catch (error) {
      logger.error("Error approving token:", error)
      throw error
    }
  }

  // Get minimum amount out with slippage (simplified - you'd use Uniswap V3 Quoter in production)
  async getAmountOutMinimum(tokenAddress, amountIn, slippage) {
    try {
      // This is a simplified calculation
      // In production, you'd use Uniswap V3 Quoter contract
      const slippageMultiplier = (100 - slippage) / 100
      return ethers.parseEther((Number.parseFloat(ethers.formatEther(amountIn)) * slippageMultiplier).toString())
    } catch (error) {
      logger.error("Error calculating amount out minimum:", error)
      return ethers.parseEther("0")
    }
  }

  // Get minimum ETH amount out with slippage
  async getEthAmountOutMinimum(tokenAddress, amountIn, slippage) {
    try {
      // This is a simplified calculation
      // In production, you'd use Uniswap V3 Quoter contract
      const slippageMultiplier = (100 - slippage) / 100
      return ethers.parseEther((Number.parseFloat(ethers.formatEther(amountIn)) * slippageMultiplier).toString())
    } catch (error) {
      logger.error("Error calculating ETH amount out minimum:", error)
      return ethers.parseEther("0")
    }
  }

  // Get token price in ETH
  async getTokenPrice(tokenAddress) {
    try {
      // This would integrate with a price oracle or DEX quoter
      // For now, return a placeholder
      return "0.001" // ETH per token
    } catch (error) {
      logger.error("Error getting token price:", error)
      return "0"
    }
  }

  // Calculate profit/loss
  async calculatePNL(trades) {
    try {
      let totalInvested = 0
      let totalReceived = 0

      for (const trade of trades) {
        if (trade.trade_type === "buy") {
          totalInvested += Number.parseFloat(trade.amount_eth)
        } else if (trade.trade_type === "sell") {
          totalReceived += Number.parseFloat(trade.amount_eth)
        }
      }

      const pnl = totalReceived - totalInvested
      const pnlPercentage = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0

      return {
        totalInvested,
        totalReceived,
        pnl,
        pnlPercentage,
      }
    } catch (error) {
      logger.error("Error calculating PNL:", error)
      throw error
    }
  }
}

module.exports = TradingService
