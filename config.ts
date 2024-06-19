import dotenv from 'dotenv'

dotenv.config()

const config = {
  ethBetAmount: process.env.ETH_BET_AMOUNT || '0.01',
  numOfRounds: parseInt(process.env.NUM_OF_ROUNDS || '1'),
  claimAfterRounds: parseInt(process.env.CLAIM_AFTER_ROUNDS || '1'),
  enableLogs: !!process.env.ENABLE_LOGS
}

export default config
