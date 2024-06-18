import dotenv from 'dotenv'
import { createPublicClient, createWalletClient, getContract, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { blastSepolia } from 'viem/chains'
import { Address } from 'viem'
import MoonOrDoomAbi from './abis/MoonOrDoom.json'

dotenv.config()

const doomerPKey = `0x${process.env.DOOMER_WALLET_PRIVATE_KEY}` as Address
export const doomerAccount = privateKeyToAccount(doomerPKey)

const moonerPKey = `0x${process.env.MOONER_WALLET_PRIVATE_KEY}` as Address
export const moonerAccount = privateKeyToAccount(moonerPKey)

export const sepoliaClient = createPublicClient({
  chain: blastSepolia,
  transport: http(),
})

export const sepMoonOrDoomBTCAddress =
  '0xa64A0736178B6FBf40DaEd2558192dfE1291CDc3' as Address
export const sepMoonOrDoomETHAddress =
  '0xE27BFa7760e8849A49F6f40E20FA34eE7A811e83' as Address

export const sepMoonDoomBTCContract = getContract({
  address: sepMoonOrDoomBTCAddress,
  abi: MoonOrDoomAbi,
  // 1a. Insert a single client
  client: sepoliaClient,
  // 1b. Or public and/or wallet clients
  // client: { public: publicClient, wallet: walletClient }
})

export const sepMoonDoomETHContract = getContract({
  address: sepMoonOrDoomETHAddress,
  abi: MoonOrDoomAbi,
  // 1a. Insert a single client
  client: sepoliaClient,
  // 1b. Or public and/or wallet clients
  // client: { public: publicClient, wallet: walletClient }
})

export const sepoliaWalletClient = createWalletClient({
  chain: blastSepolia,
  transport: http(),
})
