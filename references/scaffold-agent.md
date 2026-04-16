# Scaffold Agent SDK Project

When the user asks to "build an agent", "create an agent", "scaffold a bitagent project", or integrate the `unibase-aip-sdk`, follow these structured steps to scaffold the project in a fixed **auto register + POLLING mode (private Agent)**.

## 1. Ask for Job Offerings & Pricing (Idea Collection)

Start by asking the user to describe:
1. The specific service/job their agent will provide.
2. What input parameters it needs.
3. What data it returns.
4. How they want to price it (Default currency is `USDC`).
5. Which network environment to deploy to: BSC Mainnet (chain id `56`) or BSC Testnet (chain id `97`).

Explain to the user that you will automatically generate the code for them once they provide these basic requirements.

Wait for their response.

## 2. Scaffold the Project (Auto-Vibe Implementation)

Once the user provides their implementation ideas, autonomously execute bash commands and write files to fully scaffold the project in their local workspace.

### Step 2.1: Clone the SDK Repository

Clone the specific SDK repository:
```bash
git clone https://github.com/unibaseio/unibase-aip-sdk
cd unibase-aip-sdk
```

### Step 2.2: Install Dependencies

Set up the environment and install the SDK using `uv`:
```bash
# Install uv if not available
command -v uv >/dev/null 2>&1 || curl -LsSf https://astral.sh/uv/install.sh | sh

cd ~/unibase-aip-sdk
uv venv
source .venv/bin/activate
uv sync
```
*(Also `uv pip install` any other third-party dependencies your generated implementation requires, e.g., `uv pip install openai`, `uv pip install requests`, etc.)*

### Step 2.3: Write the Agent Code

**[MANDATORY]** You MUST ALWAYS write a fresh `agent.py` file from scratch using the template below. NEVER reuse an existing `agent.py` on the server — it is likely missing critical fields like `user_id` and will silently fail.

**RULES FOR THE GENERATED CODE:**
1. The agent must be configured strictly in **Auto Register + POLLING mode** (`endpoint_url=None`, `via_gateway=True`).
2. The `job_offerings` must incorporate the user's desired service details.
3. Pricing must be in `price_v2` with `USDC` currency.
4. `requirement` and `deliverable` must be standard JSON schemas.

**⚠️ CRITICAL GOTCHAS — READ BEFORE WRITING ANY CODE:**
These are real bugs that have caused silent failures in production. You MUST avoid ALL of them:

1. **`user_id` is MANDATORY** — Without `user_id`, the SDK silently skips registration AND polling (the agent starts an empty HTTP server and exits). You MUST extract it from the JWT token's `sub` claim and pass it to `expose_as_a2a(user_id=...)`.
2. **`expose_as_a2a()` is SYNCHRONOUS** — Do NOT `await` it. Do NOT use `async def main()`. Do NOT use `asyncio.run(main())`. Just `def main()` and call `server.run_sync()`.
3. **There is NO `server.add_route()`** — The handler is passed directly via `handler=process_job` to `expose_as_a2a()`. Do NOT try to attach routes after the fact.
4. **`handler` takes a `str` and returns a `str`** — It receives plain text (extracted from A2A Message), NOT a dict. Return `json.dumps(...)` if you need structured output.
5. **Use `AgentJobOffering(...)` type** — Do NOT use raw dicts for job_offerings. Use the typed class from `aip_sdk.types`.
6. **Use `AgentSkillCard(...)` type** — Do NOT use raw dicts for skills. Use the typed class from `aip_sdk.types`.
7. **Always pass `aip_endpoint` and `gateway_url` explicitly** — Do NOT rely on implicit defaults.
8. **Use `uv run agent.py`** — Not `python3 agent.py`.

**Code Template (For reference only, adapt to user requirement):**
*(Note: If you need to see a full, working production example, you can read `references/agent_sdk_startup_guide.py` inside this skill repository).*

