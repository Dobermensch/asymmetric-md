#!/usr/bin/env node
import { Address, formatEther, parseEther } from 'viem'
import {
  doomerAccount,
  getLogger,
  moonerAccount,
  sepoliaClient,
  sepMoonDoomBTCContract,
  sepMoonDoomETHContract,
  sepMoonOrDoomBTCAddress,
  sepMoonOrDoomETHAddress,
  sepoliaWalletClient,
} from './constants'
import MoonOrDoomAbi from './abis/MoonOrDoom.json'
import config from './config'
import { Rounds, Tokens } from './types'
import { calculateTotalTXValue, claimRewards } from './helpers'

const maxNumberOfRounds = config.numOfRounds
let roundsEntered: bigint[] = []
let roundNumber = 0

const log = getLogger()

const onNewRoundStarted = async (
  betAmt: string,
  epoch: bigint,
  contractAddress: Address
) => {
  if (roundNumber >= config.numOfRounds) {
    log(
      `[INFO] ROUNDS (${roundNumber}) exceeds max number of rounds (${maxNumberOfRounds})`
    )
    process.exit(1)
  }

  const betAmount = parseEther(betAmt)

  const moonTxGasEstimate = await sepoliaClient.estimateContractGas({
    abi: MoonOrDoomAbi,
    account: moonerAccount,
    address: contractAddress,
    args: [epoch],
    functionName: 'enterMoon',
    value: betAmount
  })

  if (!moonTxGasEstimate) {
    log(`[ERROR] Could not estimate enterMoon gas. Got gas value: ${moonTxGasEstimate}`)
    process.exit(1)
  }

  // Can choose to simulate contracts before writing

  const moonTxHash = await sepoliaWalletClient.writeContract({
    abi: MoonOrDoomAbi,
    account: moonerAccount,
    address: contractAddress,
    args: [epoch],
    functionName: 'enterMoon',
    value: betAmount,
  })

  log('moonTxHash: ', moonTxHash)

  const confirmedMoonTxReceipt = await sepoliaClient.waitForTransactionReceipt({
    confirmations: 1,
    hash: moonTxHash,
  })

  if (confirmedMoonTxReceipt.status !== 'success') {
    log('[ERROR] Entering Moon round failed')
    process.exit(1)
  }

  calculateTotalTXValue(
    moonerAccount,
    betAmount,
    epoch,
    moonTxGasEstimate,
    Rounds.MOON,
    confirmedMoonTxReceipt
  )

  // Entering Doom round with doomer wallet

  const doomTxGasEstimate = await sepoliaClient.estimateContractGas({
    abi: MoonOrDoomAbi,
    account: doomerAccount,
    address: contractAddress,
    args: [epoch],
    functionName: 'enterDoom',
    value: betAmount
  })

  if (!doomTxGasEstimate) {
    log(`[ERROR] Could not estimate enterDoom gas. Got gas value: ${doomTxGasEstimate}`)
    process.exit(1)
  }

  const doomTxHash = await sepoliaWalletClient.writeContract({
    abi: MoonOrDoomAbi,
    account: doomerAccount,
    address: contractAddress,
    args: [epoch],
    functionName: 'enterDoom',
    value: betAmount,
  })

  log('doomTxHash: ', doomTxHash)

  const confirmedDoomTxReceipt = await sepoliaClient.waitForTransactionReceipt({
    confirmations: 1,
    hash: doomTxHash,
  })

  if (confirmedDoomTxReceipt.status !== 'success') {
    log('[ERROR] Entering Doom round failed')
    process.exit(1)
  }

  calculateTotalTXValue(
    doomerAccount,
    betAmount,
    epoch,
    doomTxGasEstimate,
    Rounds.DOOM,
    confirmedDoomTxReceipt
  )

  roundNumber++

  roundsEntered.push(epoch)

  // claim rewards
  if (roundsEntered.length >= config.claimAfterRounds) {
    const isSuccess = await claimRewards(
      moonerAccount,
      contractAddress,
      doomerAccount,
      roundsEntered
    )
    if (!isSuccess) {
      process.exit(1)
    }
    roundsEntered = []
  }
}

const start = async () => {
  let unwatch = () => {}
  if (
    !process.env.DOOMER_WALLET_PRIVATE_KEY ||
    !process.env.MOONER_WALLET_PRIVATE_KEY
  ) {
    log('[ERROR] Please set the wallet private keys for mooner and doomer!')
    process.exit(1)
  }

  try {
    const blockNumber = await sepoliaClient.getBlockNumber()
    log('Current BlockNumber: ', blockNumber)

    const token = process.argv[process.argv.length - 1]?.toUpperCase()
    if (!token) {
      log(
        '[ERROR] The command line argument was incorrect! Please choose either eth or btc!'
      )
      process.exit(1)
    }

    let betAmount = '0'
    let contractAddress: Address = '0x'
    let contract

    switch (token) {
      case Tokens.BTC:
        ;[betAmount, contractAddress, contract] = [
          config.btcBetAmount,
          sepMoonOrDoomBTCAddress,
          sepMoonDoomBTCContract,
        ]
        break

      case Tokens.ETH:
        ;[betAmount, contractAddress, contract] = [
          config.ethBetAmount,
          sepMoonOrDoomETHAddress,
          sepMoonDoomETHContract,
        ]
        break

      default:
        break
    }

    if (contractAddress === '0x' || !contract) {
      log(`[ERROR] The contract for ${token} wasn't initialized!`)
      process.exit(1)
    }

    const [_currentEpoch, minEntry] = await Promise.all([
      contract.read.currentEpoch(),
      contract.read.minEntry(),
    ])

    const minEntryNum = minEntry as bigint

    if (parseEther(betAmount) < minEntryNum) {
      log(
        `[ERROR] Failed while starting ETH moonerdoomer. Eth bet amount (${betAmount}) is current less than minEntry ${formatEther(minEntryNum)}`
      )
      process.exit(1)
    }

    log('[INFO] Listeing for StartRound event started')

    unwatch = contract.watchEvent.StartRound(
      {},
      {
        async onLogs(logs: any) {
          const [log] = logs

          const epoch = log?.args?.epoch

          const data = await sepoliaClient.readContract({
            address: contractAddress,
            abi: MoonOrDoomAbi,
            functionName: 'rounds',
            args: [epoch],
          })

          const block = await sepoliaClient.getBlock()

          const canEnterRound = isRoundEnterable(data, block.timestamp)

          if (canEnterRound && epoch) {
            log(`[INFO] Entering round at epoch ${epoch}`)
            onNewRoundStarted(betAmount, epoch, contractAddress)
          } else {
            log(
              `[INFO] Cannot enter round (canEnterRound: ${canEnterRound}) at epoch ${epoch}`
            )
          }
        },
      }
    )
  } catch (e) {
    log('[ERROR]: Problem starting moonerdoomer')
    console.error(e)
    unwatch()
  }
}

const isRoundEnterable = (data: any, blockTimestamp: bigint) => {
  return (
    data[1] != 0 &&
    data[2] != 0 &&
    blockTimestamp > data[1] &&
    blockTimestamp < data[2]
  )
}

start()
