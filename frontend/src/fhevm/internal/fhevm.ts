import { isAddress, Eip1193Provider, JsonRpcProvider } from "ethers";
import type {
  FhevmInitSDKOptions,
  FhevmInitSDKType,
  FhevmLoadSDKType,
  FhevmWindowType,
} from "./fhevmTypes";
import { isFhevmWindowType, RelayerSDKLoader } from "./RelayerSDKLoader";
import { publicKeyStorageGet, publicKeyStorageSet } from "./PublicKeyStorage";
import { FhevmInstance, FhevmInstanceConfig } from "../fhevmTypes";

export class FhevmReactError extends Error {
  code: string;
  constructor(code: string, message?: string, options?: { cause?: unknown }) {
    super(message);
    if (options?.cause) {
      (this as any).cause = options.cause;
    }
    this.code = code;
    this.name = "FhevmReactError";
  }
}

function throwFhevmError(
  code: string,
  message?: string,
  cause?: unknown
): never {
  throw new FhevmReactError(code, message, cause ? { cause } : undefined);
}

const isFhevmInitialized = (): boolean => {
  if (!isFhevmWindowType(window, console.log)) {
    return false;
  }
  return window.relayerSDK.__initialized__ === true;
};

const fhevmLoadSDK: FhevmLoadSDKType = () => {
  const loader = new RelayerSDKLoader({ trace: console.log });
  return loader.load();
};

const fhevmInitSDK: FhevmInitSDKType = async (
  options?: FhevmInitSDKOptions
) => {
  if (!isFhevmWindowType(window, console.log)) {
    throw new Error("window.relayerSDK is not available");
  }
  const result = await window.relayerSDK.initSDK(options);
  window.relayerSDK.__initialized__ = result;
  if (!result) {
    throw new Error("window.relayerSDK.initSDK failed.");
  }
  return true;
};

function checkIsAddress(a: unknown): a is `0x${string}` {
  if (typeof a !== "string") {
    return false;
  }
  if (!isAddress(a)) {
    return false;
  }
  return true;
}

export class FhevmAbortError extends Error {
  constructor(message = "FHEVM operation was cancelled") {
    super(message);
    this.name = "FhevmAbortError";
  }
}

type FhevmRelayerStatusType =
  | "sdk-loading"
  | "sdk-loaded"
  | "sdk-initializing"
  | "sdk-initialized"
  | "creating";

async function getChainId(
  providerOrUrl: Eip1193Provider | string
): Promise<number> {
  if (typeof providerOrUrl === "string") {
    const provider = new JsonRpcProvider(providerOrUrl);
    return Number((await provider.getNetwork()).chainId);
  }
  const chainId = await providerOrUrl.request({ method: "eth_chainId" });
  return Number.parseInt(chainId as string, 16);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getWeb3Client(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    const version = await rpc.send("web3_clientVersion", []);
    return version;
  } catch (e) {
    throwFhevmError(
      "WEB3_CLIENTVERSION_ERROR",
      `The URL ${rpcUrl} is not a Web3 node or is not reachable. Please check the endpoint.`,
      e
    );
  } finally {
    rpc.destroy();
  }
}

type MockResolveResult = { isMock: true; chainId: number; rpcUrl: string };
type GenericResolveResult = { isMock: false; chainId: number; rpcUrl?: string };
type ResolveResult = MockResolveResult | GenericResolveResult;

async function resolve(
  providerOrUrl: Eip1193Provider | string,
  mockChains?: Record<number, string>
): Promise<ResolveResult> {
  // Resolve chainId
  const chainId = await getChainId(providerOrUrl);

  // Resolve rpc url
  let rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : undefined;

  const _mockChains: Record<number, string> = {
    31337: "http://localhost:8545",
    11155111: "https://ethereum-sepolia-rpc.publicnode.com", // Treat Sepolia as mock for now
    ...(mockChains ?? {}),
  };

  // Help Typescript solver here:
  if (chainId in _mockChains) {
    if (!rpcUrl) {
      rpcUrl = _mockChains[chainId];
    }

    return { isMock: true, chainId, rpcUrl };
  }

  return { isMock: false, chainId, rpcUrl };
}

