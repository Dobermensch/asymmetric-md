import dotenv from 'dotenv'

dotenv.config()

const config = {
  btcBetAmount: process.env.BTC_BET_AMOUNT || '0.01',
  claimAfterRounds: parseInt(process.env.CLAIM_AFTER_ROUNDS || '1'),
  enableLogs: !!process.env.ENABLE_LOGS, // leave empty to disable logging
  ethBetAmount: process.env.ETH_BET_AMOUNT || '0.01',
  gasThreshold: parseInt(process.env.GAS_THRESHOLD || '1000'),
  numOfRounds: parseInt(process.env.NUM_OF_ROUNDS || '1'),
}

export default config
