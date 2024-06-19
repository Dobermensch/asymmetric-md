#!/usr/bin/env node

import {
  doomerAccount,
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
import { Address, formatEther, parseEther } from 'viem'
import { Rounds, Tokens } from './types'
import { calculateTotalTXValue, claimRewards } from './helpers'

const ethBetAmount = config.ethBetAmount!
const maxNumberOfRounds = config.numOfRounds
let roundsEntered: bigint[] = []
let roundNumber = 0

const onNewRoundStarted = async (epoch: bigint, contractAddress: Address) => {
  if (roundNumber >= config.numOfRounds) {
    console.log(
      `[INFO] ROUNDS (${roundNumber}) exceeds max number of rounds (${maxNumberOfRounds})`
    )
    process.exit(1)
  }

  // Can choose to simulate contracts before writing

  const betAmount = parseEther(ethBetAmount)

  const moonTxHash = await sepoliaWalletClient.writeContract({
    abi: MoonOrDoomAbi,
    account: moonerAccount,
    address: contractAddress,
    args: [epoch],
    functionName: 'enterMoon',
    value: betAmount,
  })

  console.log('moonTxHash: ', moonTxHash)

  const confirmedMoonTxReceipt = await sepoliaClient.waitForTransactionReceipt({
    confirmations: 1,
    hash: moonTxHash,
  })

  if (confirmedMoonTxReceipt.status !== 'success') {
    console.log('[ERROR] Entering Moon round failed')
    process.exit(1)
  }

  calculateTotalTXValue(
    moonerAccount,
    epoch,
    Rounds.MOON,
    confirmedMoonTxReceipt
  )

  // Entering Doom round with doomer wallet

  const doomTxHash = await sepoliaWalletClient.writeContract({
    abi: MoonOrDoomAbi,
    account: doomerAccount,
    address: contractAddress,
    args: [epoch],
    functionName: 'enterDoom',
    value: betAmount,
  })

  console.log('doomTxHash: ', doomTxHash)

  const confirmedDoomTxReceipt = await sepoliaClient.waitForTransactionReceipt({
    confirmations: 1,
    hash: doomTxHash,
  })

  if (confirmedDoomTxReceipt.status !== 'success') {
    console.log('[ERROR] Entering Doom round failed')
    process.exit(1)
  }

  calculateTotalTXValue(
    doomerAccount,
    epoch,
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
    console.log(
      '[ERROR] Please set the wallet private keys for mooner and doomer!'
    )
    process.exit(1)
  }

  try {
    const blockNumber = await sepoliaClient.getBlockNumber()
    console.log('Current BlockNumber: ', blockNumber)

    const token = process.argv[process.argv.length - 1]?.toUpperCase()
    if (!token) {
      console.log(
        '[ERROR] The command line argument was incorrect! Please choose either eth or btc!'
      )
      process.exit(1)
    }

    let contractAddress
    let contract

    switch (token) {
      case Tokens.BTC:
        ;[contractAddress, contract] = [
          sepMoonOrDoomBTCAddress,
          sepMoonDoomBTCContract,
        ]
        break

      case Tokens.ETH:
        ;[contractAddress, contract] = [
          sepMoonOrDoomETHAddress,
          sepMoonDoomETHContract,
        ]
        break

      default:
        break
    }

    if (!contractAddress || !contract) {
      console.log(`[ERROR] The contract for ${token} wasn't initialized!`)
      process.exit(1)
    }

    const [_currentEpoch, minEntry] = await Promise.all([
      contract.read.currentEpoch(),
      contract.read.minEntry(),
    ])

    const minEntryNum = minEntry as bigint

    if (parseEther(ethBetAmount) < minEntryNum) {
      console.log(
        `[ERROR] Failed while starting ETH moonerdoomer. Eth bet amount (${ethBetAmount}) is current less than minEntry ${formatEther(minEntryNum)}`
      )
      process.exit(1)
    }

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
            console.log(`[INFO] Entering round at epoch ${epoch}`)
            onNewRoundStarted(epoch, contractAddress)
          }
        },
      }
    )
  } catch (e) {
    console.log('[ERROR - ETH]: Problem starting moonerdoomer')
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