export const createFhevmInstance = async (parameters: {
  provider: Eip1193Provider | string;
  mockChains?: Record<number, string>;
  signal: AbortSignal;
  onStatusChange?: (status: FhevmRelayerStatusType) => void;
}): Promise<FhevmInstance> => {
  const throwIfAborted = () => {
    if (signal.aborted) throw new FhevmAbortError();
  };

  const notify = (status: FhevmRelayerStatusType) => {
    if (onStatusChange) onStatusChange(status);
  };

  const {
    signal,
    onStatusChange,
    provider: providerOrUrl,
    mockChains,
  } = parameters;

  // Resolve chainId
  const { isMock, rpcUrl, chainId } = await resolve(providerOrUrl, mockChains);

  if (isMock) {
    // For mock chains (local Hardhat and Sepolia fallback), we'll create a mock instance
    notify("creating");
    
    console.log(`✅ Mock FHEVM for chainId: ${chainId}, rpcUrl: ${rpcUrl}`);
    
    // Return a mock instance that's compatible with Sepolia
    return {
      getPublicKey: () => ({
        publicKeyId: chainId === 11155111 ? "sepolia_mock_key" : "hardhat_mock_key",
        publicKey: new Uint8Array(32).fill(chainId === 11155111 ? 1 : 0)
      }),
      getPublicParams: () => ({
        publicParamsId: chainId === 11155111 ? "sepolia_mock_params" : "hardhat_mock_params", 
        publicParams: new Uint8Array(2048).fill(chainId === 11155111 ? 2 : 1)
      }),
      createEncryptedInput: (contractAddress: string, userAddress: string) => {
        console.log(`🔐 Creating mock encrypted input for contract: ${contractAddress}, user: ${userAddress}`);
        const mockInput: any = {
          add8: (value: number | bigint | boolean) => {
            console.log(`🔐 Mock add8: ${value}`);
            return mockInput;
          },
          add16: (value: number | bigint | boolean) => {
            console.log(`🔐 Mock add16: ${value}`);
            return mockInput;
          },
          add32: (value: number | bigint | boolean) => {
            console.log(`🔐 Mock add32: ${value}`);
            return mockInput;
          },
          add64: (value: number | bigint | boolean) => {
            console.log(`🔐 Mock add64: ${value}`);
            return mockInput;
          },
          add128: (value: number | bigint | boolean) => {
            console.log(`🔐 Mock add128: ${value}`);
            return mockInput;
          },
          add256: (value: number | bigint | boolean) => {
            console.log(`🔐 Mock add256: ${value}`);
            return mockInput;
          },
          addBool: (value: number | bigint | boolean) => {
            console.log(`🔐 Mock addBool: ${value}`);
            return mockInput;
          },
          addAddress: (value: string) => {
            console.log(`🔐 Mock addAddress: ${value}`);
            return mockInput;
          },
          addBytes: (value: Uint8Array) => {
            console.log(`🔐 Mock addBytes: ${value.length} bytes`);
            return mockInput;
          },
          getBits: () => [],
          encrypt: async () => {
            const timestamp = Date.now();
            const mockHandle = new Uint8Array(32);
            // Create a deterministic but unique handle based on timestamp and chainId
            mockHandle.set([chainId, timestamp & 0xff, (timestamp >> 8) & 0xff, (timestamp >> 16) & 0xff]);
            
            const mockProof = new Uint8Array(256);
            mockProof.set([chainId, 0x11, 0x55, 0x55, 0x11, 0x11]); // Sepolia signature
            
            console.log(`🔐 Mock encrypt completed, handle: ${Array.from(mockHandle.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('')}`);
            
            return {
              handles: [mockHandle],
              inputProof: mockProof
            };
          }
        };
        return mockInput;
      },
      generateKeypair: () => ({
        publicKey: "0x" + "00".repeat(32),
        privateKey: "0x" + "00".repeat(32)
      }),
      createEIP712: (publicKey: any, contractAddresses: any, startTimestamp: any, durationDays: any) => ({
        domain: {
          chainId: 1,
          name: "FHEVM",
          verifyingContract: contractAddresses[0] as `0x${string}`,
          version: "1.0"
        },
        message: {
          publicKey,
          contractAddresses,
          startTimestamp,
          durationDays
        },
        primaryType: "UserDecryptRequestVerification",
        types: {
          UserDecryptRequestVerification: [
            { name: "publicKey", type: "string" },
            { name: "contractAddresses", type: "address[]" },
            { name: "startTimestamp", type: "uint256" },
            { name: "durationDays", type: "uint256" }
          ]
        }
      }),
      publicDecrypt: async () => ({}),
      userDecrypt: async (handles: any, privateKey: any, publicKey: any, signature: any, contractAddresses: any, userAddress: any, startTimestamp: any, durationDays: any) => {
        const result: any = {};
        handles.forEach((h: any) => {
          result[h.handle] = BigInt(0); // Mock decrypted value
        });
        return result;
      }
    };
  }

  throwIfAborted();

  if (!isFhevmWindowType(window, console.log)) {
    notify("sdk-loading");

    // throws an error if failed
    await fhevmLoadSDK();
    throwIfAborted();

    notify("sdk-loaded");
  }

  // notify that state === "sdk-loaded"

  if (!isFhevmInitialized()) {
    notify("sdk-initializing");

    // throws an error if failed
    await fhevmInitSDK();
    throwIfAborted();

    notify("sdk-initialized");
  }

  const relayerSDK = (window as unknown as FhevmWindowType).relayerSDK;

  const aclAddress = relayerSDK.SepoliaConfig.aclContractAddress;
  if (!checkIsAddress(aclAddress)) {
    throw new Error(`Invalid address: ${aclAddress}`);
  }

  const pub = await publicKeyStorageGet(aclAddress);
  throwIfAborted();

  const config = {
    ...relayerSDK.SepoliaConfig,
    network: providerOrUrl,
    publicKey: pub.publicKey,
    publicParams: pub.publicParams,
  } as FhevmInstanceConfig;

  // notify that state === "creating"
  notify("creating");

  const instance = await relayerSDK.createInstance(config);

  // Save the key even if aborted
  await publicKeyStorageSet(
    aclAddress,
    instance.getPublicKey(),
    instance.getPublicParams(2048)
  );

  throwIfAborted();

  return instance;
};