```python
import json
import base64
import os
from pathlib import Path

# Load .env file FIRST (before any other imports that might read env vars)
# This ensures UNIBASE_PROXY_AUTH is available from .env
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

from aip_sdk import expose_as_a2a
from aip_sdk.types import AgentJobOffering, AgentJobResource, AgentSkillCard, CostModel

# ============================================================================
# Helper: Extract wallet address from JWT token
# ============================================================================

def extract_wallet_from_token(token: str) -> str:
    """Decode JWT payload to extract wallet address from 'sub' claim."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return ""
        payload = parts[1]
        payload += "=" * ((4 - len(payload) % 4) % 4)
        data = json.loads(base64.b64decode(payload).decode("utf-8"))
        return data.get("sub", "")
    except Exception:
        return ""

# ============================================================================
# Implementation of the specific service (Auto-vibe this based on user request!)
# ============================================================================

def process_job(message_text: str) -> str:
    """
    Receives input text matching the job requirement schema.
    Must return a string (typically JSON) matching the deliverable schema.
    """
    print("Executing job with input:", message_text)
    # Write actual python code implementing the user's idea!
    
    # Must return a string matching the deliverable schema
    return json.dumps({"text": "Execution successful"})

# ============================================================================
# Main
# ============================================================================

def main():
    # 0. Configure Network Environment and Gateway URL
    os.environ["AGENT_REGISTRATION_CHAIN_ID"] = "<SELECTED_CHAIN_ID>" # e.g. "97" or "56"
    os.environ["GATEWAY_URL"] = "http://0.0.0.0:8081"

    # 1. CRITICAL: Extract user_id from the auth token
    #    Without user_id, the SDK silently skips registration AND polling!
    auth_token = os.environ.get("UNIBASE_PROXY_AUTH", "")
    user_id = extract_wallet_from_token(auth_token)
    if not user_id:
        print("ERROR: Cannot extract wallet from UNIBASE_PROXY_AUTH. Set it in .env")
        return

    # 2. Define the job offerings
    job_offerings = [
        AgentJobOffering(
            id="<job_id>",
            name="<Task Name>",
            description="<Detailed description of what this job offering does>",
            type="JOB",
            price=0.0,
            price_v2={
                "type": "fixed",
                "amount": <User Defined Price Example: 0.5>,
                "currency": "USDC"
            },
            job_input="<Human readable input description>",
            job_output="<Human readable output description>",
            
            # MANDATORY: requirement must use JSON schema parameter formatting
            requirement={
                "type": "object", 
                "required": ["ticker"], # Update these keys based on actual args
                "properties": {
                    "ticker": {"type": "string", "description": "ticker"}
                }
            },
            
            # MANDATORY: deliverable must use JSON schema formatting
            deliverable={
                "type": "object", 
                "required": ["text"], 
                "properties": {
                    "text": {"type": "string", "description": "Complete deliverable"}
                }
            },
            sla_minutes=1,
            required_funds=False,
            restricted=False,
            hide=False,
            active=True,
        )
    ]

    print("Starting private agent in Auto Register + POLLING mode...")
    
    # 3. Expose as A2A
    server = expose_as_a2a(
        name="<Agent Profile Name>",
        handle="<unique-agent-handle>",
        description="<Agent Profile Description>",
        
        # Pass the handler directly!
        handler=process_job,
        port=8201,
        host="0.0.0.0",
        
        # CRITICAL: user_id is REQUIRED for registration & polling to work!
        user_id=user_id,
        privy_token=auth_token,
        
        # AIP & Gateway endpoints
        aip_endpoint="https://api.aip.unibase.com",
        gateway_url=os.environ.get("GATEWAY_URL", "https://gateway.aip.unibase.com"),
        chain_id=int(os.environ.get("AGENT_REGISTRATION_CHAIN_ID", "97")),
        
        # STRICT POLLING MODE REQUIRED:
        endpoint_url=None,
        via_gateway=True,
        auto_register=True,
        
        job_offerings=job_offerings,
        job_resources=[], # Optionally add API resources
        cost_model=CostModel(base_call_fee=0.0),
        skills=[
            AgentSkillCard(
                id="<skill_id>",
                name="<Core Skill>",
                description="<Description of core skill>",
                tags=[],
            )
        ],
    )

    print("Agent is actively polling for jobs via Gateway...")
    # NOTE: run_sync is a synchronous blocking call!
    server.run_sync()

if __name__ == "__main__":
    main()
```

## 3. Authorize and Start Background Service

After writing the NEW `agent.py`, you (the AI) must validate then launch it.

**[PRE-LAUNCH CHECKLIST — VERIFY BEFORE STARTING]**
Before launching, you MUST grep the generated `agent.py` to confirm these lines exist. If ANY are missing, rewrite the file!
```bash
grep -q "user_id=" agent.py && echo "✅ user_id" || echo "❌ MISSING user_id"
grep -q "privy_token=" agent.py && echo "✅ privy_token" || echo "❌ MISSING privy_token"
grep -q "aip_endpoint=" agent.py && echo "✅ aip_endpoint" || echo "❌ MISSING aip_endpoint"
grep -q "gateway_url=" agent.py && echo "✅ gateway_url" || echo "❌ MISSING gateway_url"
grep -q "via_gateway=True" agent.py && echo "✅ via_gateway" || echo "❌ MISSING via_gateway"
grep -q "extract_wallet_from_token" agent.py && echo "✅ wallet_extract" || echo "❌ MISSING wallet_extract"
```
If any line prints ❌, STOP and fix agent.py before proceeding!

**[CRITICAL INSTRUCTION FOR YOU (THE AI)]**
You must NEVER run `agent.py` synchronously or use any process wait/poll/monitor tools on it! The agent runs an infinite loop. If you wait on it, you will lock up forever and become unresponsive!

**BANNED COMMANDS — NEVER USE THESE:**
- ❌ `source venv/bin/activate && python3 agent.py` — This runs synchronously and locks you up!
- ❌ `source .venv/bin/activate && python3 agent.py` — Same problem!
- ❌ `python3 agent.py` — Same problem! 
- ❌ Any `wait`, `poll`, `ps aux | grep agent`, `cat /proc`, `tail` AFTER launching

**Step-by-step launch sequence:**

1. **Write auth token to `.env`** (the variable name MUST be `UNIBASE_PROXY_AUTH`, not `UNIBASE_TOKEN` or anything else):
   ```bash
   echo "UNIBASE_PROXY_AUTH=<the_token>" > ~/unibase-aip-sdk/.env
   ```
   If `.env` already has `UNIBASE_PROXY_AUTH` set, skip this step.

2. **Kill old process + Start new one (SINGLE COMMAND, FIRE AND FORGET)**:
   Copy this EXACT command. Do NOT modify it. Do NOT split it into multiple commands:
   ```bash
   pkill -f "agent.py" 2>/dev/null; lsof -ti:8201 | xargs kill -9 2>/dev/null; cd ~/unibase-aip-sdk && nohup uv run agent.py > agent.log 2>&1 & disown
   ```

3. **IMMEDIATELY reply** to the user:
   > "Agent is now running in the background. Check logs: `tail -f ~/unibase-aip-sdk/agent.log`"

Do NOT run any further commands to check on the process. Just reply and stop.
