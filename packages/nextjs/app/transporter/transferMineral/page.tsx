/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AlertCircle, Check, ChevronDown, Copy, Loader2, Minus, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAccount } from "wagmi";
import { z } from "zod";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unused-vars */

// Example minerals available for transfer
const TRANSFERABLE_MINERALS = [
  {
    id: "GOLD-REFINED-0x8e07d295",
    name: "Refined Gold Bar",
    type: "Gold",
    purity: 99.99,
    quantity: "1 kg",
    location: "Refinery #5, Johannesburg",
    image: "/minerals/gold-bar.png",
  },
  {
    id: "SILVER-REFINED-0xa3f5e1d2",
    name: "Refined Silver Ingot",
    type: "Silver",
    purity: 99.95,
    quantity: "5 kg",
    location: "Smelting Facility #2, Mexico City",
    image: "/minerals/silver-ingot.png",
  },
  {
    id: "COPPER-REFINED-0xb2c4e3f1",
    name: "Copper Cathode",
    type: "Copper",
    purity: 99.99,
    quantity: "100 kg",
    location: "Processing Plant #7, Santiago",
    image: "/minerals/copper-cathode.png",
  },
  {
    id: "PLATINUM-REFINED-0xe1f2a3b4",
    name: "Platinum Bar",
    type: "Platinum",
    purity: 99.95,
    quantity: "1 kg",
    location: "Refinery #3, Moscow",
    image: "/minerals/platinum-bar.png",
  },
  {
    id: "PLATINUM-RAW-0xe1f2a3b5",
    name: "Platinum Ore",
    type: "Platinum",
    purity: 84.7,
    quantity: "75 kg",
    location: "Russia",
    image: "/minerals/platinum-ore.png",
  },
  {
    id: "TIN-RAW-0xe1f2a3b6",
    name: "Tin Ore",
    type: "Tin",
    purity: 88,
    quantity: "75 kg",
    location: "Rwanda",
    image: "/minerals/tin-ore.png",
  },
];

const LoadingSpinner = ({ size = 8, text = "Loading..." }: { size?: number; text?: string }) => (
  <div className="flex flex-col items-center justify-center gap-2">
    <Loader2 className={`w-${size} h-${size} animate-spin text-blue-500`} />
    {text && <p className="text-sm text-gray-400">{text}</p>}
  </div>
);

const FullPageLoader = ({ text = "Verifying transporter access..." }: { text?: string }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <LoadingSpinner size={12} text={text} />
  </div>
);

const ConnectWalletView = ({ isLoading }: { isLoading: boolean }) => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4 bg-gray-900">
    <div className="max-w-md w-full p-8 rounded-xl bg-gray-800 border border-gray-700 shadow-xl">
      <h2 className="text-2xl font-bold text-white text-center mb-4">Connect Your Wallet</h2>
      <p className="text-gray-400 text-center mb-6">Please connect your wallet to transfer minerals</p>
      <div className="flex justify-center">
        <ConnectButton />
      </div>
    </div>
    {isLoading && <LoadingSpinner size={8} text="Connecting wallet..." />}
  </div>
);

const transferMineralSchema = z.object({
  mineralId: z.string().min(1, "Mineral ID is required"),
  receivingParty: z.string().min(42, "Invalid address").startsWith("0x", "Address must start with 0x"),
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
});

type TransferMineralFormData = z.infer<typeof transferMineralSchema>;

