import {
  PrivateKeyAccount,
  TransactionReceipt,
  formatEther,
  Address,
} from 'viem'
import { getLogger, sepoliaClient, sepoliaWalletClient } from './constants'
import { Rounds } from './types'
import MoonOrDoomAbi from './abis/MoonOrDoom.json'

const log = getLogger()

export const calculateTotalTXValue = async (
  account: PrivateKeyAccount,
  betAmount: bigint,
  epoch: bigint,
  gasEstimate: bigint,
  gasThreshold: number,
  round: Rounds,
  txReceipt: TransactionReceipt
) => {
  const { effectiveGasPrice: moonTxEffectiveGasPrice, gasUsed: moonTxGasUsed } =
    txReceipt

  const totalGasAmountUsedMoonTx = moonTxEffectiveGasPrice * moonTxGasUsed

  const totalValueOfMoonTx = betAmount + totalGasAmountUsedMoonTx

  log(
    `[Success] Entered ${round} round at epoch ${epoch} for a total of ${formatEther(totalValueOfMoonTx)}`
  )

  const currentRoundWalletAccBalance = await sepoliaClient.getBalance({
    address: account.address,
  })

  log(
    `[INFO] Current ${round === Rounds.MOON ? Rounds.MOON : Rounds.DOOM} wallet value: ${formatEther(currentRoundWalletAccBalance)}`
  )

  if ((txReceipt.gasUsed - gasEstimate) > gasThreshold) {
    log(`[ERROR] ${round} tx gas estimate (${gasEstimate}) did not match actual ${round} tx gas used (${txReceipt.gasUsed}) and exceeded value ${gasThreshold}`)
    process.exit(1)
  }
}

export const claimRewards = async (
  moonerAccount: PrivateKeyAccount,
  contractAddress: Address,
  doomerAccount: PrivateKeyAccount,
  roundsEntered: bigint[]
): Promise<boolean> => {
  const moonClaimTxHash = await sepoliaWalletClient.writeContract({
    abi: MoonOrDoomAbi,
    account: moonerAccount,
    address: contractAddress,
    args: [roundsEntered],
    functionName: 'claim',
  })

  const confirmedClaimMoonTxReceipt =
    await sepoliaClient.waitForTransactionReceipt({
      confirmations: 1,
      hash: moonClaimTxHash,
    })

  if (confirmedClaimMoonTxReceipt.status !== 'success') {
    log('[ERROR] Claiming mooner rewards failed')
    return false
  }

  log(`[SUCCESS] Claimed rewards for mooner account`)

  const doomClaimTxHash = await sepoliaWalletClient.writeContract({
    abi: MoonOrDoomAbi,
    account: doomerAccount,
    address: contractAddress,
    args: [roundsEntered],
    functionName: 'claim',
  })

  const confirmedClaimDoomTxReceipt =
    await sepoliaClient.waitForTransactionReceipt({
      confirmations: 1,
      hash: doomClaimTxHash,
    })

  if (confirmedClaimDoomTxReceipt.status !== 'success') {
    log('[ERROR] Claiming doomer rewards failed')
    return false
  }

  log(`[SUCCESS] Claimed rewards for doomer account`)
  return true
}
