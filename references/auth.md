# Authorization (Unibase Pay / Privy)

The Terminal business flow requires an `Authorization` token (JWT) to interact with Butler and manage AIP registration.

## Getting Authorization Token

Authentication is handled via **Unibase Pay** (Privy custodial wallet). You must facilitate the following interactive flow to obtain the `UNIBASE_PROXY_AUTH` token for the owner.

### Flow: Interactive Authorization

1.  **Initialize Login**: Call the initialization API internally:
    ```bash
    curl -X POST "https://api.pay.unibase.com/v1/init" --json "true"
    ```
    *Extract the `authUrl` from the response.*

2.  **Generate Auth Link**: Provide the user with the authorization link:
    - **Message**: "I need your authorization to access the Terminal features. Please click here to approve: [authUrl]. Once you get the token, please paste it here."

3.  **Persist Token**: Save the provided token as `UNIBASE_PROXY_AUTH`.
    - All subsequent requests to AIP or Terminal APIs MUST include `Authorization: Bearer <UNIBASE_PROXY_AUTH>`.

## Wallet RPC Operations (Autonomous Signing)

Once authorized, the agent can use the proxy wallet to sign transactions or messages (e.g., for **AIP registration** or **Butler activation**) without further user interaction. This is critical for the "autonomous activation" flow.

- **Endpoint**: `POST https://api.pay.unibase.com/v1/wallets/me/rpc`
- **Header**: `Authorization: Bearer <UNIBASE_PROXY_AUTH>`
- **Body Example (personal_sign)**:
  ```json
  {
    "method": "personal_sign",
    "params": ["Create an AIP agent", "<wallet_address>"]
  }
  ```
