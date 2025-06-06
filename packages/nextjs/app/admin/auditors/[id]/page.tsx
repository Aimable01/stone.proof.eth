"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import RefineryActivityCard from "../../../../components/dashboard/admin/RefineryActivityCard";
import RefineryProgressCard from "../../../../components/dashboard/admin/RefineryProgressCard";
import { HiOutlineDocumentText } from "react-icons/hi";
import { mockAuditors } from "~~/data/data";

export default function AuditorDetailsPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const auditor = mockAuditors.find(a => a.id === id);

  // Read status from query param, default to 'active'
  const initialStatus = searchParams.get("status") === "inactive" ? "inactive" : "active";
  const [status, setStatus] = useState(initialStatus);

  // Update URL when status changes
  useEffect(() => {
    router.replace(`/admin/auditors/${id}?status=${status}`);
  }, [status]);

  if (!auditor) {
    return <div className="text-white p-10 text-center text-2xl">Auditor not found</div>;
  }

  // Mocked values for demo (replace with real data as needed)
  const auditProgress = 12;
  const quantity = "50 Tons";
  const totalPendings = "2,345";
  const disputes = 400;
  const topDelay = "12 Days";
  const auditorAddress = "23";
  const auditorName = auditor.name;

  return (
    <div className="min-h-screen text-white p-4 md:p-10 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
        <div className="w-full flex flex-row items-center justify-between">
          <h1 className="text-xl sm:text-3xl md:text-5xl font-semibold leading-tight">
            Auditor _ID: <span className="text-white">{auditor.code}</span>
          </h1>
          <span
            className={`inline-block text-xs px-6 py-1 rounded-full ${status === "active" ? "bg-blue-500 text-white" : "bg-gray-500 text-white"}`}
          >
            {status === "active" ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Responsive two-column layout */}
      <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Main Card - left, 3/4 width on desktop */}
        <div className="md:col-span-3 rounded-2xl p-4 md:p-6 border border-[#1E2328]">
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-4 gap-2">
              <div className="flex items-center gap-3">
                <img
                  src={auditor.avatar}
                  alt={auditor.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
                />
                <span className="font-bold text-lg md:text-xl">{auditor.name}</span>
              </div>
              <span className="text-gray-400 text-sm md:text-base">{auditor.registeredOn} - Present</span>
            </div>

            {/* Two columns: left stats, right auditor info */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              {/* Left column: Progress and stats */}
              <div className="flex-1 flex flex-col gap-4 md:gap-5">
                <div className="flex items-start gap-2">
                  <span className="text-white font-medium w-32">
                    Auditing
                    <br />
                    Progress
                  </span>
                  <span className="text-gray-400 mt-1">:</span>
                  <div className="flex-1 flex flex-col">
                    <div className="w-full h-3 bg-white rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${auditProgress}%` }}></div>
                    </div>
                    <span className="bg-[#FF3B30] text-white text-xs px-2 py-1 rounded font-bold mt-2 self-end">
                      {auditProgress}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium w-32">Quantity</span>
                  <span className="text-gray-400">:</span>
                  <div className="flex-1">
                    <div className="border border-[#1E2328] rounded px-4 py-3 font-bold text-white w-full">
                      {quantity}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium w-32">Total Pendings</span>
                  <span className="text-gray-400">:</span>
                  <div className="flex-1">
                    <div className="border border-[#1E2328] rounded px-4 py-3 font-bold text-white w-full">
                      {totalPendings}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium w-32">Disputes against:</span>
                  <span className="text-gray-400">:</span>
                  <div className="flex-1">
                    <div className="border border-[#1E2328] rounded px-4 py-3 font-bold text-white w-full flex items-center">
                      <span className="text-2xl">{disputes}</span>
                      <span className="text-xs text-gray-400 ml-2">Total Votes</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium w-32">Top Delay:</span>
                  <span className="text-gray-400">:</span>
                  <div className="flex-1">
                    <div className="border border-[#1E2328] rounded px-4 py-3 font-bold text-white w-full">
                      {topDelay}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column: Auditor info */}
              <div className="flex-1 flex flex-col gap-4 md:gap-5">
                <div>
                  <span className="block text-white font-bold mb-2">AUDITOR_ID</span>
                  <div className="border border-[#1E2328] rounded px-4 py-3 flex items-center justify-between">
                    <span className="font-mono text-white text-base">{auditor.code}</span>
                    <button className="text-gray-400 hover:text-white ml-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <span className="block text-white font-bold mb-2">Auditor Address</span>
                  <div className="border border-[#1E2328] rounded px-4 py-3 text-white">{auditorAddress}</div>
                </div>
                <div>
                  <span className="block text-white font-bold mb-2">Auditor Name</span>
                  <div className="border border-[#1E2328] rounded px-4 py-3 text-white">{auditorName}</div>
                </div>
              </div>
            </div>

            {/* Export/Download section */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center pt-8 md:pt-12">
              {/* Export Button */}
              <button className="flex items-center gap-2 bg-[#202634] text-white px-4 py-2 rounded-lg w-full md:w-auto">
                Export Auditor&apos;s Report
                <img src="/dashboard/icon_set/download.svg" alt="export" className="w-6 h-6" />
              </button>

              {/* PDF Card */}
              <div className="flex flex-col items-start bg-transparent w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <HiOutlineDocumentText className="w-12 h-12 text-gray-300" />
                  <div>
                    <div className="text-white font-medium text-base flex items-center gap-2">
                      <span className="bg-gray-800 px-2 py-0.5 rounded text-xs font-bold">PDF</span>
                      Auditor Legal Doc
                    </div>
                    <div className="text-xs text-gray-400">34.6kb</div>
                  </div>
                </div>
                <button className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full font-medium flex items-center gap-1 w-full md:w-auto">
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Side Cards - right, 1/4 width on desktop */}
        {/* You can add AuditorActivityCard and AuditorProgressCard here if needed */}
        <div className="flex flex-col gap-0 w-full">
          <RefineryActivityCard />
          <RefineryProgressCard />
        </div>

        {/* Action buttons: below the main card, same width as main card */}
        <div className="md:col-span-3 flex flex-row gap-4 mt-4">
          <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors">
            Revoke auditor
          </button>
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
            View Next <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>

      <p className="text-gray-400 text-md mt-2">
        If an audit is revoked he/she won&apos;t be able to access the system!
      </p>
    </div>
  );
}
