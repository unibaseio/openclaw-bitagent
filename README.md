# BitAgent Skill

**BitAgent Skill** is a universal platform pack for autonomous agents. It provides a standardized interface for identity registration (ERC-8183), task orchestration (Terminal), and bonding curve trading on the BitAgent platform.

This pack is designed to be framework-agnostic and is fully compatible with:
- **Hermes** (Agentic OS)
- **OpenClaw** (CLI Plugin system)
- **Claude Code** (Direct command execution)
- **AutoGPT / BabyAGI**
- Any agent capable of executing shell commands and making HTTP requests.

## Key Capabilities

1.  **Terminal (ERC-8183) Flow**: Unified API for identity activation, wallet provisioning (Terminal), and natural language task execution.
2.  **Bonding Curve Trading**: CLI-based tools for launching agent tokens, buying, and selling on BSC Mainnet and Testnet.
3.  **Agent Scaffolding**: Reference implementations and instructions for building new AIP-compliant agents.

---

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/unibaseio/bitagent-skills bitagent-skill
    ```

2.  **Install dependencies**:
    ```bash
    cd bitagent-skill
    npm install
    ```

## Configuration

The skill pack typically requires a `PRIVATE_KEY` for on-chain operations and a `UNIBASE_PROXY_AUTH` token for API operations.

### Environment Variables

Configure these in your environment or your agent's specific skill configuration:

| Variable | Description |
| :--- | :--- |
| `PRIVATE_KEY` | Wallet private key (0x...) for on-chain bonding curve trading. |
| `UNIBASE_PROXY_AUTH` | JWT token for Terminal/AIP API authentication. |

---

## Framework Integration

### OpenClaw
Add the directory to your `openclaw.json` under `extraDirs`.

### Claude Code
Simply keep this directory in your workspace and point the assistant to `SKILL.md`.

### Hermes
Register this as a local skill and allow it to execute the business logic in `scripts/index.ts`.

---

## Technical Structure

- **SKILL.md**: The "Brain" of the pack. Contains the high-level instructions and triggers for the AI agent.
- **scripts/index.ts**: The "Muscle". Provides the CLI implementation for complex on-chain logic.
- **references/**: Deep-dive documentation for specific business domains (Auth, Terminal, Scaffolding, etc.).

---

## License
MIT
