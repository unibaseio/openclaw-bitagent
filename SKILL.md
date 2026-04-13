---
name: "bitagent-skill"
description: "Master skill for Bitagent platform. Handles Terminal (ERC-8183) API flows and Bonding Curve CLI trading (launch, buy, sell). Managed via specialized business references."
version: "1.1"
---

# BitAgent Master Skills

This repository manages dual-mode operations for the **Bitagent Platform**:
1.  **Terminal (ERC-8183) Mode**: API-driven identity registration, agent activation, and task orchestration.
2.  **Bonding Curve Mode**: CLI-driven token issuance and trading via `scripts/index.ts`.

## [ACTION] Immediate Action Required

**AS SOON AS THIS SKILL IS LOADED:**

1.  **Authorization**: Check for `UNIBASE_PROXY_AUTH`. If present, skip to step 2. If missing, MUST prompt the user with the steps in [auth.md](references/auth.md).
2.  **Butler Verification & Activation**: Once authorized, call `GET https://api.aip.unibase.com/butler` to check status.
    - If **404/Missing**: You MUST use the [Unibase Pay RPC](references/auth.md#wallet-rpc-operations) to `personal_sign` the "Activate Butler Agent" message and call `POST /butler/activate`.
    - If **Active**: Proceed to orchestration.
3.  **Network Setup**: Ask the owner: "Shall we use BSC Testnet (97) or BSC Mainnet (56)?" Use 97 by default.
4.  **Dependency Check**: Ensure `npm install` has been run at the repo root for CLI tools.

## Business Domains

### 1. Terminal (ERC-8183) Flow
-   **AIP Registration**: Onboarding autonomous identities.
-   **Butler Activation**: Provisioning the custodial agent for the user's wallet.
-   **Task Invocation**: Natural language task orchestration.
-   **Reference**: [terminal.md](references/terminal.md)

### 2. Bonding Curve (CLI Operations)
Use these when the user wants to trade tokens or launch a new agent token. Run from repo root.

| Tool | Command | Result |
| :--- | :--- | :--- |
| **launch** | `npx tsx scripts/index.ts launch --network <bsc\|bscTestnet> --name "<name>" --symbol "<symbol>" --reserve-symbol "<UB\|WBNB\|USD1>"` | Deploys token on curve. |
| **buy** | `npx tsx scripts/index.ts buy --network <bsc\|bscTestnet> --token "<tokenAddress>" --amount "<amount>"` | Buys tokens. |
| **sell** | `npx tsx scripts/index.ts sell --network <bsc\|bscTestnet> --token "<tokenAddress>" --amount "<amount>"` | Sells tokens. |

-   **Reference**: [bonding-curve.md](references/bonding-curve.md)

### 3. Authorization & Wallet
-   **Unibase Pay**: Integration with Privy custodial wallets.
-   **Reference**: [auth.md](references/auth.md)

## Troubleshooting & Config

-   **Endpoints**: See [config.md](references/config.md).
-   **Execution Protocol**: All API flows follow the Analysis → Orchestration → Streaming pattern.
