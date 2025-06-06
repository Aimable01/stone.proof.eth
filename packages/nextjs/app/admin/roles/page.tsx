/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable prettier/prettier */
"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronRight, Copy, Loader2, Mail, MessageSquare, Phone, ShieldAlert } from "lucide-react";
import { isAddress, toBytes } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import Icon from "~~/components/dashboard/Icon";
import RoleCard from "~~/components/dashboard/admin/RoleCard";
import RoleCheck from "~~/components/dashboard/admin/RoleCheck";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable prettier/prettier */

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable prettier/prettier */

// BNS (Base Name Service) contract address and ABI
const BNS_REGISTRY_ADDRESS = "0x3f8Fb8141e0F989F70f8a4c8B0cE3b8D81a0Ea21";
const BNS_REGISTRY_ABI = [
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
    ],
    name: "getAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const LoadingSpinner = ({
  size = 8,
  text = "Loading roles management Dashboard...",
}: {
  size?: number;
  text?: string;
}) => (
  <div className="flex flex-col items-center justify-center gap-2">
    <Loader2 className={`w-${size} h-${size} animate-spin`} />
    {text && <p className="text-sm text-muted-foreground">{text}</p>}
  </div>
);

const FullPageLoader = ({ text = "Verifying admin access permissions..." }: { text?: string }) => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size={12} text={text} />
  </div>
);

const AccessDeniedCard = ({
  address,
  isLoadingRefresh,
  onRefresh,
}: {
  address: string;
  isLoadingRefresh: boolean;
  onRefresh: () => void;
}) => {
  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    notification.success("Wallet address copied!");
  };

  return (
    <div className="max-w-md p-6 border rounded-lg shadow-lg bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h3 className="text-2xl font-bold">Access Denied</h3>
        <p className="text-muted-foreground">The connected wallet doesn't have admin privileges for this dashboard.</p>
        <div className="flex items-center gap-2 p-2 px-4 mt-2 border rounded-lg">
          <span className="font-mono text-sm">{address}</span>
          <button onClick={copyAddress} className="p-1 rounded-md hover:bg-accent">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoadingRefresh}
          className="flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLoadingRefresh && <Loader2 className="w-4 h-4 animate-spin" />}
          Refresh Access
        </button>
      </div>
    </div>
  );
};

const ConnectWalletView = ({ isLoading }: { isLoading: boolean }) => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
    <div className="max-w-md p-8 text-center border rounded-lg shadow-lg bg-background">
      <h2 className="mb-4 text-2xl font-bold">Connect Your Wallet</h2>
      <p className="mb-6 text-muted-foreground">
        Please connect your admin wallet to access the roles management dashboard
      </p>
      <ConnectButton />
    </div>
    {isLoading && <LoadingSpinner size={8} text="Connecting wallet..." />}
  </div>
);

const ROLE_TYPES = {
  MINER: "Miner",
  REFINER: "Refiner",
  TRANSPORTER: "Transporter",
  AUDITOR: "Auditor",
  INSPECTOR: "Inspector",
  BUYER: "Buyer",
} as const;

type RoleType = keyof typeof ROLE_TYPES;

const getSilentRoleBytes = (roleName: string): Uint8Array => {
  try {
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(roleName);

    for (let i = 0; i < Math.min(encoded.length, 32); i++) {
      view.setUint8(i, encoded[i]);
    }

    return new Uint8Array(buffer);
  } catch (error) {
    console.warn("Silent role bytes conversion failed:", error);
    return new Uint8Array(32);
  }
};

const ROLE_TO_BYTES32 = {
  MINER: getSilentRoleBytes("MINER_ROLE"),
  REFINER: getSilentRoleBytes("REFINER_ROLE"),
  TRANSPORTER: getSilentRoleBytes("TRANSPORTER_ROLE"),
  AUDITOR: getSilentRoleBytes("AUDITOR_ROLE"),
  INSPECTOR: getSilentRoleBytes("INSPECTOR_ROLE"),
  BUYER: getSilentRoleBytes("BUYER_ROLE"),
} as const;

const ROLE_TO_FUNCTION_MAP = {
  MINER: { assign: "assignMiner", revoke: "revokeMiner" },
  REFINER: { assign: "assignRefiner", revoke: "revokeRefiner" },
  TRANSPORTER: { assign: "assignTransporter", revoke: "revokeTransporter" },
  AUDITOR: { assign: "assignAuditor", revoke: "revokeAuditor" },
  INSPECTOR: { assign: "assignInspector", revoke: "revokeInspector" },
  BUYER: { assign: "assignBuyer", revoke: "revokeBuyer" },
} as const;

// Utility function to check if input is a Base name
const isBaseName = (input: string): boolean => {
  return input.endsWith(".base") && input.length > 5 && !input.includes(" ");
};

