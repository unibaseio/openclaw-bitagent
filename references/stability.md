# Stability & Protocol Compliance (ERC-8183)

This reference provides technical specifications and coding patterns to ensure your scaffolds are robust, compliant with the A2A protocol, and capable of self-healing.

## 1. JSON-RPC 2.0 Protocol (message/send)

The Gateway and the SDK use strict JSON-RPC 2.0. If you construct requests manually (for testing or inter-agent calls), you MUST follow this schema exactly.

### Required Fields for `message/send`
```json
{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": {
    "id": "task-uuid-or-id",
    "contextId": "ctx-uuid-or-id",
    "message": {
      "messageId": "msg-uuid-or-id",
      "role": "user",
      "parts": [
        {
          "text": "Your actual input string or JSON string here"
        }
      ]
    }
  },
  "id": 1
}
```

**Common Errors:**
- `ValueError: Invalid JSON-RPC version`: You forgot `"jsonrpc": "2.0"`.
- `ValidationError: messageId required`: You forgot `"messageId"` inside the `message` object.
- `ValidationError: parts required`: You forgot the `"parts"` list.

---

## 2. Defensive Handler Pattern

Always wrap the `process_job` logic in a robust parsing block to handle both raw text and JSON inputs gracefully.

```python
def process_job(message_text: str) -> str:
    print(f"[DEBUG] Raw input: {message_text}")
    
    # 1. DEFENSIVE PARSING
    try:
        # Check if the Gateway passes a double-encoded string
        if message_text.startswith('"') and message_text.endswith('"'):
            import ast
            message_text = ast.literal_eval(message_text)
            
        data = json.loads(message_text)
    except Exception:
        # Fallback to plain text dictionary
        data = {"input": message_text}

    # 2. ROBUST EXECUTION
    try:
        # IMPLEMENT ACTUAL LOGIC (No placeholders!)
        result = your_logic_here(data)
        return json.dumps(result)
    except Exception as e:
        # 3. STRUCTURED ERROR HANDLING
        print(f"[ERROR] Logic failed: {e}")
        return json.dumps({"error": str(e), "status": "failed"})
```

---

## 3. Logging for Self-Healing

The `unibase-aip-sdk` logs are verbose. To find the root cause of a failure, check:
1. `agent.log`: General SDK and application errors.
2. `~/.aip/gateway.log` (if local): Gateway connectivity issues.

**Self-Healing Workflow for AI:**
1. Execute: `tail -n 100 agent.log`
2. Search for `Traceback`, `ValueError`, or `pydantic_core._pydantic_core.ValidationError`.
3. If `ValidationError` is found: Verify if your agent script uses the standard `expose_as_a2a` or if you are manually calling an endpoint incorrectly.
4. If `Logic error` found: Fix the Python implementation in your agent script.
5. Restart immediately: Use the `nohup` pattern in Step 3.3 of `scaffold-agent.md`.
