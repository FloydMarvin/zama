import { FhevmRelayerSDKType, FhevmWindowType } from "./fhevmTypes";
import { SDK_CDN_URL } from "./constants";

type TraceType = (message?: unknown, ...optionalParams: unknown[]) => void;

export class RelayerSDKLoader {
  private _trace?: TraceType;

  constructor(options: { trace?: TraceType }) {
    this._trace = options.trace;
  }

  public isLoaded() {
    if (typeof window === "undefined") {
      throw new Error("RelayerSDKLoader: can only be used in the browser.");
    }
    return isFhevmWindowType(window, this._trace);
  }

  public load(): Promise<void> {
    console.log("[RelayerSDKLoader] 🚀 Starting SDK load process...");
    console.log("[RelayerSDKLoader] 🌐 CDN URL:", SDK_CDN_URL);
    
    // Ensure this only runs in the browser
    if (typeof window === "undefined") {
      console.log("[RelayerSDKLoader] ❌ window === undefined");
      return Promise.reject(
        new Error("RelayerSDKLoader: can only be used in the browser.")
      );
    }

    console.log("[RelayerSDKLoader] 🔍 Checking if SDK already exists in window...");
    if ("relayerSDK" in window) {
      console.log("[RelayerSDKLoader] 📦 Found existing relayerSDK in window");
      if (!isValidRelayerSDK(window.relayerSDK, this._trace)) {
        console.log("[RelayerSDKLoader] ❌ Existing relayerSDK is invalid");
        throw new Error("RelayerSDKLoader: Unable to load FHEVM Relayer SDK");
      }
      console.log("[RelayerSDKLoader] ✅ Existing relayerSDK is valid, using it");
      return Promise.resolve();
    }

    console.log("[RelayerSDKLoader] 📥 No existing SDK found, will load from CDN...");

    return new Promise((resolve, reject) => {
      console.log("[RelayerSDKLoader] 🔍 Checking for existing script tag...");
      const existingScript = document.querySelector(
        `script[src="${SDK_CDN_URL}"]`
      );
      if (existingScript) {
        console.log("[RelayerSDKLoader] 📜 Found existing script tag, checking window.relayerSDK...");
        if (!isFhevmWindowType(window, this._trace)) {
          console.log("[RelayerSDKLoader] ❌ Script exists but window.relayerSDK is invalid");
          reject(
            new Error(
              "RelayerSDKLoader: window object does not contain a valid relayerSDK object."
            )
          );
        }
        console.log("[RelayerSDKLoader] ✅ Script exists and window.relayerSDK is valid");
        resolve();
        return;
      }

      console.log("[RelayerSDKLoader] 📜 Creating new script element...");
      const script = document.createElement("script");
      script.src = SDK_CDN_URL;
      script.type = "text/javascript";
      script.async = true;

      script.onload = () => {
        console.log("[RelayerSDKLoader] 📥 Script loaded successfully from CDN!");
        
        // Add a small delay to allow SDK to initialize
        setTimeout(() => {
          console.log("[RelayerSDKLoader] 🔍 Checking window.relayerSDK after delay...");
          console.log("[RelayerSDKLoader] 🌐 window keys:", Object.keys(window).filter(k => k.includes('relay') || k.includes('fhevm') || k.includes('zama')));
          console.log("[RelayerSDKLoader] 📦 window.relayerSDK:", (window as any).relayerSDK);
          
          if (!isFhevmWindowType(window, this._trace)) {
            console.log("[RelayerSDKLoader] ❌ Script loaded but relayerSDK object is invalid");
            console.log("[RelayerSDKLoader] 🔍 Available window properties:", Object.keys(window).slice(0, 20));
            reject(
              new Error(
                `RelayerSDKLoader: Relayer SDK script loaded from ${SDK_CDN_URL}, but window.relayerSDK is invalid.`
              )
            );
            return;
          }
          console.log("[RelayerSDKLoader] ✅ Script loaded and relayerSDK is valid!");
          resolve();
        }, 100); // 100ms delay to allow SDK initialization
      };

      script.onerror = (error) => {
        console.log("[RelayerSDKLoader] ❌ Script failed to load from CDN");
        console.log("[RelayerSDKLoader] 🔍 Error details:", error);
        reject(
          new Error(
            `RelayerSDKLoader: Failed to load Relayer SDK from ${SDK_CDN_URL}`
          )
        );
      };

      console.log("[RelayerSDKLoader] 🚀 Adding script to DOM...");
      document.head.appendChild(script);
      console.log("[RelayerSDKLoader] 📜 Script element added to document head");
    });
  }
}

