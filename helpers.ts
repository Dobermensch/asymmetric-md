import {
  PrivateKeyAccount,
  TransactionReceipt,
  parseEther,
  formatEther,
} from 'viem'
import { sepoliaClient } from './constants'
import { Rounds } from './types'
import config from './config'

const ethBetAmount = config.ethBetAmount!

export const calculateTotalTXValue = async (
  account: PrivateKeyAccount,
  epoch: bigint,
  round: Rounds,
  txReceipt: TransactionReceipt
) => {
  const { effectiveGasPrice: moonTxEffectiveGasPrice, gasUsed: moonTxGasUsed } =
    txReceipt

  const totalGasAmountUsedMoonTx = moonTxEffectiveGasPrice * moonTxGasUsed

  const totalValueOfMoonTx = parseEther(ethBetAmount) + totalGasAmountUsedMoonTx

  console.log(
    `[Success] Entered ${round} round at epoch ${epoch} for a total of ${formatEther(totalValueOfMoonTx)}`
  )

  const currentRoundWalletAccBalance = await sepoliaClient.getBalance({
    address: account.address,
  })

  console.log(
    `[LOG] Current ${round === Rounds.MOON ? Rounds.MOON : Rounds.DOOM} wallet value: ${formatEther(currentRoundWalletAccBalance)}`
  )
}
