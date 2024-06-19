## Automating Moon or Doom

We have to automate https://yologames.io/moon-or-doom/blast/eth-usd. The smart contracts are given here: https://docs.yologames.io/developers/deployed-contracts.

## Getting started

1. clone repo
2. create a `.env` file from the `.env.template` file provided and fill in the values.
3. Get some BLAST SEPOLIA ETH for both MOONER and DOOMER wallets as this repo uses the BLAST SEPOLIA TESTNET.
4. run `npm install` or `yarn`
5. run `yarn start:eth` or `npm run start:eth` for running the bots on the ETH/USD pair or `yarn start:btc` or `npm run start:btc` for running the bots on the BTC/USD pair.
6. hire me

## DONE

- As soon as the Moon and Doom round starts, place an order to make a moon bet on 1 account for 0.01 ETH (this is configurable in a config file). We want to do this as early as possible, as we get extra points for the first bet and also a higher multiplier on points for placing a bets earlier
- Once the moon transaction has been confirmed, place a DOOM bet on the other account for the same amount.
- If any error state occurs, stop the script and exit.
- Have this script continuously run for X number of rounds (X is configurable in a config file)
- Have the code be flexible enough to trade the BTC contract as well, and have a configuration that flows through seamlessly.
- After you win or lose a round: you can claim the winnings in an account. Have the script be configurable to claim winnings every X number rounds.
- Provide extensive logging that can be enabled / disabled - the goal is the trader running the script has a good idea of the current state of the script at any point. The more info you provide, the better.
- #### Ensure the setup is as secure as possible, and detail out how you would think about security, given that we are likely going to have put private keys on our server. Explain your thought process. ANSWER: Use [Vault](https://www.vaultproject.io/use-cases/secrets-management) for secrets management. That way even if your server is compromised, the private key values will be inaccessible in the environment variables.

## TODO

- Do an error check such that after the placing of a bet, the amount reducing in our ETH account matches what we expect in the bet amount plus gas fees.
