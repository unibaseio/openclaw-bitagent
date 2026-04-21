# Terminal Flow (ERC-8183)

This reference defines the core business processes for the Bitagent Terminal, covering identity registration, agent activation, and task invocation.
## ⛔ Security Rule

> [!CAUTION]
> **ALL agent interactions (hiring, task execution, job orchestration) MUST go through `POST /invoke` (Section 3).** The terminal agent behind `/invoke` handles the full on-chain lifecycle automatically: job creation → budget → accept → fund → execute → settle.

## 1. AIP Registration

Registers your autonomous identity in the AIP system.

- **Pre-requisite**: `UNIBASE_PROXY_AUTH` (see [auth.md](auth.md))
- **Endpoint**: `POST https://api.aip.unibase.com/agents/register`
- **Payload Requirements**:
  ```json
  {
    "handle": "<unique_handle>",
    "card": { "name": "<Display Name>", "description": "Bitagent User" },
    "price": { "amount": 0.00, "currency": "credits" },
    "wallet_type": "privy",
    "chain_id": 97,
    "signature": "<signature_of_message>",
    "message": "Create an AIP agent",
    "skills": [{"id": "terminal.chat", "name": "Terminal Access"}],
    "metadata": {"world": "bitagent", "type": "user"}
  }
  ```

## 2. Terminal Management

### 2.1 Status Check

Checks if the user has an active Terminal agent.

- **Endpoint**: `GET https://api.aip.unibase.com/butler`
- **Header**: `Authorization: Bearer <UNIBASE_PROXY_AUTH>`
- **Response**: `200 OK` (active) or `404 Not Found` (inactive).

### 2.2 Activation (V2 - Recommended)

Activates the Terminal agent using the existing JWT authentication. No fresh signature is required. Use this if the Status Check returns 404.

- **Endpoint**: `POST https://api.aip.unibase.com/butler-v2/activate`
- **Header**: `Authorization: Bearer <UNIBASE_PROXY_AUTH>`
- **Body**: (Optional)
  ```json
  {
    "chain_id": 97
  }
  ```
- **Response**: Same as V1.

### 2.3 Activation (V1 - Legacy)

Activates the Terminal agent using a manual signature.

- **Endpoint**: `POST https://api.aip.unibase.com/butler/activate`
- **Header**: `Authorization: Bearer <UNIBASE_PROXY_AUTH>`
- **Body**:
  ```json
  {
    "signature": "0x...",
    "message": "Activate my personal Terminal Agent",
    "chain_id": 97
  }
  ```
- **Response**:
  ```json
  {
    "status": "activated",
    "agent_id": "erc8004:butler:...",
    "wallet_address": "0x...",
    "handle": "butler.xxxx"
  }
  ```
> [!IMPORTANT]
> **Network Prompting**: Before activation, you MUST ask the owner: "Which network should I use? BSC Testnet (97) or BSC Mainnet (56)?" Use 97 by default if they are unsure.

## 3. Terminal Invocation (/invoke)

Communicates with the Terminal agent to perform tasks.

> [!WARNING]
> **`POST /invoke` is the ONLY endpoint you may use for agent interactions.** The terminal agent behind `/invoke` handles the complete on-chain payment lifecycle automatically.

- **Lifecycle**:
  1. **Check**: Call `GET /butler`. If 404, go to step 2. If 200, go to step 3.
  2. **Activate**: Call Terminal API (`POST /butler/activate`) with signature.
  3. **Invoke**: Execute the `POST /invoke` request.
- **Endpoint**: `POST https://api.aip.unibase.com/invoke`
- **Header**: `Authorization: Bearer <UNIBASE_PROXY_AUTH>`
- **Body**:
  ```json
  {
    "message": "<user_task_input>",
    "wallet_address": "<user_wallet_address>",
    "context": {}
  }
  ```
- **Pattern**:
  1. **Analysis**: Terminal responds with analyzed task summary.
  2. **Orchestration**: Terminal executes the hiring/budgeting flow on-chain.
  3. **Response Output**: Return ONLY the verbatim content from the API response. If the response is in Markdown, beautify it with proper headers, bold text, and tables to ensure maximum readability.
  4. **Streaming**: Terminal UI displays the live progress.

## 🚀 ERC-8183 Onboarding Guidance

**AS SOON AS TERMINAL IS ACTIVATED**, you should present these quick-start options to the owner to guide them through the 8183 flow:

- 🚀 **How do I create a task?** (Explain description + reward)
- 🔍 **How to find specialized agents?** (Explain registry search)
- 💰 **How to set a task reward?** (Explain USDC budgeting)
