import {
  PrivateKeyAccount,
  TransactionReceipt,
  parseEther,
  formatEther,
  Address,
} from 'viem'
import { sepoliaClient, sepoliaWalletClient } from './constants'
import { Rounds } from './types'
import config from './config'
import MoonOrDoomAbi from './abis/MoonOrDoom.json'

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
    `[INFO] Current ${round === Rounds.MOON ? Rounds.MOON : Rounds.DOOM} wallet value: ${formatEther(currentRoundWalletAccBalance)}`
  )
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
    console.log('[ERROR] Claiming mooner rewards failed')
    return false
  }

  console.log(`[SUCCESS] Claimed rewards for mooner account`)

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
    console.log('[ERROR] Claiming doomer rewards failed')
    return false
  }

  console.log(`[SUCCESS] Claimed rewards for doomer account`)
  return true
}
