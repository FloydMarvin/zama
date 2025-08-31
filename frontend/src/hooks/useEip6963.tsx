import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: ethers.Eip1193Provider;
}

interface EIP6963AnnounceProviderEvent extends Event {
  detail: {
    info: EIP6963ProviderInfo;
    provider: ethers.Eip1193Provider;
  };
}

interface UseEip6963State {
  providers: EIP6963ProviderDetail[];
  error?: Error;
}

export function useEip6963(): UseEip6963State {
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [error, setError] = useState<Error | undefined>(undefined);
  const fallbackAddedRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      const handleAnnouncement = (
        event: Event
      ): void => {
        const eipEvent = event as EIP6963AnnounceProviderEvent;
        if (eipEvent.detail) {
          setProviders((currentProviders) => {
            // Check if provider already exists to avoid duplicates
            const exists = currentProviders.some(p => p.info.uuid === eipEvent.detail.info.uuid);
            if (exists) {
              return currentProviders;
            }
            return [...currentProviders, eipEvent.detail];
          });
        }
      };

      // Listen for EIP-6963 events
      window.addEventListener(
        "eip6963:announceProvider",
        handleAnnouncement
      );

      // Request existing providers
      window.dispatchEvent(new Event("eip6963:requestProvider"));

      // Fallback for legacy window.ethereum
      const fallbackTimeout = setTimeout(() => {
        if (!fallbackAddedRef.current && window.ethereum) {
          setProviders((currentProviders) => {
            // Only add fallback if no EIP-6963 providers were found
            if (currentProviders.length === 0) {
              fallbackAddedRef.current = true;
              const fallbackProvider: EIP6963ProviderDetail = {
                info: {
                  uuid: "legacy",
                  name: "MetaMask",
                  icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzMCAzMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjUuNzUgOC4yNUwxNy4yNSAxNS41IDEyIDguMjUgMi4yNSA4LjI1IDcuNSAxNS41IDIuMjUgMjIuNSAxMiAyMi41IDEyIDguMjUgMjUuNzUgOC4yNXoiIGZpbGw9IiNGRjYwMDAiLz48L3N2Zz4=",
                  rdns: "io.metamask",
                },
                provider: window.ethereum,
              };
              return [fallbackProvider];
            }
            return currentProviders;
          });
        }
      }, 1000);

      return () => {
        window.removeEventListener(
          "eip6963:announceProvider",
          handleAnnouncement
        );
        clearTimeout(fallbackTimeout);
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    }
  }, []); // Empty dependency array to prevent infinite loop

  return { providers, error };
}