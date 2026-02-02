
import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc, bscTestnet } from 'viem/chains';
import { bitagent } from '@bitagent/sdk';
import { SiweMessage } from 'siwe';

// Config Types
type TokenConfig = {
    symbol: string;
    token: string;
    decimals: number;
    initialPrice: number;
    stepCount: number;
};

type Config = {
    chain: typeof bsc | typeof bscTestnet;
    apiBase: string;
    authApiBase: string;
    webBase: string;
    tokens: Record<string, TokenConfig>;
};


// Token Configurations
const TOKENS_97: Record<string, TokenConfig> = {
    'UB': {
        symbol: 'UB',
        token: '0x7e624D1b87ecb3985E94dbE3Db184594e4E5DB37',
        decimals: 18,
        initialPrice: 8e-6,
        stepCount: 100,
    },
    'USD1': {
        symbol: 'USD1',
        token: '0xB9951cd2921f72AE7f2d7C9ec2036bAD80076085',
        decimals: 18,
        initialPrice: 8e-7,
        stepCount: 100,
    },
    'WBNB': {
        symbol: 'WBNB',
        token: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
        decimals: 18,
        initialPrice: 8e-10,
        stepCount: 99,
    },
};

const TOKENS_56: Record<string, TokenConfig> = {
    'UB': {
        symbol: 'UB',
        token: '0x40b8129B786D766267A7a118cF8C07E31CDB6Fde',
        decimals: 18,
        initialPrice: 8e-6,
        stepCount: 100,
    },
    'USD1': {
        symbol: 'USD1',
        token: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
        decimals: 18,
        initialPrice: 8e-7,
        stepCount: 100,
    },
    'WBNB': {
        symbol: 'WBNB',
        token: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        decimals: 18,
        initialPrice: 8e-10,
        stepCount: 99,
    },
};

// Main Configurations
const CONFIGS: Record<number, Config> = {
    97: { // BSC Testnet
        chain: bscTestnet,
        apiBase: 'https://testnet-api.bitagent.io',
        authApiBase: 'https://testnet-api.bitagent.io',
        webBase: 'https://testnet.app.bitagent.io',
        tokens: TOKENS_97
    },
    56: { // BSC Mainnet
        chain: bsc,
        apiBase: 'https://api.bitagent.io',
        authApiBase: 'https://api.bitagent.io',
        webBase: 'https://app.bitagent.io',
        tokens: TOKENS_56
    }
};

const BOND_VERSION = '3.1.0';
const MAX_SUPPLY_AT_CURVE = 8_500_000_000;

let config: Config;

