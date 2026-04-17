# Scaffold Agent SDK Project

When the user asks to "build an agent", "create an agent", "scaffold a bitagent project", or integrate the `unibase-aip-sdk`, follow these structured steps to scaffold the project in a fixed **auto register + POLLING mode (private Agent)**.

## 1. Ask for Job Offerings & Pricing (Idea Collection)

Start by asking the user to describe:
1. The specific service/job their agent will provide.
2. What input parameters it needs.
3. What data it returns.
4. How they want to price it (Default currency is `USDC`).
5. Which network environment to deploy to: BSC Mainnet (chain id `56`) or BSC Testnet (chain id `97`).

### 1.1 Analyze and Brainstorm Implementation
Before generating any code, you MUST mentally (or via a thought block) brainstorm how to implement the logic. 
- Can this be done with standard Python libraries?
- Does it require a specialized API (e.g., Binance, Weather, Search)?
- Does it require an LLM (e.g., for story generation, creative writing, analysis)?
- **CRITICAL**: Do NOT use placeholders. If the user wants a story generator, you must include logic that either generates a story using a sophisticated template OR (better) integrates an LLM API.

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

**[MANDATORY]** You MUST ALWAYS write a fresh `agent_{handle}.py` file from scratch (where `{handle}` is the unique agent handle) using the template below. NEVER reuse an existing file — it's likely missing critical fields like `user_id`.

**RULES FOR THE GENERATED CODE:**
1. The agent must be configured strictly in **Auto Register + POLLING mode** (`endpoint_url=None`, `via_gateway=True`).
2. The `job_offerings` must incorporate the user's desired service details.
3. Pricing must be in `price_v2` with `USDC` currency.
4. `requirement` and `deliverable` must be standard JSON schemas.
5. **FUNCTIONAL COMPLETENESS**: Use your internal reasoning to implement the core logic. 
   - ❌ FORBIDDEN: `return "Success"` or placeholder strings.
   - ✅ MANDATORY: If the user asks for a Story Generator, implement `generate_story` with actual creative logic or an LLM call.
   - ✅ MANDATORY: If an LLM is used, include the `openai` package in `uv pip install` and add `OPENAI_API_KEY` to the `.env` instructions.

**⚠️ CRITICAL GOTCHAS — READ BEFORE WRITING ANY CODE:**
These are real bugs that have caused silent failures in production. You MUST avoid ALL of them:

1. **`user_id` is MANDATORY** — Without `user_id`, the SDK silently skips registration AND polling (the agent starts an empty HTTP server and exits). You MUST extract it from the JWT token's `sub` claim and pass it to `expose_as_a2a(user_id=...)`.
2. **`expose_as_a2a()` is SYNCHRONOUS** — Do NOT `await` it. Do NOT use `async def main()`. Do NOT use `asyncio.run(main())`. Just `def main()` and call `server.run_sync()`.
3. **There is NO `server.add_route()`** — The handler is passed directly via `handler=process_job` to `expose_as_a2a()`. Do NOT try to attach routes after the fact.
4. **`handler` takes a `str` and returns a `str`** — It receives plain text (extracted from A2A Message), NOT a dict. Return `json.dumps(...)` if you need structured output.
5. **Use `AgentJobOffering(...)` type** — Do NOT use raw dicts for job_offerings. Use the typed class from `aip_sdk.types`.
6. **Use `AgentSkillCard(...)` type** — Do NOT use raw dicts for skills. Use the typed class from `aip_sdk.types`.
7. **Always pass `aip_endpoint` and `gateway_url` explicitly** — Do NOT rely on implicit defaults.
8. **Use `uv run agent_{handle}.py`** — Not `python3 agent.py`.
9. **Multi-Agent Support** — Use unique filenames and the `find_available_port` helper to allow multiple agents to coexist on different ports.

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
# Helpers: Port Discovery and Identity
# ============================================================================

