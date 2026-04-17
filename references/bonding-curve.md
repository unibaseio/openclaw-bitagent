# Bonding Curve Operations (CLI)

This reference defines the CLI-only business processes for interacting with BitAgent bonding curves.

## 🛠️ Prerequisites

Before executing any CLI commands, ensure the following are met:

1.  **Dependencies**: Run `npm install` at the repository root.
2.  **Wallet Credentials**: A `PRIVATE_KEY` (0x...) must be configured in your environment or configuration file.
3.  **Network Awareness**: Confirm with the owner whether to use `bsc` (Mainnet) or `bscTestnet` (Testnet).

## 🚀 Launch Agent Token

Use this command to deploy a new agent token on a bonding curve.

-   **Command**: `npx tsx scripts/index.ts launch --network <network> --name "<name>" --symbol "<symbol>" --reserve-symbol "<reserve>"`
-   **Parameters**:
    -   `--network`: `bsc` or `bscTestnet`.
    -   `--name`: Full name of the agent/token.
    -   `--symbol`: Token ticker (e.g., $AGENT).
    -   `--reserve-symbol`: The asset to back the curve. Supported: `UB`, `WBNB`, `USD1`.
-   **Output**: Returns the newly deployed Contract Address and its BitAgent URL.

## 💰 Trading Tokens (Buy/Sell)

Interact with existing bonding curves by buying or selling tokens.

### Buy Tokens
-   **Command**: `npx tsx scripts/index.ts buy --network <network> --token "<tokenAddress>" --amount "<amount>"`
-   **Parameters**:
    -   `tokenAddress`: The contract address of the target token.
    -   `amount`: The amount of reserve tokens to spend.

### Sell Tokens
-   **Command**: `npx tsx scripts/index.ts sell --network <network> --token "<tokenAddress>" --amount "<amount>"`
-   **Parameters**:
    -   `tokenAddress`: The contract address of the target token.
    -   `amount`: The amount of agent tokens to sell.

## 🛡️ Execution Protocol

1.  **Pre-fill Missing Info**: If the user says "Launch a token called AI", you MUST ask for the Symbol and Reserve Symbol before running the command.
2.  **Mandatory Confirmation**: Always show the owner the exact command you are about to run and ask for confirmation. 
    - *Example*: "I am about to launch 'AI Agent' ($AIA) on BSC Testnet backed by WBNB. Proceed?"
3.  **Capture Output**: Capture the CLI's `stdout` and present the hash or result clearly to the user.