export default function TransferMineralPage() {
  const { address, isConnected, isConnecting } = useAccount();
  const [isRefreshingAccess, setIsRefreshingAccess] = useState(false);
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [inputMethod, setInputMethod] = useState<"select" | "manual">("select");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMineral, setSelectedMineral] = useState<any>(null);

  // Check if user has transporter role
  const {
    data: hasTransporterRole,
    isLoading: isRoleLoading,
    refetch: refetchRoleCheck,
  } = useScaffoldReadContract({
    contractName: "RolesManager",
    functionName: "hasTransporterRole",
    args: [address],
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<TransferMineralFormData>({
    resolver: zodResolver(transferMineralSchema),
    mode: "onChange",
  });

  const { writeContractAsync } = useScaffoldWriteContract("RolesManager");

  const handleRefreshAccess = async () => {
    setIsRefreshingAccess(true);
    try {
      await refetchRoleCheck();
      notification.info("Access refreshed");
    } catch (e) {
      console.error("Error refreshing access:", e);
      notification.error("Error checking access");
    } finally {
      setIsRefreshingAccess(false);
    }
  };

  const handleSelectMineral = (mineral: any) => {
    setSelectedMineral(mineral);
    setValue("mineralId", mineral.id);
    setValue("origin", mineral.location);
  };

  const onSubmit = async (data: TransferMineralFormData) => {
    setIsTransactionPending(true);
    try {
      notification.info("Preparing transaction...");

      await writeContractAsync({
        functionName: "transferMineral",
        args: [data.mineralId, data.receivingParty as `0x${string}`, data.origin, data.destination],
      });

      notification.success("Mineral transferred successfully!");
      setSelectedMineral(null);
      setValue("mineralId", "");
      setValue("origin", "");
      setValue("destination", "");
      setValue("receivingParty", "");
    } catch (err: any) {
      console.error("Transaction error:", err);

      if (err.message.includes("User rejected the request")) {
        notification.error("Transaction rejected by user");
      } else if (err.message.includes("RolesManager__InvalidMineralIdOrNotFound")) {
        notification.error("Invalid mineral ID or not found");
      } else if (err.message.includes("RolesManager__InvalidReceivingPartyAddress")) {
        notification.error("Invalid receiving party address");
      } else if (err.message.includes("RolesManager__MineralAlreadyPurchased")) {
        notification.error("Mineral has already been purchased");
      } else if (err.message.includes("caller is missing role")) {
        notification.error("No transporter privileges");
      } else {
        notification.error("Transaction failed. See console for details.");
      }
    } finally {
      setIsTransactionPending(false);
    }
  };

  if (isConnected && isRoleLoading) {
    return <FullPageLoader text="Checking transporter permissions..." />;
  }

  if (!isConnected) {
    return <ConnectWalletView isLoading={isConnecting} />;
  }

  return (
    <div className="min-h-screen text-white p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Transfer Minerals</h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto mt-3">
            Securely transfer minerals between parties in the supply chain.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Side - Minerals List */}
          <div className="w-full lg:w-2/5">
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold text-white">Available Minerals</h2>
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 text-sm text-white transition-colors"
                  >
                    {inputMethod === "select" ? "Select Mineral" : "Enter ID Manually"}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-10 border border-gray-600">
                      <button
                        onClick={() => {
                          setInputMethod("select");
                          setIsDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          inputMethod === "select" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        Select Mineral
                      </button>
                      <button
                        onClick={() => {
                          setInputMethod("manual");
                          setIsDropdownOpen(false);
                          setSelectedMineral(null);
                          setValue("mineralId", "");
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          inputMethod === "manual" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        Enter ID Manually
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {inputMethod === "select" ? (
                <div className="space-y-4">
                  {TRANSFERABLE_MINERALS.map(mineral => (
                    <div
                      key={mineral.id}
                      onClick={() => handleSelectMineral(mineral)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedMineral?.id === mineral.id
                          ? "border-blue-500 bg-blue-900/20"
                          : "border-gray-700 hover:border-gray-600 bg-gray-800/50 hover:bg-gray-800/70"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <Image width={64} height={64} alt={mineral.name} src={mineral.image} className="rounded-md" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-lg text-white">{mineral.name}</h3>
                            <span className="text-xs text-gray-400">{mineral.quantity}</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-300">
                            {mineral.type} • {mineral.location}
                          </div>
                          <div className="mt-2">
                            <div className="text-xs mb-1 flex justify-between">
                              <span className="text-gray-300">Purity: {mineral.purity}%</span>
                              <span className="text-blue-400">
                                {selectedMineral?.id === mineral.id ? "Selected" : ""}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  mineral.purity > 90
                                    ? "bg-green-200"
                                    : mineral.purity > 95
                                      ? "bg-green-300"
                                      : "bg-blue-100"
                                }`}
                                style={{ width: `${mineral.purity}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-400 break-all">ID: {mineral.id}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Enter Mineral ID</label>
                    <input
                      {...register("mineralId")}
                      className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      placeholder="e.g. GOLD-REFINED-0x8e07d295"
                    />
                    {errors.mineralId && <p className="text-red-400 text-xs mt-1">{errors.mineralId.message}</p>}
                  </div>
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 mt-0.5 text-blue-400 flex-shrink-0" />
                      <div className="text-sm text-gray-300">
                        <p className="font-medium">Need help finding the Mineral ID?</p>
                        <p className="mt-1 opacity-80">
                          Check the mineral's details page or transaction history for its unique identifier. Refined
                          mineral IDs are typically prefixed with "REFINED-".
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Transfer Form */}
          <div className="w-full lg:w-3/5">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg"
            >
              <h2 className="text-xl font-semibold text-white mb-6">Transfer Details</h2>

              {inputMethod === "select" && selectedMineral && (
                <div className="mb-5 p-3 bg-gray-800/30 rounded-lg border border-gray-600">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">Selected Mineral:</span>
                    <span className="font-medium text-gray-300">{selectedMineral.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedMineral.id);
                        notification.success("Mineral ID copied to clipboard");
                      }}
                      className="ml-auto text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-400 break-all">ID: {selectedMineral.id}</div>
                </div>
              )}

              <div className="space-y-5">
                {/* Receiving Party */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Receiving Party Address *</label>
                  <div className="relative">
                    <input
                      {...register("receivingParty")}
                      className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all pr-10"
                      placeholder="0x..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (watch("receivingParty")) {
                          navigator.clipboard.writeText(watch("receivingParty"));
                          notification.success("Address copied to clipboard");
                        }
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  {errors.receivingParty && (
                    <p className="text-red-400 text-xs mt-1">{errors.receivingParty.message}</p>
                  )}
                </div>

                {/* Origin */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Origin *</label>
                  <input
                    {...register("origin")}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Current location of the mineral"
                  />
                  {errors.origin && <p className="text-red-400 text-xs mt-1">{errors.origin.message}</p>}
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Destination *</label>
                  <input
                    {...register("destination")}
                    className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Where the mineral is being sent"
                  />
                  {errors.destination && <p className="text-red-400 text-xs mt-1">{errors.destination.message}</p>}
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-gray-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMineral(null);
                    setValue("mineralId", "");
                    setValue("origin", "");
                    setValue("destination", "");
                    setValue("receivingParty", "");
                  }}
                  disabled={isTransactionPending}
                  className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isTransactionPending || !isValid}
                  className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-32"
                >
                  {isTransactionPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Transfer Mineral"
                  )}
                </button>
              </div>
            </form>

            {/* Validation Summary */}
            <div className="mt-6 bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
              <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-4">Transfer Requirements</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      watch("mineralId") && !errors.mineralId
                        ? "bg-green-900/50 text-green-400"
                        : "bg-gray-800/50 text-gray-500"
                    }`}
                  >
                    {watch("mineralId") && !errors.mineralId ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      {inputMethod === "select" ? "Mineral selected" : "Valid Mineral ID"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Choose from list or enter manually</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      watch("receivingParty") && !errors.receivingParty
                        ? "bg-green-900/50 text-green-400"
                        : "bg-gray-800/50 text-gray-500"
                    }`}
                  >
                    {watch("receivingParty") && !errors.receivingParty ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">Valid receiving address</p>
                    <p className="text-xs text-gray-400 mt-0.5">Must be a valid Ethereum address</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      watch("origin") && !errors.origin
                        ? "bg-green-900/50 text-green-400"
                        : "bg-gray-800/50 text-gray-500"
                    }`}
                  >
                    {watch("origin") && !errors.origin ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">Origin provided</p>
                    <p className="text-xs text-gray-400 mt-0.5">Current location of the mineral</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      watch("destination") && !errors.destination
                        ? "bg-green-900/50 text-green-400"
                        : "bg-gray-800/50 text-gray-500"
                    }`}
                  >
                    {watch("destination") && !errors.destination ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">Destination provided</p>
                    <p className="text-xs text-gray-400 mt-0.5">Where the mineral is being sent</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transfer Guidelines */}
            <div className="mt-6 bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
              <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-4">Transfer Guidelines</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Verify all details before submission</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Ensure receiving party is expecting the transfer</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Double-check mineral ID and destination</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Transfers cannot be reversed once completed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