def find_available_port(start_port: int, max_attempts: int = 50) -> int:
    """Check sequential ports until an available one is found."""
    import socket
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('0.0.0.0', port)) != 0:
                return port
    return start_port

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
    Receives input text from the Gateway.
    IMPORTANT: message_text can be EITHER:
      - JSON string like '{"english_text": "Hello world"}'
      - Plain text like 'English to Traditional Chinese Translation where english_text is Hello world'
    Your handler MUST handle BOTH formats gracefully!
    Must return a JSON string matching the deliverable schema.
    """
    print("Executing job with input:", message_text)
    
    # Try to parse as JSON first, fallback to treating as plain text
    try:
        kwargs = json.loads(message_text)
    except (json.JSONDecodeError, TypeError):
        # Not JSON — treat the entire message as the primary input
        kwargs = {"input": message_text}
    
    # ========================================================================
    # VIBE CHECK: Write actual python code implementing the user's idea!
    # ========================================================================
    # If the user wants creative writing, you might use a template or LLM:
    # story = f"Once upon a time in {kwargs.get('location')}, {kwargs.get('input')}..."
    # 
    # If the user wants an LLM:
    # client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    # response = client.chat.completions.create(...)
    
    # Must return a JSON string matching the deliverable schema
    return json.dumps({"text": "Full implemented result based on user vibe"})

# ============================================================================
# Main
# ============================================================================

def main():
    # 0. Configure Network Environment and Gateway URL
    os.environ["AGENT_REGISTRATION_CHAIN_ID"] = "<SELECTED_CHAIN_ID>" # e.g. "97" or "56"
    # Gateway URL — use the public gateway for production
    os.environ["GATEWAY_URL"] = "https://gateway.aip.unibase.com"

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

    # 3. Dynamic Port Discovery (Multi-Agent Support)
    base_port = int(os.environ.get("AGENT_PORT", "8201"))
    resolved_port = find_available_port(base_port)
    print(f"Agent will start on port: {resolved_port}")

    # 4. Expose as A2A
    server = expose_as_a2a(
        name="<Agent Profile Name>",
        handle="<unique-agent-handle>",
        description="<Agent Profile Description>",
        
        # Pass the handler directly!
        handler=process_job,
        port=resolved_port,
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

After writing the NEW `agent.py`, you (the AI) must validate, launch, authorize, then restart it.

**[PRE-LAUNCH CHECKLIST — VERIFY BEFORE STARTING]**
Before launching, you MUST grep the generated `agent_{handle}.py` to confirm these lines exist. If ANY are missing, rewrite the file!
```bash
cd ~/unibase-aip-sdk
grep -q "user_id=" agent_{handle}.py && echo "✅ user_id" || echo "❌ MISSING user_id"
grep -q "privy_token=" agent_{handle}.py && echo "✅ privy_token" || echo "❌ MISSING privy_token"
grep -q "aip_endpoint=" agent_{handle}.py && echo "✅ aip_endpoint" || echo "❌ MISSING aip_endpoint"
grep -q "gateway_url=" agent_{handle}.py && echo "✅ gateway_url" || echo "❌ MISSING gateway_url"
grep -q "via_gateway=True" agent_{handle}.py && echo "✅ via_gateway" || echo "❌ MISSING via_gateway"
grep -q "extract_wallet_from_token" agent_{handle}.py && echo "✅ wallet_extract" || echo "❌ MISSING wallet_extract"
grep -q "find_available_port" agent_{handle}.py && echo "✅ port_discovery" || echo "❌ MISSING port_discovery"
```
If any line prints ❌, STOP and fix the agent script before proceeding!

**[CRITICAL INSTRUCTION FOR YOU (THE AI)]**
You must NEVER run the agent script synchronously or use any process wait/poll/monitor tools on it! The agent runs an infinite loop. If you wait on it, you will lock up forever and become unresponsive!

**BANNED COMMANDS — NEVER USE THESE:**
- ❌ `source venv/bin/activate && python3 agent_{handle}.py` — This runs synchronously and locks you up!
- ❌ `source .venv/bin/activate && python3 agent_{handle}.py` — Same problem!
- ❌ `python3 agent_{handle}.py` — Same problem! 
- ❌ Any `wait`, `poll`, `ps aux | grep agent`, `cat /proc`, `tail` AFTER launching

**Step-by-step launch sequence:**

### Step 3.1: Check if token already exists

```bash
grep -q "UNIBASE_PROXY_AUTH=" ~/unibase-aip-sdk/.env 2>/dev/null && echo "✅ Token exists, skip to Step 3.3" || echo "⚠️ No token yet, proceed to Step 3.2"
```

### Step 3.2: First Run — Get Authorization URL (ONLY if no token exists)

The user does NOT have a token yet. Use the API to get an auth URL:

1. **Get the authorization URL** via API:
   ```bash
   curl -s -X POST https://api.pay.unibase.com/v1/init -H "Content-Type: application/json" -d 'true' | python3 -c "import sys,json; print('👉 Authorize here:', json.load(sys.stdin).get('auth_url') or json.load(sys.stdin).get('authUrl'))"
   ```

2. **Tell the user** to:
   - Open the authorization link in their browser
   - Sign the authorization with their wallet
   - Paste the returned JWT token back to you

3. **Once the user provides the token**, save it to `.env` and proceed to Step 3.3:
   ```bash
   echo "UNIBASE_PROXY_AUTH=<the_token>" > ~/unibase-aip-sdk/.env
   ```

### Step 3.3: Start in Background (FIRE AND FORGET)

Copy this EXACT command. Replace `{handle}` with the actual agent handle.
**CRITICAL**: The `< /dev/null` and direct virtualenv python path are REQUIRED — without them, the terminal tool will hang waiting for the background process forever!
```bash
pkill -f "agent_{handle}.py" 2>/dev/null; cd ~/unibase-aip-sdk && nohup .venv/bin/python3 agent_{handle}.py > agent_{handle}.log 2>&1 < /dev/null & echo "Agent started, check logs: tail -f ~/unibase-aip-sdk/agent_{handle}.log"
```

## 4. Self-Healing & Troubleshooting

As an AI assistant, you are responsible for the agent's stability. If the agent starts but fails to respond to jobs, follow this self-healing protocol.

### 4.1 Check Logs Immediately
Always run this command after starting or if a failure is reported:
```bash
tail -n 100 ~/unibase-aip-sdk/agent.log
```

### 4.2 Diagnostic & Fix Table

| Error in Log | Root Cause | Fix Action |
| :--- | :--- | :--- |
| `ValueError: Invalid JSON-RPC version` | Missing `"jsonrpc": "2.0"` in a call. | Update the calling logic (see [stability.md](stability.md)). |
| `ValidationError: messageId/parts required` | Malformed A2A Message object. | Ensure `Message` has `messageId` and `parts` (see [stability.md](stability.md)). |
| `TypeError: 'coroutine' object ...` | Missing `await` in handler or SDK call. | Find the unawaited call in the agent script and fix it. |
| `Timeout connecting to server` (Redis) | Network/Firewall issue. | Verify `REDIS_URL` and security groups (port 6379). |
| `Agent registered successfully` (but no polling) | Missing `user_id` or `via_gateway=True`. | Verify these required params in `expose_as_a2a()`. |

### 4.3 Automated Fix Protocol
1. **Identify**: Find the `Exception` or `Traceback` in `agent.log`.
2. **Read Code**: Use `view_file` to read the current agent script (`agent_{handle}.py`).
3. **Execute Fix**: Apply a `replace_file_content` to fix the bug.
4. **Restart**: Re-run the background start command from **Step 3.3**.
5. **Verify**: Check `tail -n 100 agent.log` again to ensure "Starting Gateway polling loop" appears.

> [!TIP]
> For more technical details on protocol compliance, see [stability.md](stability.md).

Do NOT run any further commands to check on the process. Just reply and stop.