// 完整的SDK验证系统
export function isValidRelayerSDK(
  o: unknown,
  trace?: TraceType
): o is FhevmRelayerSDKType {
  if (typeof o === "undefined") {
    trace?.("RelayerSDKLoader: relayerSDK is undefined");
    return false;
  }
  if (o === null) {
    trace?.("RelayerSDKLoader: relayerSDK is null");
    return false;
  }
  if (typeof o !== "object") {
    trace?.("RelayerSDKLoader: relayerSDK is not an object");
    return false;
  }
  if (!hasProperty(o, "initSDK", "function", trace)) {
    trace?.("RelayerSDKLoader: relayerSDK.initSDK is invalid");
    return false;
  }
  if (!hasProperty(o, "createInstance", "function", trace)) {
    trace?.("RelayerSDKLoader: relayerSDK.createInstance is invalid");
    return false;
  }
  if (!hasProperty(o, "SepoliaConfig", "object", trace)) {
    trace?.("RelayerSDKLoader: relayerSDK.SepoliaConfig is invalid");
    return false;
  }
  if ("__initialized__" in o) {
    if (o.__initialized__ !== true && o.__initialized__ !== false) {
      trace?.("RelayerSDKLoader: relayerSDK.__initialized__ is invalid");
      return false;
    }
  }
  return true;
}

export function isFhevmWindowType(
  win: unknown,
  trace?: TraceType
): win is FhevmWindowType {
  if (typeof win === "undefined") {
    trace?.("RelayerSDKLoader: window object is undefined");
    return false;
  }
  if (win === null) {
    trace?.("RelayerSDKLoader: window object is null");
    return false;
  }
  if (typeof win !== "object") {
    trace?.("RelayerSDKLoader: window is not an object");
    return false;
  }
  if (!("relayerSDK" in win)) {
    trace?.("RelayerSDKLoader: window does not contain 'relayerSDK' property");
    return false;
  }
  const isValid = isValidRelayerSDK(win.relayerSDK, trace);
  if (!isValid) {
    trace?.("RelayerSDKLoader: window.relayerSDK is invalid");
  }
  return isValid;
}

// 检查必需属性和方法的工具函数
function hasProperty<
  T extends object,
  K extends PropertyKey,
  V extends string // "string", "number", etc.
>(
  obj: T,
  propertyName: K,
  propertyType: V,
  trace?: TraceType
): obj is T &
  Record<
    K,
    V extends "string"
      ? string
      : V extends "number"
      ? number
      : V extends "object"
      ? object
      : V extends "boolean"
      ? boolean
      : V extends "function"
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (...args: any[]) => any
      : unknown
  > {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  if (!(propertyName in obj)) {
    trace?.(`RelayerSDKLoader: missing ${String(propertyName)}.`);
    return false;
  }

  const value = (obj as Record<K, unknown>)[propertyName];

  if (value === null || value === undefined) {
    trace?.(`RelayerSDKLoader: ${String(propertyName)} is null or undefined.`);
    return false;
  }

  if (typeof value !== propertyType) {
    trace?.(
      `RelayerSDKLoader: ${String(propertyName)} is not a ${propertyType}.`
    );
    return false;
  }

  return true;
}