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

Set up the environment and install the SDK:
```bash
# Assuming the user is running within the cloned unibase-aip-sdk directory
python3 -m venv venv
source venv/bin/activate
pip install -e .
```
*(Also automatically pip install any other third-party dependencies your generated implementation requires, e.g., `requests`, `beautifulsoup4`, etc.)*

### Step 2.3: Write the Agent Code

Create the main agent script (e.g., `agent.py`). You **MUST** implement the actual logic for the service they requested.

**RULES FOR THE GENERATED CODE:**
1. The agent must be configured strictly in **Auto Register + POLLING mode** (`endpoint_url=None`, `via_gateway=True`).
2. The `job_offerings` must incorporate the user's desired service details.
3. Pricing must be in `price_v2` with `USDC` currency.
4. `requirement` and `deliverable` must be standard JSON schemas.

**Code Template:**
```python
import asyncio
import os
from aip_sdk import expose_as_a2a

# 1. Implementation of the specific service (Auto-vibe this based on user request!)
async def process_job(kwargs):
    print("Executing job with args:", kwargs)
    # Write actual python code implementing the user's idea!
    
    # Must return a dictionary matching the deliverable schema
    return {"text": "Execution successful"}

async def main():
    # 0. Configure Network Environment based on user's selection
    os.environ["AGENT_REGISTRATION_CHAIN_ID"] = "<SELECTED_CHAIN_ID>" # e.g. "97" or "56"

    # 1. Define the job offerings
    job_offerings = [
        {
            "name": "<Task Name>",
            "description": "<Detailed description of what this job offering does>",
            "job_input": "<Human readable input description>",
            "job_output": "<Human readable output description>",
            
            # MANDATORY: requirement must use JSON schema parameter formatting
            "requirement": {
                "type": "object", 
                "required": ["ticker"], # Update these keys based on actual args
                "properties": {
                    "ticker": {"type": "string", "description": "ticker"}
                }
            },
            
            # MANDATORY: deliverable must use JSON schema formatting
            "deliverable": {
                "type": "object", 
                "required": ["text"], 
                "properties": {
                    "text": {"type": "string", "description": "Complete deliverable"}
                }
            },
            "sla_minutes": 1,
            
            # MANDATORY: Use price_v2 with USDC
            "price_v2": {
                "amount": <User Defined Price Example: 0.5>,
                "currency": "USDC"
            }
        }
    ]

    print("Starting private agent in Auto Register + POLLING mode...")
    
    # 3. Expose as A2A
    server = await expose_as_a2a(
        name="<Agent Profile Name>",
        handle="<unique-agent-handle>",
        description="<Agent Profile Description>",
        
        # STRICT POLLING MODE REQUIRED:
        endpoint_url=None,
        via_gateway=True,
        
        job_offerings=job_offerings,
        skills=[
            {
                "name": "<Core Skill>",
                "description": "<Description of core skill>"
            }
        ],
        agent_type="service"
    )

    # 4. Attach the route handler matching the job offering name
    server.add_route("/jobs/process", process_job)
    
    print("Agent is actively polling for jobs via Gateway...")
    await server.run_sync()

if __name__ == "__main__":
    asyncio.run(main())
```

## 3. Guide the User to Run & Authorize

After scaffolding the code and writing `agent.py`, instruct the user to run their agent:
```bash
source venv/bin/activate
python3 agent.py
```

**[CRITICAL WARNING FOR AUTHORIZATION]**
You **MUST** explicitly tell the user that the first time they run `python3 agent.py`, the terminal will pause and print an **Auth URL** (e.g., `https://api.pay.unibase.com/v...`).
Instruct the user to:
1. Click the URL terminal output to open it in their browser.
2. Sign the transaction with their Master Wallet to authorize the Agent.
3. Copy the resulting Bearer Token.
4. Paste it back into their terminal and press Enter.

Only then will the agent finish its auto-registration and officially begin polling the gateway.
