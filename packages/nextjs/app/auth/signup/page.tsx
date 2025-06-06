"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import StoneProof from "../../../components/landing/Header/StoneProof";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { FiArrowLeft, FiArrowRight, FiChevronDown, FiDownload, FiEye, FiEyeOff, FiInfo } from "react-icons/fi";
import { useAccount, useChainId } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const mineralsList = ["Coltan", "Cobalt", "Gold", "Copper", "Tin", "Tungsten"];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    companyRole: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    companyName: "",
    phoneNumber: "",
    mineralsMined: ["Coltan", "Cobalt"],
    location: "",
    employees: "",
    licenseFile: null as File | null,
  });
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);

  const { address: connectedAddress, isConnected, chainId } = useAccount();
  const currentChainId = useChainId();

  const roleRedirects = {
    admin: "/admin",
    miner: "/miner",
    refiner: "/refiner",
    transporter: "/transporter",
    inspector: "/inspector",
    auditor: "/auditor",
    buyer: "/buyer",
  };

  const checkUserRole = async (address: string) => {
    try {
      // Check admin role first
      const { data: isAdmin } = useScaffoldReadContract({
        contractName: "RolesManager",
        functionName: "hasAdminRole",
        args: [address],
      });

      if (isAdmin) {
        router.push(roleRedirects.admin);
        return;
      }

      // Check miner role
      const { data: isMiner } = useScaffoldReadContract({
        contractName: "RolesManager",
        functionName: "hasMinerRole",
        args: [address],
      });

      if (isMiner) {
        router.push(roleRedirects.miner);
        return;
      }

      // Check refiner role
      const { data: isRefiner } = useScaffoldReadContract({
        contractName: "RolesManager",
        functionName: "hasRefinerRole",
        args: [address],
      });

      if (isRefiner) {
        router.push(roleRedirects.refiner);
        return;
      }

      // Check transporter role
      const { data: isTransporter } = useScaffoldReadContract({
        contractName: "RolesManager",
        functionName: "hasTransporterRole",
        args: [address],
      });

      if (isTransporter) {
        router.push(roleRedirects.transporter);
        return;
      }

      // Check inspector role
      const { data: isInspector } = useScaffoldReadContract({
        contractName: "RolesManager",
        functionName: "hasInspectorRole",
        args: [address],
      });

      if (isInspector) {
        router.push(roleRedirects.inspector);
        return;
      }

      // Check auditor role
      const { data: isAuditor } = useScaffoldReadContract({
        contractName: "RolesManager",
        functionName: "hasAuditorRole",
        args: [address],
      });

      if (isAuditor) {
        router.push(roleRedirects.auditor);
        return;
      }

      // Check buyer role
      const { data: isBuyer } = useScaffoldReadContract({
        contractName: "RolesManager",
        functionName: "hasBuyerRole",
        args: [address],
      });

      if (isBuyer) {
        router.push(roleRedirects.buyer);
        return;
      }

      setError("Connected wallet doesn't have any assigned roles");
    } catch (error) {
      console.error("Role check error:", error);
      setError("Failed to check wallet roles. Please try again.");
    }
  };

  useEffect(() => {
    if (isConnected && connectedAddress) {
      const activeChainId = chainId || currentChainId;

      if (activeChainId !== 31337) {
        setError("Please switch to the correct network");
        return;
      }

      setWalletConnecting(true);
      checkUserRole(connectedAddress).finally(() => {
        setWalletConnecting(false);
      });
    }
  }, [isConnected, connectedAddress, chainId, currentChainId]);

  const validateStep = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        if (!formData.firstName.trim()) {
          setError("First name is required");
          return false;
        }
        if (!formData.lastName.trim()) {
          setError("Last name is required");
          return false;
        }
        if (!formData.email.trim()) {
          setError("Email is required");
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError("Please enter a valid email address");
          return false;
        }
        if (!formData.companyRole) {
          setError("Please select your company role");
          return false;
        }
        if (!formData.password) {
          setError("Password is required");
          return false;
        }
        if (formData.password.length < 8) {
          setError("Password must be at least 8 characters long");
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          return false;
        }
        if (!formData.acceptTerms) {
          setError("Please accept the terms and conditions");
          return false;
        }
        return true;

      case 2:
        if (!formData.companyName.trim()) {
          setError("Company name is required");
          return false;
        }
        if (!formData.phoneNumber.trim()) {
          setError("Phone number is required");
          return false;
        }
        if (!formData.mineralsMined.length) {
          setError("Please select at least one mineral");
          return false;
        }
        if (!formData.location.trim()) {
          setError("Location is required");
          return false;
        }
        if (!formData.employees.trim()) {
          setError("Number of employees is required");
          return false;
        }
        return true;

      case 3:
        if (!formData.licenseFile) {
          setError("Please upload your license file");
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateStep(step)) {
      return;
    }

    if (step === 3) {
      await handleSignup(e);
      return;
    }

    setAnimating(true);
    setTimeout(() => {
      setStep(step + 1);
      setAnimating(false);
    }, 300);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append("license", formData.licenseFile as File);
      formDataToSend.append("firstName", formData.firstName);
      formDataToSend.append("lastName", formData.lastName);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);
      formDataToSend.append("phoneNumber", formData.phoneNumber);
      formDataToSend.append("role", formData.companyRole);
      formDataToSend.append("mineralsMined", formData.mineralsMined.join(","));
      formDataToSend.append("companyName", formData.companyName);
      formDataToSend.append("companyPhoneNumber", formData.phoneNumber);
      formDataToSend.append("location", formData.location);
      formDataToSend.append("numberOfEmployees", String(Number(formData.employees)));

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to sign up");
      }

      setSignupSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  const handleMineralToggle = (mineral: string) => {
    setFormData(prev => {
      const exists = prev.mineralsMined.includes(mineral);
      return {
        ...prev,
        mineralsMined: exists ? prev.mineralsMined.filter(m => m !== mineral) : [...prev.mineralsMined, mineral],
      };
    });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleLicenseFile(file: File) {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "video/mp4"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please upload a PDF, JPEG, PNG, or MP4 file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert("File size exceeds 50MB limit.");
      return;
    }
    setFormData(prev => ({ ...prev, licenseFile: file }));
  }

  useEffect(() => {
    if (signupSuccess) {
      setSuccessMessage("Signup successful! Redirecting to login...");
      const timer = setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [signupSuccess, router]);

  return (
    <div className="min-h-screen w-full bg-[#060910] flex flex-col md:flex-row items-stretch px-2 sm:px-4 md:px-8 lg:px-12 xl:px-20 py-0 gap-0">
      <div className="flex flex-col flex-1 justify-center items-center h-auto md:h-screen select-none bg-transparent order-1 md:order-none pt-8 md:pt-0 pb-8 md:pb-0">
        <button
          className="absolute top-2 left-2 md:top-4 md:left-4 flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-lg bg-[#181c27] border border-[#23272F] hover:bg-[#23272F] transition-colors z-20"
          onClick={() => router.push("/")}
          aria-label="Back to website"
        >
          <FiArrowLeft className="text-white text-xl md:text-2xl" />
        </button>

        <div className="flex flex-col items-start w-full max-w-xl px-4 sm:px-6 md:px-8 pt-4 md:pt-8">
          <StoneProof size="xl" />
        </div>

        <div className="flex flex-col items-start w-full max-w-xl px-4 sm:px-6 md:px-8 mt-6 md:mt-8">
          <span className="inline-block bg-blue-600 text-white text-xs font-semibold px-3 sm:px-4 py-1 rounded mb-4 md:mb-6 tracking-wide">
            30% OF THE INDUSTRY
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 leading-tight">
            Trust, Transparency &<br />
            Traceability in Mining
          </h1>
          <span className="text-gray-400 text-base sm:text-lg md:text-xl mb-4">Let&apos;s get you started!</span>
        </div>

        <div className="flex flex-col items-center w-full max-w-3xl px-2 sm:px-6 mt-4">
          <img
            src="/auth/auth.svg"
            alt="Dashboard"
            className="w-[95vw] sm:w-full h-auto object-contain pointer-events-none select-none max-h-[220px] sm:max-h-[320px] md:max-h-[420px] lg:max-h-[500px] max-w-3xl"
          />
        </div>
      </div>

      <div className="flex flex-col flex-1 items-center justify-center min-h-screen overflow-y-auto scrollbar-none order-2 md:order-none">
        {!signupSuccess && (
          <div className="w-full max-w-xl mx-auto pt-8 md:pt-12 pb-2 md:pb-4 px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-2">
              {step === 1
                ? "Create Account"
                : step === 2
                  ? formData.companyRole === "refiner"
                    ? "Tell us about your refinery"
                    : "Tell us about your company"
                  : "Upload Your License"}
            </h2>
            <p className="text-gray-400 text-center text-base sm:text-lg">
              Create you first account here to enter our system
            </p>
          </div>
        )}

        <div className="w-full max-w-xl flex flex-col px-0 sm:px-6">
          <div className="bg-[#181c27] rounded-t-xl px-0 pt-0 pb-4">
            <div className="relative w-full h-2">
              <div className="absolute left-0 top-0 h-2 w-full bg-[#23272F] rounded-t-xl" />
              <div
                className={`absolute left-0 top-0 h-2 bg-blue-600 rounded-tl-xl transition-all duration-300`}
                style={{
                  width: step === 1 ? "33%" : step === 2 ? "66%" : "100%",
                }}
              />
            </div>

            <div className="flex w-full justify-between items-center px-2 sm:px-4 md:px-8 pt-3">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 ${step > 0 ? "border-blue-600 bg-blue-600" : "border-blue-600 bg-blue-600"} text-white text-sm sm:text-base font-bold transition-all duration-300`}
                >
                  {step > 0 ? <span className="text-lg">&#10003;</span> : "1"}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <div
                  className={`w-full border-t-2 border-dotted ${step > 1 ? "border-blue-500" : "border-blue-500"}`}
                  style={{ borderStyle: "dotted" }}
                ></div>
              </div>

              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 ${step > 1 ? "border-blue-600 bg-blue-600 text-white" : "border-[#23272F] bg-[#23272F] text-gray-400"} text-sm sm:text-base font-bold transition-all duration-300`}
                >
                  {step > 1 ? <span className="text-lg">&#10003;</span> : "2"}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <div
                  className="w-full border-t-2 border-dotted border-[#23272F]"
                  style={{ borderStyle: "dotted" }}
                ></div>
              </div>

              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border-2 ${step === 3 ? "border-blue-600 bg-blue-600 text-white" : "border-[#23272F] bg-[#23272F] text-gray-400"} text-sm sm:text-base font-bold transition-all duration-300`}
                >
                  {step === 3 ? <span className="text-lg">&#10003;</span> : "3"}
                </div>
              </div>
            </div>
          </div>

          <div
            className={`bg-[#060910] rounded-b-xl px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-10 flex flex-col border-t-0 border border-[#23272F] transition-all duration-300 ${animating ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0"}`}
          >
            {error && (
              <div
                className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded relative mb-4"
                role="alert"
              >
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {signupSuccess ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
                <div className="w-full rounded-xl p-6 sm:p-8 flex flex-col items-center max-w-full sm:max-w-lg mx-auto">
                  <img
                    src="/auth/success.svg"
                    alt="Success"
                    className="w-[200px] h-[200px] pointer-events-none select-none"
                  />
                  <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
                    You Successfully Signed Up!
                  </h3>
                  <p className="text-gray-400 text-center text-base sm:text-lg mb-6">
                    {successMessage || "You will shortly receive an email with the activation link for your account"}
                  </p>
                  <button
                    className="w-full py-3 rounded-md bg-[#0A77FF] hover:bg-[#0A77FF]/80 text-white font-semibold text-lg transition-colors shadow-none border-none flex items-center justify-center gap-2"
                    onClick={() => router.push("/auth/login")}
                  >
                    Go To Your Account <span className="text-xl">→</span>
                  </button>
                </div>
              </div>
            ) : step === 1 ? (
              <form className="space-y-6" onSubmit={handleContinue}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/2">
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        type="text"
                        required
                        className="input input-bordered w-full bg-[#232B3E] focus:bg-[#232B3E] border-[#23272F] text-white pr-10 rounded-md focus:ring-2 focus:ring-blue-600"
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white">
                        <FiInfo size={16} />
                      </span>
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">
                      Last Name
                    </label>
                    <div className="relative">
                      <input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        type="text"
                        required
                        className="input input-bordered w-full bg-[#232B3E] focus:bg-[#232B3E] border-[#23272F] text-white pr-10 rounded-md focus:ring-2 focus:ring-blue-600"
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white">
                        <FiInfo size={16} />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                      Email*
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john.doe@example.com"
                        required
                        className="input input-bordered w-full bg-[#232B3E] focus:bg-[#232B3E] border-[#23272F] text-white pr-10 rounded-md focus:ring-2 focus:ring-blue-600 autofill:!bg-[#232B3E]"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white">
                        <FiInfo size={16} />
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 ml-1">Input your email address</span>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <label htmlFor="companyRole" className="block text-sm font-medium text-gray-300 mb-1">
                      Company Role*
                    </label>
                    <div className="relative">
                      <select
                        id="companyRole"
                        name="companyRole"
                        required
                        className="input input-bordered w-full bg-[#232B3E] focus:bg-[#232B3E] border-[#23272F] text-white rounded-md focus:ring-2 focus:ring-blue-600 appearance-none"
                        value={formData.companyRole}
                        onChange={e => setFormData({ ...formData, companyRole: e.target.value })}
                      >
                        <option value="" disabled>
                          Select role
                        </option>
                        <option value="miner">Miner</option>
                        <option value="refiner">Refiner</option>
                        <option value="buyer">Buyer</option>
                        <option value="transporter">Transporter</option>
                      </select>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white pointer-events-none">
                        <FiChevronDown size={16} />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                      Password*
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        required
                        className="input input-bordered w-full bg-[#232B3E] focus:bg-[#232B3E] border-[#23272F] text-white pr-10 rounded-md focus:ring-2 focus:ring-blue-600"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white focus:outline-none"
                        onClick={() => setShowPassword(v => !v)}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                    <span className="text-xs text-gray-500 ml-1">Please enter your password</span>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                      Confirm Password*
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        required
                        className="input input-bordered w-full bg-[#232B3E] focus:bg-[#232B3E] border-[#23272F] text-white pr-10 rounded-md focus:ring-2 focus:ring-blue-600"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white focus:outline-none"
                        onClick={() => setShowConfirmPassword(v => !v)}
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                    <span className="text-xs text-gray-500 ml-1">Passwords need to match</span>
                  </div>
                </div>
                <div className="flex items-center mb-2">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    required
                    checked={formData.acceptTerms}
                    onChange={e => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    className="w-5 h-5 border border-[#23272F] rounded-sm focus:bg-[#181c27] checked:bg-[#181c27] accent-blue-600 focus:ring-2 focus:ring-blue-600 mr-2"
                  />
                  <label htmlFor="acceptTerms" className="text-sm text-white select-none">
                    I accept the <span className="underline cursor-pointer">Terms and Privacy Policy</span>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-md bg-[#0A77FF] hover:bg-[#0A77FF]/80 text-white font-semibold text-lg transition-colors mb-2 shadow-none border-none flex items-center justify-center gap-2 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      {formData.companyRole === "buyer" ? "Submit" : "Continue"}{" "}
                      <FiArrowRight className="text-xl inline ml-1" />
                    </>
                  )}
                </button>
                <div className="text-center mb-2">
                  <span className="text-gray-400 text-sm">Already have an account? </span>
                  <button
                    type="button"
                    className="text-[#0A77FF] hover:text-[#0A77FF]/80 text-sm font-semibold ml-1"
                    onClick={() => router.push("/auth/login")}
                  >
                    Log in
                  </button>
                </div>
                <div className="flex items-center my-4">
                  <div className="flex-grow h-px bg-[#23272F]" />
                  <span className="mx-4 text-gray-500 text-sm">Or, sign up with your wallet</span>
                  <div className="flex-grow h-px bg-[#23272F]" />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <ConnectButton.Custom>
                    {({ openConnectModal, account, chain }) => {
                      return (
                        <button
                          type="button"
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-[#23272F] text-white font-semibold hover:bg-[#23272F] transition-colors"
                          onClick={openConnectModal}
                          disabled={walletConnecting}
                        >
                          {walletConnecting ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Connecting...
                            </>
                          ) : (
                            <>
                              <img src="/wallet.svg" alt="Wallet" className="w-5 h-5" />
                              Sign in with Wallet
                            </>
                          )}
                        </button>
                      );
                    }}
                  </ConnectButton.Custom>
                </div>
              </form>
            ) : step === 2 ? (
              <form className="space-y-6" onSubmit={handleContinue}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/2">
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-1">
                      Company Name
                    </label>
                    <div className="relative">
                      <input
                        id="companyName"
                        name="companyName"
                        placeholder="Your Company"
                        type="text"
                        required
                        className="input input-bordered w-full bg-[#232B3E] focus:bg-[#232B3E] border-[#23272F] text-white pr-10 rounded-md focus:ring-2 focus:ring-blue-600"
                        value={formData.companyName}
                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white">
                        <FiInfo size={16} />
                      </span>
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <input
                        id="phoneNumber"
                        name="phoneNumber"
                        placeholder="+1234567890"
                        type="text"
                        required
                        className="input input-bordered w-full bg-[#232B3E] focus:bg-[#232B3E] border-[#23272F] text-white pr-10 rounded-md focus:ring-2 focus:ring-blue-600"
                        value={formData.phoneNumber}
                        onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white">
                        <FiInfo size={16} />
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {formData.companyRole === "refiner" ? "Minerals Refined" : "Minerals Mined"}
                  </label>
                  <div className="flex flex-wrap gap-2 bg-[#232B3E] rounded-md px-3 py-2 min-h-[44px]">
                    {formData.mineralsMined.map(mineral => (
                      <span
                        key={mineral}
                        className="bg-white text-[#181c27] px-3 py-1 rounded-full text-xs flex items-center gap-1"
                      >
                        {mineral}
                        <button
                          type="button"
                          className="ml-1 text-gray-600 hover:text-red-400"
                          onClick={() => handleMineralToggle(mineral)}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        className="bg-[#181c27] text-gray-400 outline-none border-none focus:ring-2 focus:ring-blue-600 text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                      >
                        Add mineral...
                        <FiChevronDown
                          className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {dropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-[#181c27] border border-[#23272F] rounded-md shadow-lg">
                          {mineralsList
                            .filter(m => !formData.mineralsMined.includes(m))
                            .map(m => (
                              <button
                                key={m}
                                type="button"
                                className="block w-full text-left px-3 py-2 text-white hover:bg-[#23272F] text-xs"
                                onClick={() => {
                                  handleMineralToggle(m);
                                  setDropdownOpen(false);
                                }}
                              >
                                {m}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/2">
                    <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">
                      Location*
                    </label>
                    <div className="relative">
                      <input
                        id="location"
                        name="location"
                        placeholder="Location"
                        type="text"
                        required
                        className="input input-bordered w-full bg-[#232B3E] focus:bg-[#232B3E] border-[#23272F] text-white pr-10 rounded-md focus:ring-2 focus:ring-blue-600"
                        value={formData.location}
                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white">
                        <FiInfo size={16} />
                      </span>
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <label htmlFor="employees" className="block text-sm font-medium text-gray-300 mb-1">
                      Number of Employees
                    </label>
                    <div className="relative">
                      <input
                        id="employees"
                        name="employees"
                        placeholder="20"
                        type="text"
                        required
                        className="input input-bordered w-full bg-[#232B3E] focus:bg-[#232B3E] border-[#23272F] text-white pr-10 rounded-md focus:ring-2 focus:ring-blue-600"
                        value={formData.employees}
                        onChange={e => setFormData({ ...formData, employees: e.target.value })}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white">
                        <FiInfo size={16} />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className="w-1/2 py-3 rounded-md bg-[#232B3E] hover:bg-[#23272F] text-white font-semibold text-lg transition-colors border-none"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-3 rounded-md bg-[#0A77FF] hover:bg-[#0A77FF]/80 text-white font-semibold text-lg transition-colors shadow-none border-none flex items-center justify-center gap-2"
                  >
                    Continue <FiArrowRight className="text-xl inline ml-1" />
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleSignup}>
                <div className="flex flex-col items-center justify-center w-full">
                  <div className="w-full bg-[#181c27] rounded-xl p-6 sm:p-8 flex flex-col items-center border border-[#23272F] max-w-full sm:max-w-lg mx-auto">
                    <div className="w-full max-w-md">
                      <label className="block text-white font-semibold text-lg mb-2">Upload Your License Below</label>
                      <p className="text-gray-400 text-sm mb-4">
                        Select the file from your computer to upload (in .pdf, .jpeg, .png, .mp4)
                      </p>
                      <div
                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-500 rounded-xl p-8 bg-[#060910] mb-4 cursor-pointer transition hover:border-blue-600 w-full"
                        onClick={() => document.getElementById("license-upload-input")?.click()}
                        onDragOver={e => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files[0];
                          if (file) handleLicenseFile(file);
                        }}
                        style={{ minHeight: 180 }}
                      >
                        <input
                          id="license-upload-input"
                          type="file"
                          accept=".pdf,.jpeg,.jpg,.png,.mp4"
                          style={{ display: "none" }}
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) handleLicenseFile(e.target.files[0]);
                          }}
                        />
                        <div className="flex flex-col items-center">
                          <span className="mb-2">
                            <svg
                              width="40"
                              height="40"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              className="text-gray-400"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M7 16v-4a4 4 0 018 0v4M5 20h14a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z"
                              />
                            </svg>
                          </span>
                          <span className="text-white font-semibold text-base mb-1">
                            Choose a file or drag & drop it here
                          </span>
                          <span className="text-gray-400 text-xs">JPEG, PNG, PDF, and MP4 formats, up to 50MB</span>
                          {formData.licenseFile && (
                            <span className="mt-2 text-green-400 text-xs">Selected: {formData.licenseFile.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <button
                          type="button"
                          className="w-full sm:w-1/2 py-3 rounded-md bg-[#232B3E] hover:bg-[#23272F] text-white font-semibold text-lg transition-colors border-none"
                          onClick={() => setStep(2)}
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className={`w-full sm:w-1/2 py-3 rounded-md bg-[#0A77FF] hover:bg-[#0A77FF]/80 text-white font-semibold text-lg transition-colors shadow-none border-none flex items-center justify-center gap-2 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {loading ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              Submit <FiDownload className="text-xl inline ml-1" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