const Page = () => {
  const { address, isConnected, isConnecting } = useAccount();
  const publicClient = usePublicClient();
  const [roleAddresses, setRoleAddresses] = useState({
    MINER: "",
    REFINER: "",
    TRANSPORTER: "",
    AUDITOR: "",
    INSPECTOR: "",
    BUYER: "",
  });

  const [checkAddress, setCheckAddress] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [activeRole, setActiveRole] = useState<RoleType | null>(null);
  const [isRefreshingAccess, setIsRefreshingAccess] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isAssignLoading, setIsAssignLoading] = useState(false);
  const [isRevokeLoading, setIsRevokeLoading] = useState(false);
  const [isResolvingName, setIsResolvingName] = useState(false);

  const {
    data: isAdmin,
    isLoading: isLoadingRoleCheck,
    refetch: refetchRoleCheck,
  } = useScaffoldReadContract({
    contractName: "RolesManager",
    functionName: "hasAdminRole",
    args: [address],
    enabled: isConnected && !!address,
  });

  const { data: userRoles = [], refetch: refetchRoles } = useScaffoldReadContract({
    contractName: "RolesManager",
    functionName: "getRolesForAddress",
    args: [checkAddress],
    enabled: isAddress(checkAddress),
  });

  const [roleStats, setRoleStats] = useState({
    MINER: 0,
    REFINER: 0,
    TRANSPORTER: 0,
    AUDITOR: 0,
    INSPECTOR: 0,
    BUYER: 0,
  });

  const { writeContractAsync } = useScaffoldWriteContract("RolesManager");

  // Function to resolve Base name to address
  const resolveBaseName = async (name: string): Promise<string> => {
    try {
      const result = await publicClient.readContract({
        address: BNS_REGISTRY_ADDRESS,
        abi: BNS_REGISTRY_ABI,
        functionName: "getAddress",
        args: [name],
      });

      if (!result || result === "0x0000000000000000000000000000000000000000") {
        throw new Error("Base name not found or not registered");
      }

      return result;
    } catch (error) {
      console.error("Error resolving Base name:", error);
      throw new Error("Failed to resolve Base name");
    }
  };

  const fetchRoleCounts = async () => {
    try {
      const counts = await Promise.all(
        Object.entries(ROLE_TO_BYTES32).map(async ([role, roleBytes]) => {
          try {
            const count = await writeContractAsync({
              functionName: "getRoleMemberCount",
              args: [roleBytes],
            });
            return Number(count) || 0;
          } catch (error) {
            console.warn(`Error fetching count for ${role}:`, error);
            return roleStats[role as RoleType];
          }
        }),
      );

      setRoleStats({
        MINER: counts[0],
        REFINER: counts[1],
        TRANSPORTER: counts[2],
        AUDITOR: counts[3],
        INSPECTOR: counts[4],
        BUYER: counts[5],
      });
    } catch (error) {
      console.warn("Error fetching role counts:", error);
    }
  };

  const handleRefreshAccess = async () => {
    setIsRefreshingAccess(true);
    try {
      await refetchRoleCheck();
      await fetchRoleCounts();
    } catch (e) {
      console.warn("Error refreshing access:", e);
    } finally {
      setIsRefreshingAccess(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      const timer = setTimeout(() => {
        setIsDataLoading(false);
        fetchRoleCounts();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAdmin]);

  const handleRoleAddressChange = (role: RoleType, address: string) => {
    setRoleAddresses(prev => ({
      ...prev,
      [role]: address,
    }));
  };

  const handleAssign = async (role: RoleType) => {
    const trimmedInput = roleAddresses[role].trim();

    if (!trimmedInput) {
      notification.error("Please enter a valid Ethereum address or Base name");
      return;
    }

    try {
      setIsAssignLoading(true);
      setActiveRole(role);

      let resolvedAddress = trimmedInput;

      if (isBaseName(trimmedInput)) {
        setIsResolvingName(true);
        try {
          resolvedAddress = await resolveBaseName(trimmedInput);
          if (!isAddress(resolvedAddress)) {
            notification.error("Failed to resolve Base name to an address");
            return;
          }
        } catch (error) {
          notification.error("Error resolving Base name");
          console.error("Base name resolution error:", error);
          return;
        } finally {
          setIsResolvingName(false);
        }
      } else if (!isAddress(trimmedInput)) {
        notification.error("Please enter a valid Ethereum address or Base name");
        return;
      }

      setRoleStats(prev => ({
        ...prev,
        [role]: prev[role] + 1,
      }));

      await writeContractAsync({
        functionName: ROLE_TO_FUNCTION_MAP[role].assign,
        args: [resolvedAddress],
      });

      notification.success(`${ROLE_TYPES[role]} role assigned successfully to ${trimmedInput}`);
      setRoleAddresses(prev => ({ ...prev, [role]: "" }));

      await fetchRoleCounts();
    } catch (error: any) {
      setRoleStats(prev => ({
        ...prev,
        [role]: Math.max(0, prev[role] - 1),
      }));
      console.warn("Assignment error:", error);
      notification.error(error.shortMessage || error.message || "Failed to assign role");
    } finally {
      setIsAssignLoading(false);
      setActiveRole(null);
    }
  };

  const handleRevoke = async (role: RoleType) => {
    const trimmedInput = roleAddresses[role].trim();
    const trimmedReason = revokeReason.trim();

    if (!trimmedInput) {
      notification.error("Please enter a valid Ethereum address or Base name");
      return;
    }

    if (!trimmedReason) {
      notification.error("Please provide a revocation reason");
      return;
    }

    try {
      setIsRevokeLoading(true);
      setActiveRole(role);

      let resolvedAddress = trimmedInput;

      if (isBaseName(trimmedInput)) {
        setIsResolvingName(true);
        try {
          resolvedAddress = await resolveBaseName(trimmedInput);
          if (!isAddress(resolvedAddress)) {
            notification.error("Failed to resolve Base name to an address");
            return;
          }
        } catch (error) {
          notification.error("Error resolving Base name");
          console.error("Base name resolution error:", error);
          return;
        } finally {
          setIsResolvingName(false);
        }
      } else if (!isAddress(trimmedInput)) {
        notification.error("Please enter a valid Ethereum address or Base name");
        return;
      }

      setRoleStats(prev => ({
        ...prev,
        [role]: Math.max(0, prev[role] - 1),
      }));

      await writeContractAsync({
        functionName: ROLE_TO_FUNCTION_MAP[role].revoke,
        args: [resolvedAddress, trimmedReason],
      });

      notification.success(`${ROLE_TYPES[role]} role revoked successfully from ${trimmedInput}`);
      setRoleAddresses(prev => ({ ...prev, [role]: "" }));
      setRevokeReason("");

      await fetchRoleCounts();
    } catch (error: any) {
      setRoleStats(prev => ({
        ...prev,
        [role]: prev[role] + 1,
      }));
      console.warn("Revocation error:", error);
      notification.error(error.shortMessage || error.message || "Failed to revoke role");
    } finally {
      setIsRevokeLoading(false);
      setActiveRole(null);
    }
  };

  const handleCheckRole = async () => {
    const trimmedInput = checkAddress.trim();

    if (!trimmedInput) {
      notification.error("Please enter a valid Ethereum address or Base name");
      return;
    }

    let resolvedAddress = trimmedInput;

    if (isBaseName(trimmedInput)) {
      setIsResolvingName(true);
      try {
        resolvedAddress = await resolveBaseName(trimmedInput);
        if (!isAddress(resolvedAddress)) {
          notification.error("Failed to resolve Base name to an address");
          return;
        }
        setCheckAddress(resolvedAddress);
      } catch (error) {
        notification.error("Error resolving Base name");
        console.error("Base name resolution error:", error);
        return;
      } finally {
        setIsResolvingName(false);
      }
    } else if (!isAddress(trimmedInput)) {
      notification.error("Please enter a valid Ethereum address or Base name");
      return;
    }

    await refetchRoles();
  };

  if (isConnected && isLoadingRoleCheck) {
    return <FullPageLoader text="Checking admin permissions..." />;
  }

  if (!isConnected) {
    return <ConnectWalletView isLoading={isConnecting} />;
  }

  if (isConnected && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <AccessDeniedCard
          address={address || ""}
          isLoadingRefresh={isRefreshingAccess}
          onRefresh={handleRefreshAccess}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 md:px-10 flex flex-col gap-6 md:gap-10">
      {isDataLoading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner size={12} text="Loading roles dashboard..." />
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
            <div className="flex flex-col">
              <p className="text-[24px] md:text-[28px] font-bold m-0 leading-tight">Manage Users in The System</p>
              <p className="text-[14px] md:text-[16px] text-[#979AA0] m-0 leading-tight">All the users at fingertips</p>
            </div>

            <div className="flex flex-wrap gap-2 md:gap-3">
              <button className="bg-[#252525] border border-[#323539] flex items-center justify-center gap-2 font-semibold px-4 py-1.5 pb-2.5 rounded-[8px]">
                View Revoked Users
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-[20px] md:text-[24px] font-bold mb-4">Mineral Supply Chain Roles</h2>
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RoleCard
                role={ROLE_TYPES.MINER}
                iconPath="/miners.svg"
                activeCount={roleStats.MINER}
                subtitle="Mining Operations"
                userId={roleAddresses.MINER}
                onAssign={() => handleAssign("MINER")}
                onRevoke={() => handleRevoke("MINER")}
                disabled={!isConnected || !isAdmin}
                isAssignLoading={(isAssignLoading && activeRole === "MINER") || isResolvingName}
                isRevokeLoading={(isRevokeLoading && activeRole === "MINER") || isResolvingName}
                onUserIdChange={address => handleRoleAddressChange("MINER", address)}
                onReasonChange={setRevokeReason}
                placeholder="Wallet address or name.base.eth"
              />

              <RoleCard
                role={ROLE_TYPES.REFINER}
                iconPath="/refiner.svg"
                activeCount={roleStats.REFINER}
                subtitle="Refining Operations"
                userId={roleAddresses.REFINER}
                onAssign={() => handleAssign("REFINER")}
                onRevoke={() => handleRevoke("REFINER")}
                disabled={!isConnected || !isAdmin}
                isAssignLoading={(isAssignLoading && activeRole === "REFINER") || isResolvingName}
                isRevokeLoading={(isRevokeLoading && activeRole === "REFINER") || isResolvingName}
                onUserIdChange={address => handleRoleAddressChange("REFINER", address)}
                onReasonChange={setRevokeReason}
                placeholder="Wallet address or name.base.eth"
              />

              <RoleCard
                role={ROLE_TYPES.TRANSPORTER}
                iconPath="/dashboard/icon_set/mineTruckWhite.svg"
                activeCount={roleStats.TRANSPORTER}
                subtitle="Transportation"
                userId={roleAddresses.TRANSPORTER}
                onAssign={() => handleAssign("TRANSPORTER")}
                onRevoke={() => handleRevoke("TRANSPORTER")}
                disabled={!isConnected || !isAdmin}
                isAssignLoading={(isAssignLoading && activeRole === "TRANSPORTER") || isResolvingName}
                isRevokeLoading={(isRevokeLoading && activeRole === "TRANSPORTER") || isResolvingName}
                onUserIdChange={address => handleRoleAddressChange("TRANSPORTER", address)}
                onReasonChange={setRevokeReason}
                placeholder="Wallet address or name.base.eth"
              />

              <RoleCheck
                userId={checkAddress}
                onCheckRole={handleCheckRole}
                foundRole={userRoles.join(", ") || "No roles found"}
                hasRole={userRoles.length > 0}
                onUserIdChange={setCheckAddress}
                isLoading={isResolvingName}
                placeholder="Wallet address or name.base.eth"
              />
            </div>
          </div>

          <div>
            <h2 className="text-[20px] md:text-[24px] font-bold mb-4">Supply Chain Validators</h2>
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RoleCard
                role={ROLE_TYPES.AUDITOR}
                iconPath="/auditor.svg"
                activeCount={roleStats.AUDITOR}
                subtitle="Chain Compliance"
                userId={roleAddresses.AUDITOR}
                onAssign={() => handleAssign("AUDITOR")}
                onRevoke={() => handleRevoke("AUDITOR")}
                disabled={!isConnected || !isAdmin}
                isAssignLoading={(isAssignLoading && activeRole === "AUDITOR") || isResolvingName}
                isRevokeLoading={(isRevokeLoading && activeRole === "AUDITOR") || isResolvingName}
                onUserIdChange={address => handleRoleAddressChange("AUDITOR", address)}
                onReasonChange={setRevokeReason}
                placeholder="Wallet address or name.base.eth"
              />

              <RoleCard
                role={ROLE_TYPES.INSPECTOR}
                iconPath="/inspector.svg"
                activeCount={roleStats.INSPECTOR}
                subtitle="Quality Assurance"
                userId={roleAddresses.INSPECTOR}
                onAssign={() => handleAssign("INSPECTOR")}
                onRevoke={() => handleRevoke("INSPECTOR")}
                disabled={!isConnected || !isAdmin}
                isAssignLoading={(isAssignLoading && activeRole === "INSPECTOR") || isResolvingName}
                isRevokeLoading={(isRevokeLoading && activeRole === "INSPECTOR") || isResolvingName}
                onUserIdChange={address => handleRoleAddressChange("INSPECTOR", address)}
                onReasonChange={setRevokeReason}
                placeholder="Wallet address or name.base"
              />

              <RoleCard
                role={ROLE_TYPES.BUYER}
                iconPath="/buyer.svg"
                activeCount={roleStats.BUYER}
                subtitle="Purchasing"
                userId={roleAddresses.BUYER}
                onAssign={() => handleAssign("BUYER")}
                onRevoke={() => handleRevoke("BUYER")}
                disabled={!isConnected || !isAdmin}
                isAssignLoading={(isAssignLoading && activeRole === "BUYER") || isResolvingName}
                isRevokeLoading={(isRevokeLoading && activeRole === "BUYER") || isResolvingName}
                onUserIdChange={address => handleRoleAddressChange("BUYER", address)}
                onReasonChange={setRevokeReason}
                placeholder="Wallet address or name.base.eth"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Page;