async function getAuthenticatedClient() {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY environment variable is not set.");

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const client = createWalletClient({
        account,
        chain: config.chain,
        transport: http()
    });

    // 1. Get Nonce
    const nonceResponse = await fetch(`${config.authApiBase}/account/nonce?account=${account.address}&chain_id=${config.chain.id}`);
    if (!nonceResponse.ok) {
        throw new Error(`Failed to fetch nonce: ${nonceResponse.status} ${nonceResponse.statusText} - ${await nonceResponse.text()}`);
    }
    const nonceText = await nonceResponse.text();
    let nonceRes;
    try {
        nonceRes = JSON.parse(nonceText);
    } catch (e) {
        throw new Error(`Failed to parse nonce response: ${nonceText}`);
    }

    if (!nonceRes.nonce) throw new Error("Failed to get nonce");

    // 2. Sign SIWE
    const message = new SiweMessage({
        domain: nonceRes.domain,
        address: account.address,
        statement: nonceRes.message,
        uri: nonceRes.uri,
        version: '1',
        chainId: config.chain.id,
        nonce: nonceRes.nonce,
        expirationTime: new Date(Date.now() + 86400000).toISOString(), // 24h
    });

    const signature = await client.signMessage({
        message: message.prepareMessage()
    });

    // 3. Login
    const authRes = await fetch(`${config.authApiBase}/account/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chain_id: config.chain.id,
            account: account.address,
            message: message.prepareMessage(),
            signature: signature.replace(/^0x/, ''),
        })
    });

    if (!authRes.ok) throw new Error(`Auth failed: ${await authRes.text()}`);
    const { token } = await authRes.json();

    return { client, token, account };
}

async function getCreatorByToken(tokenAddress: string): Promise<string> {
    try {
        const res = await fetch(`${config.apiBase}/agents?token=${tokenAddress}`);
        const data = await res.json();
        if (data.agents && data.agents.length > 0) {
            return data.agents[0].creator;
        }
        const res2 = await fetch(`${config.apiBase}/agents/${tokenAddress}`);
        const data2 = await res2.json();
        if (data2 && data2.creator) return data2.creator;
    } catch (e) {
        console.warn("Could not fetch creator from API, defaulting to current account might fail if not creator.");
    }
    throw new Error(`Could not find creator for token ${tokenAddress}. Please ensure the token is registered on this chain.`);
}

function parseFlags(args: string[]): Record<string, string> {
    const flags: Record<string, string> = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg?.startsWith('--')) {
            const key = arg.substring(2);
            const value = args[i + 1];
            if (value && !value.startsWith('--')) {
                flags[key] = value;
                i++;
            } else {
                flags[key] = 'true';
            }
        }
    }
    return flags;
}

const commands = {
    launch: async (args: string[]) => {
        const flags = parseFlags(args);
        const name = flags.name;
        const symbol = flags.symbol;
        const reserveSymbol = flags['reserve-symbol'];
        const description = flags.description || `${name} token`;

        if (!name || !symbol || !reserveSymbol) {
            console.error("Usage: launch --name <name> --symbol <symbol> --reserve-symbol <reserveSymbol> [--description <desc>]");
            console.error("Supported Reserve Symbols: UB, WBNB, USD1");
            process.exit(1);
        }

        const reserveConfig = config.tokens[reserveSymbol.toUpperCase()];
        if (!reserveConfig) {
            console.error(`Error: Unsupported reserve symbol '${reserveSymbol}'. Supported: ${Object.keys(config.tokens).join(', ')}`);
            process.exit(1);
        }

        const { client, token: authToken, account } = await getAuthenticatedClient();
        const publicClient = createPublicClient({ chain: config.chain, transport: http() });

        console.log(`🚀 Launching Agent: ${name} ($${symbol}) with reserve ${reserveSymbol}...`);

        // SDK Init
        const NewToken = bitagent
            .withWalletClient(client)
            .withPublicClient(publicClient)
            .network(config.chain.id, BOND_VERSION)
            .token(symbol.toUpperCase(), account.address);

        const tokenAddress = NewToken.getTokenAddress();

        // API Deploy
        const deployPayload = {
            name,
            ticker: symbol.toUpperCase(),
            description,
            image: "https://bitagent.io/logo.png", // Default placeholder
            token: tokenAddress,
            chain_id: config.chain.id,
            version: BOND_VERSION,
            market_type: 'bonding_curve'
        };

        console.log(`Registering agent at ${config.apiBase}...`);
        const deployRes = await fetch(`${config.apiBase}/agent/deploy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${authToken}` // Uncomment if API requires Auth header
            },
            body: JSON.stringify(deployPayload)
        });

        if (!deployRes.ok) {
            console.error(`API Registration Failed: ${await deployRes.text()}`);
            return;
        }
        const agentData = await deployRes.json();
        console.log(`✅ Agent Registered. Hash: ${agentData.id}`);

        // Onchain Create
        console.log(`Submitting on-chain transaction...`);
        const txReceipt = await NewToken.create({
            name,
            agentHash: agentData.id,
            reserveToken: { address: reserveConfig.token as `0x${string}`, decimals: reserveConfig.decimals },
            curveData: {
                curveType: 'EXPONENTIAL',
                stepCount: reserveConfig.stepCount,
                maxSupply: MAX_SUPPLY_AT_CURVE,
                initialMintingPrice: reserveConfig.initialPrice,
                finalMintingPrice: reserveConfig.initialPrice * 10,
                creatorAllocation: 0,
            },
            buyRoyalty: 1,
            sellRoyalty: 1,
            onError: (e: any) => console.error(e)
        });

        if (txReceipt && txReceipt.status === 'success') {
            console.log(`🎉 Token Launched Successfully!`);
            console.log(`Contract: ${tokenAddress}`);
            console.log(`URL: ${config.webBase}/agents/${tokenAddress}`);
        } else {
            console.error("❌ On-chain creation failed.");
        }
    },

    buy: async (args: string[]) => {
        const flags = parseFlags(args);
        await trade('buy', flags.token, flags.amount);
    },

    sell: async (args: string[]) => {
        const flags = parseFlags(args);
        await trade('sell', flags.token, flags.amount);
    }
};

async function trade(side: 'buy' | 'sell', tokenAddress: string | undefined, amount: string | undefined) {
    if (!tokenAddress || !amount) {
        console.error(`Usage: ${side} --token <tokenAddress> --amount <amount>`);
        process.exit(1);
    }

    const creator = await getCreatorByToken(tokenAddress);
    const { client, account } = await getAuthenticatedClient();
    const publicClient = createPublicClient({ chain: config.chain, transport: http() });

    const Token = bitagent
        .withWalletClient(client)
        .withPublicClient(publicClient)
        .network(config.chain.id, BOND_VERSION)
        .token(tokenAddress, creator as `0x${string}`);

    console.log(`Executing ${side.toUpperCase()} ${amount} for ${tokenAddress}...`);

    // Note: slippage hardcoded for simplicity
    const tradeParams = {
        amount: parseEther(amount),
        slippage: 50, // 0.5%
        onError: (e: any) => console.error(e)
    };

    let receipt;
    if (side === 'buy') {
        receipt = await Token.buy(tradeParams);
    } else {
        receipt = await Token.sell(tradeParams);
    }

    if (receipt && receipt.status === 'success') {
        console.log(`✅ ${side.toUpperCase()} Successful!`);
        console.log(`Tx: ${receipt.transactionHash}`);
    } else {
        console.error(`❌ ${side.toUpperCase()} Failed.`);
    }
}

// Main Entrypoint
async function main() {
    const [, , command, ...args] = process.argv;

    // Network Selection
    let chainId = 97; // Default to bscTestnet
    const networkIndex = args.indexOf('--network');
    if (networkIndex !== -1 && args[networkIndex + 1]) {
        const network = args[networkIndex + 1];
        if (network === 'bsc') {
            chainId = 56;
        } else if (network === 'bscTestnet') {
            chainId = 97;
        } else {
            console.error(`Error: Unsupported network '${network}'. Use 'bsc' or 'bscTestnet'.`);
            process.exit(1);
        }
    }

    const selected = CONFIGS[chainId];
    if (!selected) {
        // Should not happen given logic above, but for safety
        console.error(`Error: Config not found for chain ID ${chainId}`);
        process.exit(1);
    }
    config = selected;

    console.log(`Using Chain: ${config.chain.name} (${config.chain.id})`);

    if (commands[command as keyof typeof commands]) {
        try {
            await commands[command as keyof typeof commands](args);
        } catch (e) {
            console.error("Error execution:", e);
        }
    } else {
        console.log("Usage:");
        console.log("  export PRIVATE_KEY=0x...");
        console.log("  ts-node cli.ts launch --network <bsc|bscTestnet> --name <name> --symbol <symbol> --reserve-symbol <UB|WBNB|USD1> [--description <desc>]");
        console.log("  ts-node cli.ts buy --network <bsc|bscTestnet> --token <tokenAddress> --amount <amount>");
        console.log("  ts-node cli.ts sell --network <bsc|bscTestnet> --token <tokenAddress> --amount <amount>");
    }
}

import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}



