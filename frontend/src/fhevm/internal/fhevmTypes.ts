export interface FhevmRelayerSDKType {
  initSDK: (options?: FhevmInitSDKOptions) => Promise<boolean>;
  createInstance: (config: any) => Promise<any>;
  SepoliaConfig: {
    aclContractAddress: `0x${string}`;
    [key: string]: any;
  };
  __initialized__?: boolean;
}

export interface FhevmWindowType extends Window {
  relayerSDK: FhevmRelayerSDKType;
}

export interface FhevmInitSDKOptions {
  [key: string]: any;
}

export type FhevmLoadSDKType = () => Promise<void>;
export type FhevmInitSDKType = (options?: FhevmInitSDKOptions) => Promise<boolean>;