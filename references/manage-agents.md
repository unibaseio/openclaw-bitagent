# Agent Lifecycle Management

This reference provides the logic for discovering, stopping, and restarting independent Bitagent SDK services running on the local machine.

## 1. Discovery (Listing Running Agents)

To list all agents following the `agent_{handle}.py` naming convention, use this command:

```bash
ps -ef | grep "agent_.*\.py" | grep -v grep | awk '{print $2}' | xargs -I {} sh -c 'printf "PID: {} | File: "; ps -p {} -o command= | awk "{print \$NF}"; printf "Listen Port: "; lsof -nP -iTCP -sTCP:LISTEN -p {} | grep LISTEN | awk "{print \$9}" | cut -d: -f2'
```

### Formatting the Table
As an AI, you should run the discovery command above, parse the result, and present it to the user in a clean table:

| PID | Handle | Description | Port | Status |
| :--- | :--- | :--- | :--- | :--- |
| 12345 | story_gen | Creative Story Generator | 8201 | 🟢 Running |
| 12346 | translator | ZH-KR Translator | 8202 | 🟢 Running |

> [!TIP]
> To get the **Description**, you can grep the source file:
> `grep "description=" agent_{handle}.py | cut -d\" -f2`

---

## 2. Terminating an Agent

To stop a specific agent, use its unique filename pattern. This ensures you don't kill other running agents.

```bash
# By Handle
pkill -f "agent_{handle}.py"

# By Port (if handle is unknown)
lsof -ti:8201 | xargs kill -9 2>/dev/null
```

---

## 3. Restarting an Agent

A restart is a sequence of **Stop** and **Background Start**.

```bash
# 1. Stop the existing process
pkill -f "agent_{handle}.py" 2>/dev/null

# 2. Start in background using the fire-and-forget pattern
cd ~/unibase-aip-sdk && nohup .venv/bin/python3 agent_{handle}.py > agent_{handle}.log 2>&1 < /dev/null & echo "Agent {handle} restarted."
```

---

## 4. Verification

After any lifecycle change (Start/Stop/Restart), always verify the logs to ensure the agent has successfully resumed polling:

```bash
tail -n 50 ~/unibase-aip-sdk/agent_{handle}.log | grep "Starting Gateway polling loop"
```
