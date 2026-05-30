import { e as createLucideIcon, r as reactExports, j as jsxRuntimeExports, ax as ShieldCheck, a8 as X, T as TriangleAlert, b6 as CircleCheckBig, ao as LoaderCircle, a0 as Shield, b7 as Key, aA as Lock, aB as Download, a9 as RefreshCw, b8 as useEnrollUserKeyEscrow, b9 as useGetEncryptedEscrowKey, ba as useEscrowStats, bb as useEscrowedUsers, bc as useRecoveryRequests, bd as RecoveryRequestStatus, be as ChevronUp, aa as ChevronDown, U as Users, a as Skeleton, I as Input, B as Button, d as ue, ac as Dialog, ad as DialogContent, ae as DialogHeader, af as DialogTitle, ag as DialogDescription, ah as DialogFooter, bf as EscrowStatus, c as Badge, bg as useEscrowGrants, bh as useInitiateKeyRecovery, v as Label, Y as Textarea, bi as useApproveKeyRecovery, bj as __vitePreload, bk as useRejectKeyRecovery } from "./index-Hc4ZZN7u.js";
import { A as AdminLayout } from "./AdminLayout-CuAzl8OZ.js";
import { P as PrincipalDisplay } from "./PrincipalDisplay-CpeP-OO9.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
];
const CircleX = createLucideIcon("circle-x", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
];
const Clock = createLucideIcon("clock", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["circle", { cx: "10", cy: "16", r: "2", key: "4ckbqe" }],
  ["path", { d: "m16 10-4.5 4.5", key: "7p3ebg" }],
  ["path", { d: "m15 11 1 1", key: "1bsyx3" }]
];
const FileKey = createLucideIcon("file-key", __iconNode);
function principalText(p) {
  if (typeof p === "string") return p;
  if (p && typeof p.toText === "function") {
    return p.toText();
  }
  return String(p);
}
function formatNano(ns) {
  const ms = Number(ns / 1000000n);
  return new Date(ms).toLocaleString(void 0, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
const STEPS = [
  { label: "Recovery Requested", short: "Request" },
  { label: "First Authorization", short: "Auth 1" },
  { label: "Second Authorization", short: "Auth 2" },
  { label: "Key Delivery", short: "Delivery" }
];
function StepIndicator({
  currentStep
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between mb-8", children: STEPS.map((s, i) => {
    const stepNum = i + 1;
    const isDone = stepNum < currentStep;
    const isActive = stepNum === currentStep;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex-1 flex flex-col items-center relative",
        children: [
          i < STEPS.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `absolute top-4 left-1/2 w-full h-0.5 ${isDone ? "bg-blue-500" : "bg-gray-200"}`,
              style: { left: "50%" }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${isDone ? "bg-blue-600 border-blue-600 text-white" : isActive ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-white border-gray-300 text-gray-400"}`,
              children: isDone ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-4 h-4" }) : stepNum
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: `mt-1.5 text-[0.65rem] font-medium text-center ${isActive ? "text-blue-700" : isDone ? "text-blue-500" : "text-gray-400"}`,
              children: s.short
            }
          )
        ]
      },
      s.short
    );
  }) });
}
function RecoveryWizardDialog({
  request,
  onClose,
  onKeyDelivered,
  generateTransportKeyPair: generateTransportKeyPair2,
  getEncryptedEscrowKey
}) {
  const [step, setStep] = reactExports.useState(1);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [transportKeyPair, setTransportKeyPair] = reactExports.useState(null);
  if (!request) return null;
  const targetPrincipal = principalText(request.targetUserId);
  const requestedBy = principalText(request.initiatingAdmin);
  const handleStep2 = () => {
    setError(null);
    setStep(2);
  };
  const handleStep3 = async () => {
    setError(null);
    setLoading(true);
    try {
      const kp = await generateTransportKeyPair2();
      setTransportKeyPair(kp);
      setStep(3);
    } catch (e) {
      setError(
        `Failed to generate transport key pair: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setLoading(false);
    }
  };
  const handleDeliverKey = async () => {
    if (!transportKeyPair) return;
    setError(null);
    setLoading(true);
    try {
      const hexPubKey = Array.from(transportKeyPair.publicKeyBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      const encryptedResult = await getEncryptedEscrowKey(
        targetPrincipal,
        hexPubKey
      );
      let rawBytes;
      if (encryptedResult instanceof Uint8Array) {
        rawBytes = encryptedResult;
      } else if (Array.isArray(encryptedResult)) {
        rawBytes = new Uint8Array(encryptedResult);
      } else {
        throw new Error("Unexpected key format from canister");
      }
      setStep(4);
      setTimeout(() => {
        onKeyDelivered(rawBytes, targetPrincipal);
      }, 800);
    } catch (e) {
      setError(
        `Key retrieval failed: ${e instanceof Error ? e.message : String(e)}. Contact your system administrator.`
      );
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-900 text-white p-6 rounded-t-lg flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-6 h-6 text-amber-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-bold", children: "Key Recovery Wizard" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-300 text-sm", children: "Dual-Control vetKeys Recovery — Phase 2" })
        ] })
      ] }),
      step < 4 && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onClose,
          className: "text-gray-400 hover:text-white",
          "aria-label": "Close wizard",
          "data-ocid": "escrow.wizard.close_button",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-5 h-5" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StepIndicator, { currentStep: step }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 border border-amber-300 rounded-lg p-4 flex gap-3 mb-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-amber-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Dual authorization required." }),
          " Neither admin can approve their own request. This action is",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "permanent and audited." }),
          " All steps are cryptographically recorded on the Internet Computer."
        ] })
      ] }),
      step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-gray-900 text-base", children: "Step 1 — Review Recovery Request" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-100 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between px-4 py-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 font-medium", children: "Recovery ID" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-gray-800 text-xs", children: [
              String(request.id).slice(0, 24),
              "..."
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between px-4 py-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 font-medium", children: "Target User" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-gray-800 text-xs", children: [
              targetPrincipal.slice(0, 20),
              "..."
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between px-4 py-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 font-medium", children: "Requested By" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-gray-800 text-xs", children: [
              requestedBy.slice(0, 20),
              "..."
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between px-4 py-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 font-medium", children: "Submitted" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-800 text-xs", children: formatNano(request.createdAt) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500 font-medium block mb-1", children: "Reason" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-800 text-xs", children: request.reason })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: handleStep2,
            className: "w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors",
            "data-ocid": "escrow.wizard.step1_next_button",
            children: "Proceed to First Authorization"
          }
        )
      ] }),
      step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-gray-900 text-base", children: "Step 2 — First Authorization" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-green-800", children: "First authorization recorded" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-green-700 mt-1", children: "The initial recovery request has been verified. A second, distinct authorized admin must now provide the second authorization to proceed." })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-red-800 mb-1", children: "⚠ Second Authorizer Must Be a Different Admin" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-700", children: "The admin who initiated this request cannot provide the second authorization. Confirm that a second authorized admin is present and has reviewed this request before proceeding." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => void handleStep3(),
            disabled: loading,
            className: "w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors",
            "data-ocid": "escrow.wizard.step2_auth_button",
            children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-5 h-5 animate-spin" }),
              " Generating Transport Keys..."
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-5 h-5" }),
              " Confirm Second Authorization & Generate Transport Key"
            ] })
          }
        )
      ] }),
      step === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-gray-900 text-base", children: "Step 3 — Retrieve Encrypted Key via vetKeys" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4 text-blue-600" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-blue-800", children: "Transport Key Generated" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-blue-700", children: "A one-time ephemeral transport key pair has been generated in your browser. The canister will encrypt the recovered key under this public key so only your browser can decrypt it." }),
          transportKeyPair && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-mono text-blue-600 text-xs mt-2 break-all", children: [
            "Transport key fingerprint:",
            " ",
            Array.from(transportKeyPair.publicKeyBytes).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join(":"),
            "..."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Final confirmation required." }),
          " Clicking the button below will contact the ICP vetKeys system, derive the user's escrowed key, encrypt it under your transport key, and deliver it to your browser. This action is",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "irreversible and permanently audited." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => void handleDeliverKey(),
            disabled: loading,
            className: "w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors",
            "data-ocid": "escrow.wizard.step3_retrieve_button",
            children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "w-5 h-5 animate-spin" }),
              " Contacting vetKeys System..."
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { className: "w-5 h-5" }),
              " Retrieve Encrypted Key — Final Authorization"
            ] })
          }
        )
      ] }),
      step === 4 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-gray-900 text-base", children: "Step 4 — Key Delivery" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-green-50 border border-green-300 rounded-lg p-4 flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-6 h-6 text-green-600 flex-shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold text-green-800", children: "Encrypted Key Delivered" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-green-700 text-sm mt-1", children: "The key has been securely delivered to your browser session. The Secure Key Export dialog will open momentarily to allow you to protect it with a password before downloading." })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500", children: "Recovery ID:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-gray-800 text-xs", children: [
              String(request.id).slice(0, 24),
              "..."
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500", children: "Target Principal:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-gray-800 text-xs", children: [
              targetPrincipal.slice(0, 20),
              "..."
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500", children: "Completed:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-800 text-xs", children: (/* @__PURE__ */ new Date()).toISOString() })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800", children: "The Secure Key Export dialog is opening. You will be prompted to set a strong password to encrypt the key before it is saved to your device." })
      ] }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-red-700", children: error })
      ] })
    ] })
  ] }) });
}
function scorePassword(pwd) {
  let score = 0;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}
async function exportKeyWithPassword(rawKeyBytes, password, metadata) {
  const enc = new TextEncoder();
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 1e5, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const encryptedBytes = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    aesKey,
    new Uint8Array(rawKeyBytes)
  );
  const toBase64 = (buf) => {
    const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    return btoa(String.fromCharCode(...arr));
  };
  const exportData = {
    version: "1",
    format: "charliesierra-key-export-v1",
    targetPrincipal: metadata.targetPrincipal,
    recoveryId: metadata.recoveryId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    salt: toBase64(saltBytes),
    iv: toBase64(ivBytes),
    encryptedKeyMaterial: toBase64(encryptedBytes),
    warning: "This file is encrypted with a user-provided password. No plaintext key material is stored."
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const shortPrincipal = metadata.targetPrincipal.slice(0, 10);
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
  a.href = url;
  a.download = `charliesierra-key-recovery-${shortPrincipal}-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function SecureKeyExportModal({
  isOpen,
  onClose,
  rawKeyBytes,
  targetPrincipal,
  recoveryId
}) {
  const [step, setStep] = reactExports.useState("password");
  const [password, setPassword] = reactExports.useState("");
  const [confirmPwd, setConfirmPwd] = reactExports.useState("");
  const [exporting, setExporting] = reactExports.useState(false);
  const [showReencryptGuide, setShowReencryptGuide] = reactExports.useState(false);
  const [showAccessGuide, setShowAccessGuide] = reactExports.useState(false);
  const [exportError, setExportError] = reactExports.useState(null);
  const pwdScore = scorePassword(password);
  const pwdMatch = password === confirmPwd && confirmPwd.length > 0;
  const pwdStrong = pwdScore >= 2 && password.length >= 12;
  const canExport = pwdMatch && pwdStrong && rawKeyBytes !== null;
  const scoreLabels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const scoreColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500"
  ];
  const handleExport = async () => {
    if (!rawKeyBytes || !canExport) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportKeyWithPassword(rawKeyBytes, password, {
        targetPrincipal,
        recoveryId
      });
      setStep("success");
    } catch {
      setExportError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-900 text-white p-6 rounded-t-lg flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileKey, { className: "w-6 h-6 text-amber-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-bold", children: "Secure Key Export" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-300 text-sm", children: "CharlieSierra Key Recovery — Phase 2" })
          ] })
        ] }),
        step === "success" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "text-gray-400 hover:text-white",
            "aria-label": "Close",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-5 h-5" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6", children: [
        step === "password" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-red-800 text-sm", children: "SECURITY NOTICE" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-red-700 text-sm mt-1", children: [
                "Key material will be encrypted before download.",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Never share your password." }),
                " There is no password recovery. If you lose this password, the exported key file cannot be decrypted."
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500", children: "Recovery ID:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-gray-800", children: [
                recoveryId.slice(0, 20),
                "..."
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500", children: "Target Principal:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-gray-800", children: [
                targetPrincipal.slice(0, 20),
                "..."
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "label",
                {
                  htmlFor: "export-password",
                  className: "block text-sm font-medium text-gray-700 mb-1",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-4 h-4 inline mr-1" }),
                    "Export Password"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "export-password",
                  type: "password",
                  value: password,
                  onChange: (e) => setPassword(e.target.value),
                  className: "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                  placeholder: "Minimum 12 characters",
                  autoComplete: "new-password",
                  "data-ocid": "escrow.key_export.password_input"
                }
              ),
              password.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 mb-1", children: [0, 1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: `h-1.5 flex-1 rounded ${i < pwdScore ? scoreColors[pwdScore] : "bg-gray-200"}`
                  },
                  i
                )) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500", children: scoreLabels[pwdScore] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "label",
                {
                  htmlFor: "export-password-confirm",
                  className: "block text-sm font-medium text-gray-700 mb-1",
                  children: "Confirm Password"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "export-password-confirm",
                  type: "password",
                  value: confirmPwd,
                  onChange: (e) => setConfirmPwd(e.target.value),
                  className: `w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${confirmPwd.length > 0 ? pwdMatch ? "border-green-400" : "border-red-400" : "border-gray-300"}`,
                  placeholder: "Re-enter password",
                  autoComplete: "new-password",
                  "data-ocid": "escrow.key_export.confirm_password_input"
                }
              ),
              confirmPwd.length > 0 && !pwdMatch && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-red-600 mt-1", children: "Passwords do not match" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "This file is encrypted with your password. Store it securely." }) }),
          exportError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700", children: exportError }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => void handleExport(),
              disabled: !canExport || exporting,
              className: "w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors",
              "data-ocid": "escrow.key_export.submit_button",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-5 h-5" }),
                exporting ? "Encrypting and Exporting..." : "Export Encrypted Key File"
              ]
            }
          )
        ] }),
        step === "success" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-green-50 border border-green-300 rounded-lg p-4 flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-6 h-6 text-green-600 flex-shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold text-green-800", children: "Key Recovery Completed Successfully" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-green-700 text-sm mt-1", children: "The encrypted key file has been downloaded. This recovery event is permanently recorded in the audit log." })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium text-gray-700 mb-2", children: "Audit Confirmation" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500", children: "Recovery ID:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-gray-800 text-xs", children: [
                recoveryId.slice(0, 24),
                "..."
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500", children: "Target Principal:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-gray-800 text-xs", children: [
                targetPrincipal.slice(0, 24),
                "..."
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-500", children: "Timestamp:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gray-800 text-xs", children: (/* @__PURE__ */ new Date()).toISOString() })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-gray-800 mb-3", children: "What's Next?" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-blue-200 rounded-lg p-4 bg-blue-50", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-5 h-5 text-blue-600" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-medium text-blue-900", children: "Re-encrypt Historical Messages" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-blue-800 mb-3", children: "Use the recovered key to re-encrypt historical messages for the affected user." }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "text-xs text-blue-700 space-y-1 mb-3 list-decimal list-inside", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Key export file downloaded above" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Share securely with affected user" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "User imports key in device settings" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Messages re-indexed and accessible" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setShowReencryptGuide(true),
                    className: "w-full text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-3 rounded transition-colors",
                    "data-ocid": "escrow.key_export.reencrypt_guide_button",
                    children: "Start Re-encryption Process"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-green-200 rounded-lg p-4 bg-green-50", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-5 h-5 text-green-600" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-medium text-green-900", children: "Restore User Access" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-green-800 mb-3", children: "If the user has lost device access, follow steps to restore messaging capability." }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "text-xs text-green-700 space-y-1 mb-3 list-decimal list-inside", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Verify identity via out-of-band channel" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Provide encrypted key export to user" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "User re-pairs device using key file" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Monitor audit logs for re-authentication" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setShowAccessGuide(true),
                    className: "w-full text-sm bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-3 rounded transition-colors",
                    "data-ocid": "escrow.key_export.access_guide_button",
                    children: "View Access Restoration Guide"
                  }
                )
              ] })
            ] })
          ] })
        ] })
      ] })
    ] }),
    showReencryptGuide && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg shadow-xl max-w-lg w-full p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-lg font-bold text-gray-900 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-5 h-5 text-blue-600" }),
          "Re-encryption Process — Phase 2 Guidance"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setShowReencryptGuide(false),
            className: "text-gray-400 hover:text-gray-600",
            "aria-label": "Close",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-5 h-5" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Notice:" }),
        " Full automatic re-encryption will be available in Phase 3. The following steps describe the manual process for Phase 2."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "space-y-3 text-sm text-gray-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-blue-700 flex-shrink-0", children: "1." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Secure Transfer:" }),
            " Transfer the encrypted key export file to the affected user via a secure, out-of-band channel (e.g., encrypted email, secure courier, or in-person)."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-blue-700 flex-shrink-0", children: "2." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "User Import:" }),
            " The user opens CharlieSierra on their device, navigates to Settings → Key Management → Import Recovery Key, and selects the downloaded .json file."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-blue-700 flex-shrink-0", children: "3." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Password Entry:" }),
            " The user enters the export password you set during this recovery to decrypt the key material locally."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-blue-700 flex-shrink-0", children: "4." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Re-indexing:" }),
            " Once imported, the app will re-decrypt historical messages using the restored key. This may take several minutes for accounts with large message histories."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-blue-700 flex-shrink-0", children: "5." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Audit Verification:" }),
            " Monitor the audit logs to confirm successful key import and message re-indexing events for this user."
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => setShowReencryptGuide(false),
          className: "mt-6 w-full bg-gray-900 text-white font-medium py-2 px-4 rounded hover:bg-gray-700 transition-colors",
          children: "Close"
        }
      )
    ] }) }),
    showAccessGuide && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-lg shadow-xl max-w-lg w-full p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-lg font-bold text-gray-900 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-5 h-5 text-green-600" }),
          "Access Restoration Guide"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setShowAccessGuide(false),
            className: "text-gray-400 hover:text-gray-600",
            "aria-label": "Close",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-5 h-5" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "space-y-3 text-sm text-gray-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-green-700 flex-shrink-0", children: "1." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Identity Verification:" }),
            " Before providing any key material, verify the user's identity through an out-of-band channel (government ID, video call, or in-person verification)."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-green-700 flex-shrink-0", children: "2." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Provide Key Export:" }),
            " Transfer the encrypted key file to the verified user using a secure channel. Document this transfer in your organizational records."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-green-700 flex-shrink-0", children: "3." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Device Re-pairing:" }),
            " The user follows the Device Re-pairing procedure in their account settings, importing the recovery key file when prompted."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-green-700 flex-shrink-0", children: "4." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Access Restoration:" }),
            " After successful key import, the user regains full access to their secure messaging account, including historical messages."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-green-700 flex-shrink-0", children: "5." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Audit Monitoring:" }),
            " Monitor the audit logs for the next 24–48 hours to confirm successful re-authentication. Escalate any anomalies immediately."
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Security Reminder:" }),
        " All access restoration actions are permanently logged. Any suspicious activity should be reported to your security officer immediately."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => setShowAccessGuide(false),
          className: "mt-4 w-full bg-gray-900 text-white font-medium py-2 px-4 rounded hover:bg-gray-700 transition-colors",
          children: "Close"
        }
      )
    ] }) })
  ] });
}
async function generateTransportKeyPair() {
  try {
    const { TransportSecretKey } = await __vitePreload(async () => {
      const { TransportSecretKey: TransportSecretKey2 } = await import("./index.es-CAdDqaAM.js");
      return { TransportSecretKey: TransportSecretKey2 };
    }, true ? [] : void 0);
    const tsk = TransportSecretKey.random();
    return { publicKeyBytes: tsk.publicKeyBytes(), secretKey: tsk };
  } catch (err) {
    throw new Error(
      `Failed to generate vetKeys transport key pair. The @dfinity/vetkeys package is required for key recovery. ${String(err)}`
    );
  }
}
function formatNanoTs(ns) {
  if (ns == null) return "—";
  const ms = Number(ns / 1000000n);
  return new Date(ms).toLocaleString(void 0, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function EscrowStatusBadge({ status }) {
  const config = {
    [EscrowStatus.active]: {
      label: "Active",
      className: "border text-green-700 bg-green-50 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800"
    },
    [EscrowStatus.pendingRecovery]: {
      label: "Pending Recovery",
      className: "border text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
    },
    [EscrowStatus.recovered]: {
      label: "Recovered",
      className: "border text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
    },
    [EscrowStatus.revoked]: {
      label: "Revoked",
      className: "border text-muted-foreground bg-muted border-border"
    }
  };
  const c = config[status] ?? config[EscrowStatus.revoked];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Badge,
    {
      variant: "outline",
      className: `text-xs font-medium whitespace-nowrap ${c.className}`,
      children: c.label
    }
  );
}
function RecoveryStatusBadge({ status }) {
  const config = {
    [RecoveryRequestStatus.pending]: {
      label: "Pending",
      className: "border text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
    },
    [RecoveryRequestStatus.approved]: {
      label: "Approved",
      className: "border text-green-700 bg-green-50 border-green-200 dark:bg-green-950/40 dark:text-green-400"
    },
    [RecoveryRequestStatus.rejected]: {
      label: "Rejected",
      className: "border text-muted-foreground bg-muted border-border"
    },
    [RecoveryRequestStatus.completed]: {
      label: "Completed",
      className: "border text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400"
    }
  };
  const c = config[status] ?? config[RecoveryRequestStatus.pending];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Badge,
    {
      variant: "outline",
      className: `text-xs font-medium whitespace-nowrap ${c.className}`,
      children: c.label
    }
  );
}
function principalToString(value) {
  if (typeof value.toText === "function") {
    return value.toText();
  }
  return String(value);
}
function EscrowGrantsSection({
  userId
}) {
  const grants = useEscrowGrants(
    userId
  );
  if (grants.isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: [1, 2].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-full rounded" }, i)) });
  }
  if (!grants.data || grants.data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        className: "text-xs text-muted-foreground italic py-2",
        "data-ocid": "escrow.grants.empty_state",
        children: "No recovery grants on record"
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "overflow-x-auto rounded border border-border",
      "data-ocid": "escrow.grants.table",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/40 border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider", children: "Grant ID" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider", children: "Requested By" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider", children: "Timestamp" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider", children: "Outcome" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: grants.data.map((grant) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            className: "hover:bg-muted/20 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 font-mono text-muted-foreground", children: grant.grantId.toString() }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                PrincipalDisplay,
                {
                  principal: principalToString(grant.requestingAdmin)
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 font-mono text-muted-foreground whitespace-nowrap", children: formatNanoTs(grant.grantTimestamp) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `font-medium ${grant.accessOutcome === "granted" ? "text-green-600" : "text-muted-foreground"}`,
                  children: grant.accessOutcome
                }
              ) })
            ]
          },
          grant.grantId.toString()
        )) })
      ] })
    }
  );
}
function InitiateRecoveryDialog({ user, onClose }) {
  const [deviceId, setDeviceId] = reactExports.useState("");
  const [reason, setReason] = reactExports.useState("");
  const initiateRecovery = useInitiateKeyRecovery();
  if (!user) return null;
  const userIdText = typeof user.userId.toText === "function" ? user.userId.toText() : String(user.userId);
  async function handleSubmit() {
    if (!user) return;
    if (reason.trim().length < 10) {
      ue.error("Reason must be at least 10 characters");
      return;
    }
    try {
      await initiateRecovery.mutateAsync({
        targetUserId: user.userId,
        targetDeviceId: deviceId.trim() || "default",
        reason: reason.trim(),
        orgId: user.orgId ?? null
      });
      ue.success("Recovery request submitted — a second admin must approve");
      onClose();
    } catch (err) {
      ue.error(
        err instanceof Error ? err.message : "Failed to initiate recovery"
      );
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      open: !!user,
      onOpenChange: (open) => {
        if (!open) onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DialogContent,
        {
          className: "sm:max-w-md",
          "data-ocid": "escrow.initiate_recovery.dialog",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2 font-mono text-sm uppercase tracking-widest", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { className: "h-4 w-4 text-amber-500", "aria-hidden": "true" }),
                "Initiate Key Recovery"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "text-xs text-muted-foreground", children: "Submit a recovery request for the selected user. A second authorized admin must approve before access is granted." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2.5 rounded border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TriangleAlert,
                {
                  className: "mt-0.5 h-4 w-4 shrink-0 text-amber-500",
                  "aria-hidden": "true"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs leading-snug", children: "This action requires a second authorized admin to approve. All details are permanently audited." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs font-mono uppercase tracking-widest text-muted-foreground", children: "Target User" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "p",
                  {
                    className: "font-mono text-xs text-foreground break-all",
                    title: userIdText,
                    children: userIdText
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Label,
                  {
                    htmlFor: "device-id",
                    className: "text-xs font-mono uppercase tracking-widest text-muted-foreground",
                    children: "Device ID"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    id: "device-id",
                    value: deviceId,
                    onChange: (e) => setDeviceId(e.target.value),
                    placeholder: "device-id (leave blank for default)",
                    className: "font-mono text-xs h-8",
                    "data-ocid": "escrow.initiate_recovery.device_input"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Label,
                  {
                    htmlFor: "reason",
                    className: "text-xs font-mono uppercase tracking-widest text-muted-foreground",
                    children: [
                      "Reason ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Textarea,
                  {
                    id: "reason",
                    value: reason,
                    onChange: (e) => setReason(e.target.value),
                    placeholder: "Provide a detailed justification for this recovery request (minimum 10 characters)",
                    rows: 3,
                    className: "font-mono text-xs resize-none",
                    "data-ocid": "escrow.initiate_recovery.reason_textarea"
                  }
                ),
                reason.length > 0 && reason.trim().length < 10 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "p",
                  {
                    className: "text-xs text-destructive",
                    "data-ocid": "escrow.initiate_recovery.reason.field_error",
                    children: "Reason must be at least 10 characters"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  onClick: onClose,
                  "data-ocid": "escrow.initiate_recovery.cancel_button",
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  size: "sm",
                  className: "bg-amber-600 hover:bg-amber-700 text-white border-0",
                  onClick: handleSubmit,
                  disabled: initiateRecovery.isPending || reason.trim().length < 10,
                  "data-ocid": "escrow.initiate_recovery.submit_button",
                  children: initiateRecovery.isPending ? "Submitting..." : "Submit Recovery Request"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function ApproveRecoveryDialog({
  request,
  onClose,
  onApproved
}) {
  const approveRecovery = useApproveKeyRecovery();
  if (!request) return null;
  const targetText = typeof request.targetUserId.toText === "function" ? request.targetUserId.toText() : String(request.targetUserId);
  const initiatorText = typeof request.initiatingAdmin.toText === "function" ? request.initiatingAdmin.toText() : String(request.initiatingAdmin);
  async function handleApprove() {
    if (!request) return;
    try {
      await approveRecovery.mutateAsync(request.id);
      ue.success(
        "Recovery approved — retrieving key via vetKeys transport..."
      );
      try {
        onApproved == null ? void 0 : onApproved();
      } catch (_e) {
      }
      onClose();
    } catch (err) {
      ue.error(
        err instanceof Error ? err.message : "Failed to approve recovery"
      );
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      open: !!request,
      onOpenChange: (open) => {
        if (!open) onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DialogContent,
        {
          className: "sm:max-w-md",
          "data-ocid": "escrow.approve_recovery.dialog",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2 font-mono text-sm uppercase tracking-widest", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  CircleCheckBig,
                  {
                    className: "h-4 w-4 text-green-600",
                    "aria-hidden": "true"
                  }
                ),
                "Approve Key Recovery"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { className: "text-xs text-muted-foreground", children: [
                "Request #",
                request.id.toString(),
                " — review carefully before approving."
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30 mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-red-800 dark:text-red-200", children: "Warning: Initiating key recovery is a privileged operation logged permanently on the Internet Computer. Ensure you have proper authorization before proceeding." }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2.5 rounded border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TriangleAlert,
                {
                  className: "mt-0.5 h-4 w-4 shrink-0 text-amber-500",
                  "aria-hidden": "true"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs leading-snug", children: "You are authorizing key recovery. This action is permanent and immutably logged. You must be a different admin than the initiator." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Target Principal" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono mt-0.5 text-foreground break-all", children: targetText })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Initiated By" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono mt-0.5 text-foreground break-all", children: initiatorText })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Reason" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-foreground", children: request.reason })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Device" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono mt-0.5 text-foreground", children: request.targetDeviceId })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  onClick: onClose,
                  "data-ocid": "escrow.approve_recovery.cancel_button",
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  size: "sm",
                  className: "bg-amber-600 hover:bg-amber-700 text-white border-0",
                  onClick: handleApprove,
                  disabled: approveRecovery.isPending,
                  "data-ocid": "escrow.approve_recovery.confirm_button",
                  children: approveRecovery.isPending ? "Approving..." : "Approve Recovery"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function RejectRecoveryDialog({ request, onClose }) {
  const rejectRecovery = useRejectKeyRecovery();
  if (!request) return null;
  const targetText = typeof request.targetUserId.toText === "function" ? request.targetUserId.toText() : String(request.targetUserId);
  async function handleReject() {
    if (!request) return;
    try {
      await rejectRecovery.mutateAsync(request.id);
      ue.success("Recovery request rejected");
      onClose();
    } catch (err) {
      ue.error(
        err instanceof Error ? err.message : "Failed to reject recovery"
      );
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      open: !!request,
      onOpenChange: (open) => {
        if (!open) onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DialogContent,
        {
          className: "sm:max-w-sm",
          "data-ocid": "escrow.reject_recovery.dialog",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2 font-mono text-sm uppercase tracking-widest", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "h-4 w-4 text-destructive", "aria-hidden": "true" }),
                "Reject Recovery Request"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "text-xs text-muted-foreground", children: "Rejecting this request will permanently close it and log the action." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Target User" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono mt-0.5 text-foreground break-all", children: targetText })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Reason" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-foreground", children: request.reason })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  onClick: onClose,
                  "data-ocid": "escrow.reject_recovery.cancel_button",
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  className: "border-destructive text-destructive hover:bg-destructive/10",
                  onClick: handleReject,
                  disabled: rejectRecovery.isPending,
                  "data-ocid": "escrow.reject_recovery.confirm_button",
                  children: rejectRecovery.isPending ? "Rejecting..." : "Reject Request"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
const STATUS_FILTERS = [
  { value: null, label: "All" },
  { value: RecoveryRequestStatus.pending, label: "Pending" },
  { value: RecoveryRequestStatus.approved, label: "Approved" },
  { value: RecoveryRequestStatus.rejected, label: "Rejected" },
  { value: RecoveryRequestStatus.completed, label: "Completed" }
];
const SKEL_IDS = ["s1", "s2", "s3", "s4", "s5"];
function TableSkeleton({ cols }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: SKEL_IDS.map((sid) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b border-border", children: Array.from({ length: cols }).map((_, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-full rounded" }) }, i)
  )) }, sid)) });
}
function AdminKeyEscrowPage() {
  const [activeTab, setActiveTab] = reactExports.useState("users");
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [selectedUser, setSelectedUser] = reactExports.useState(
    null
  );
  const [initiateDialogUser, setInitiateDialogUser] = reactExports.useState(null);
  const [approveDialogRequest, setApproveDialogRequest] = reactExports.useState(null);
  const [rejectDialogRequest, setRejectDialogRequest] = reactExports.useState(null);
  const [requestStatusFilter, setRequestStatusFilter] = reactExports.useState(null);
  const [vetKeysExplanationOpen, setVetKeysExplanationOpen] = reactExports.useState(false);
  const [recoveredKeyState, setRecoveredKeyState] = reactExports.useState(null);
  const [showKeyExportModal, setShowKeyExportModal] = reactExports.useState(false);
  const [wizardRequest, setWizardRequest] = reactExports.useState(
    null
  );
  const [enrollConfirmUser, setEnrollConfirmUser] = reactExports.useState(
    null
  );
  const [transportKeyLoading, setTransportKeyLoading] = reactExports.useState(false);
  const enrollUserKeyEscrow = useEnrollUserKeyEscrow();
  const getEncryptedEscrowKey = useGetEncryptedEscrowKey();
  const statsQuery = useEscrowStats();
  const escrowedUsersQuery = useEscrowedUsers({
    orgId: void 0,
    afterUserId: void 0,
    limit: 20n
  });
  const recoveryRequestsQuery = useRecoveryRequests(null, requestStatusFilter);
  const stats = statsQuery.data;
  const filteredUsers = (escrowedUsersQuery.data ?? []).filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const uid = typeof u.userId.toText === "function" ? u.userId.toText() : String(u.userId);
    return uid.toLowerCase().includes(q) || (u.orgId ?? "").toLowerCase().includes(q);
  });
  const pendingCount = (recoveryRequestsQuery.data ?? []).filter(
    (r) => r.status === RecoveryRequestStatus.pending
  ).length;
  const hasMoreUsers = (escrowedUsersQuery.data ?? []).length === 20;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AdminLayout, { title: "KEY ESCROW MANAGEMENT", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground", children: "Manage encrypted key escrow and dual-control recovery operations" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            className: "flex w-full items-center justify-between px-4 py-3 text-left",
            onClick: () => setVetKeysExplanationOpen(!vetKeysExplanationOpen),
            "data-ocid": "escrow.vetkeys_explanation.toggle",
            "aria-expanded": vetKeysExplanationOpen,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-4 w-4" }),
                "How vetKeys Works — ICP Threshold Key Protocol"
              ] }),
              vetKeysExplanationOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "h-4 w-4 text-blue-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-4 w-4 text-blue-600" })
            ]
          }
        ),
        vetKeysExplanationOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-blue-200 px-4 py-3 dark:border-blue-800", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-2 text-sm text-blue-900 dark:text-blue-100", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 text-blue-500", children: "•" }),
            "vetKeys (Verifiable Encrypted Threshold Keys) is an ICP cryptographic protocol where encryption keys are derived by a threshold quorum of subnet nodes — no single node ever holds the raw key."
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 text-blue-500", children: "•" }),
            "Key derivation is deterministic: the same inputs always produce the same key, so escrowed keys can be reliably recovered."
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 text-blue-500", children: "•" }),
            "During recovery, the authorized admin's browser generates a temporary transport key pair. The canister encrypts the derived key under that transport public key. Only the admin's browser (holding the transport secret) can decrypt it."
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 text-blue-500", children: "•" }),
            "All recovery operations require dual authorization: two distinct admins must approve before any key material is delivered."
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 rounded-sm border border-amber-300 bg-amber-50 px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs font-medium text-black", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Security Notice:" }),
        " Recovery keys are delivered encrypted to the requesting admin’s browser via a one-time transport key. They are never stored by the canister or visible to any single node."
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-start gap-3 rounded-sm border-2 border-red-400 bg-red-50 p-4",
          role: "alert",
          "data-ocid": "escrow.security_banner",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Shield,
              {
                className: "mt-0.5 h-5 w-5 shrink-0 text-black",
                "aria-hidden": "true"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs font-bold uppercase tracking-widest text-black", children: "DUAL AUTHORIZATION REQUIRED" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs font-medium leading-relaxed text-black", children: "All key recovery operations require two authorized administrators and are permanently audited. No single node or administrator can access key material without dual approval." })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "group rounded-sm border border-blue-200 bg-blue-50 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px",
            "data-ocid": "escrow.stats.total_escrowed",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-blue-700", children: "Total Escrowed Users" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Users,
                  {
                    className: "h-4 w-4 shrink-0 text-blue-400",
                    "aria-hidden": "true"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 font-mono text-4xl font-bold leading-none tabular-nums text-blue-800", children: statsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-8 w-16 rounded" }) : ((stats == null ? void 0 : stats.totalEscrowed) ?? 0n).toString() })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "group rounded-sm border border-amber-200 bg-amber-50 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px",
            "data-ocid": "escrow.stats.pending_recoveries",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-amber-700", children: "Pending Recovery Requests" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Clock,
                  {
                    className: "h-4 w-4 shrink-0 text-amber-500",
                    "aria-hidden": "true"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 font-mono text-4xl font-bold leading-none tabular-nums text-amber-800", children: statsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-8 w-12 rounded" }) : ((stats == null ? void 0 : stats.pendingRecoveries) ?? 0n).toString() })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "group rounded-sm border border-green-200 bg-green-50 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px",
            "data-ocid": "escrow.stats.last_recovery",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-green-700", children: "Last Recovery Event" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ShieldCheck,
                  {
                    className: "h-4 w-4 shrink-0 text-green-500",
                    "aria-hidden": "true"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 font-mono text-sm font-semibold leading-snug text-green-800", children: statsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-8 w-32 rounded" }) : formatNanoTs(stats == null ? void 0 : stats.lastRecoveryTimestamp) })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-center gap-1 border-b border-border",
          role: "tablist",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": activeTab === "users",
                onClick: () => setActiveTab("users"),
                className: `px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${activeTab === "users" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`,
                "data-ocid": "escrow.users.tab",
                children: "Escrowed Users"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": activeTab === "requests",
                onClick: () => setActiveTab("requests"),
                className: `flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${activeTab === "requests" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`,
                "data-ocid": "escrow.requests.tab",
                children: [
                  "Recovery Requests",
                  pendingCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full bg-amber-500 px-1 font-mono text-[0.6rem] font-bold text-white", children: pendingCount })
                ]
              }
            )
          ]
        }
      ),
      activeTab === "users" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", "data-ocid": "escrow.users.panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative flex-1 max-w-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: "Search by principal or org...",
            className: "h-8 pl-3 font-mono text-xs",
            "data-ocid": "escrow.users.search_input"
          }
        ) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "overflow-x-auto rounded-sm border border-border",
            "data-ocid": "escrow.users.table",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/40 border-b border-border sticky top-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: [
                "Principal",
                "Organization",
                "Status",
                "Last Backed Up",
                "Devices",
                "Actions"
              ].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  className: "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                  children: h
                },
                h
              )) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: escrowedUsersQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 6 }) : filteredUsers.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "td",
                {
                  colSpan: 6,
                  className: "px-4 py-12 text-center",
                  "data-ocid": "escrow.users.empty_state",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Key,
                      {
                        className: "mx-auto mb-3 h-8 w-8 text-muted-foreground/30",
                        "aria-hidden": "true"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-muted-foreground uppercase tracking-widest", children: searchQuery ? "No users match your search" : "No users with escrowed keys have been registered." })
                  ]
                }
              ) }) : filteredUsers.map((user, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "tr",
                {
                  className: "transition-colors hover:bg-muted/20",
                  "data-ocid": `escrow.users.item.${idx + 1}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      PrincipalDisplay,
                      {
                        principal: principalToString(user.userId)
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: user.orgId ?? "—" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EscrowStatusBadge, { status: user.escrowStatus }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap", children: formatNanoTs(user.lastBackedUp) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-xs text-foreground tabular-nums", children: user.deviceCount.toString() }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          variant: "outline",
                          size: "sm",
                          className: "h-7 text-xs px-2.5",
                          onClick: () => setSelectedUser(user),
                          "data-ocid": `escrow.users.view_details.${idx + 1}`,
                          children: "View Details"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          size: "sm",
                          className: "h-7 text-xs px-2.5 bg-amber-600 hover:bg-amber-700 text-white border-0",
                          onClick: () => setInitiateDialogUser(user),
                          "data-ocid": `escrow.users.initiate_recovery.${idx + 1}`,
                          children: "Initiate Recovery"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          variant: "outline",
                          size: "sm",
                          className: "h-7 text-xs px-2.5",
                          onClick: () => {
                            const uid = typeof user.userId.toText === "function" ? user.userId.toText() : String(user.userId);
                            setEnrollConfirmUser(uid);
                          },
                          "data-ocid": `escrow.users.enroll_vetkeys.${idx + 1}`,
                          children: "Enroll in vetKeys"
                        }
                      )
                    ] }) })
                  ]
                },
                `${String(user.userId)}-${idx}`
              )) })
            ] })
          }
        ),
        hasMoreUsers && !escrowedUsersQuery.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "outline",
            size: "sm",
            className: "font-mono text-xs uppercase tracking-widest",
            "data-ocid": "escrow.users.load_more_button",
            children: "Load More"
          }
        ) })
      ] }),
      activeTab === "requests" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", "data-ocid": "escrow.requests.panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "fieldset",
          {
            className: "flex flex-wrap gap-1.5",
            "aria-label": "Filter by status",
            children: STATUS_FILTERS.map(({ value, label }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setRequestStatusFilter(value),
                className: `rounded-sm border px-3 py-1 font-mono text-xs uppercase tracking-widest transition-colors ${requestStatusFilter === value ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`,
                "data-ocid": `escrow.requests.filter.${label.toLowerCase()}`,
                children: label
              },
              label
            ))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "overflow-x-auto rounded-sm border border-border",
            "data-ocid": "escrow.requests.table",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/40 border-b border-border sticky top-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: [
                "ID",
                "Target User",
                "Initiated By",
                "Reason",
                "Status",
                "Created",
                "Actions"
              ].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  className: "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                  children: h
                },
                h
              )) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: recoveryRequestsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 7 }) : (recoveryRequestsQuery.data ?? []).length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "td",
                {
                  colSpan: 7,
                  className: "px-4 py-12 text-center",
                  "data-ocid": "escrow.requests.empty_state",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Shield,
                      {
                        className: "mx-auto mb-3 h-8 w-8 text-muted-foreground/30",
                        "aria-hidden": "true"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-muted-foreground uppercase tracking-widest", children: "No pending recovery requests." })
                  ]
                }
              ) }) : (recoveryRequestsQuery.data ?? []).map((req, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "tr",
                {
                  className: "transition-colors hover:bg-muted/20",
                  "data-ocid": `escrow.requests.item.${idx + 1}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: [
                      "#",
                      req.id.toString()
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      PrincipalDisplay,
                      {
                        principal: principalToString(req.targetUserId)
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      PrincipalDisplay,
                      {
                        principal: principalToString(req.initiatingAdmin)
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 max-w-[200px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: "text-xs text-muted-foreground line-clamp-2",
                        title: req.reason,
                        children: req.reason.length > 50 ? `${req.reason.slice(0, 50)}…` : req.reason
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RecoveryStatusBadge, { status: req.status }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap", children: formatNanoTs(req.createdAt) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: req.status === RecoveryRequestStatus.pending && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          variant: "outline",
                          size: "sm",
                          className: "h-7 text-xs px-2.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400",
                          onClick: () => setApproveDialogRequest(req),
                          "data-ocid": `escrow.requests.approve.${idx + 1}`,
                          children: "Approve"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          variant: "outline",
                          size: "sm",
                          className: "h-7 text-xs px-2.5 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400",
                          onClick: () => setWizardRequest(req),
                          "data-ocid": `escrow.requests.wizard.${idx + 1}`,
                          children: "Recovery Wizard"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          variant: "outline",
                          size: "sm",
                          className: "h-7 text-xs px-2.5 text-muted-foreground hover:border-foreground/30",
                          onClick: () => setRejectDialogRequest(req),
                          "data-ocid": `escrow.requests.reject.${idx + 1}`,
                          children: "Reject"
                        }
                      )
                    ] }) })
                  ]
                },
                req.id.toString()
              )) })
            ] })
          }
        )
      ] })
    ] }),
    selectedUser && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "fixed inset-y-0 right-0 z-50 w-96 border-l border-border bg-background shadow-xl flex flex-col",
        "data-ocid": "escrow.user_detail.panel",
        role: "complementary",
        "aria-label": "User escrow details",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border p-4 bg-card", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-mono text-xs font-bold uppercase tracking-widest text-foreground", children: "User Escrow Details" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground mt-0.5", children: "Read-only · All actions audited" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setSelectedUser(null),
                "aria-label": "Close panel",
                className: "rounded-sm p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                "data-ocid": "escrow.user_detail.close_button",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { size: 16, "aria-hidden": "true" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground", children: "Principal" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  PrincipalDisplay,
                  {
                    principal: principalToString(selectedUser.userId)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground", children: "Organization" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-foreground", children: selectedUser.orgId ?? "—" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground", children: "Status" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EscrowStatusBadge, { status: selectedUser.escrowStatus }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground", children: "Devices" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs font-bold text-foreground", children: selectedUser.deviceCount.toString() })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground", children: "Last Backed Up" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-foreground", children: formatNanoTs(selectedUser.lastBackedUp) })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-1", children: "Recovery Grants" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                EscrowGrantsSection,
                {
                  userId: selectedUser.userId
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border p-4 bg-card", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "button",
              className: "w-full bg-amber-600 hover:bg-amber-700 text-white border-0 font-mono text-xs uppercase tracking-widest",
              onClick: () => {
                setInitiateDialogUser(selectedUser);
                setSelectedUser(null);
              },
              "data-ocid": "escrow.user_detail.initiate_recovery_button",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { className: "mr-2 h-3.5 w-3.5", "aria-hidden": "true" }),
                "Initiate Recovery"
              ]
            }
          ) })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      InitiateRecoveryDialog,
      {
        user: initiateDialogUser,
        onClose: () => setInitiateDialogUser(null)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ApproveRecoveryDialog,
      {
        request: approveDialogRequest,
        onClose: () => setApproveDialogRequest(null),
        onApproved: async () => {
          if (!approveDialogRequest) return;
          const targetText = typeof approveDialogRequest.targetUserId.toText === "function" ? approveDialogRequest.targetUserId.toText() : String(approveDialogRequest.targetUserId);
          try {
            setTransportKeyLoading(true);
            const { publicKeyBytes } = await generateTransportKeyPair();
            const encryptedKeyBytes = await getEncryptedEscrowKey.mutateAsync({
              targetPrincipal: targetText,
              transportPublicKey: publicKeyBytes
            });
            setRecoveredKeyState({
              rawBytes: encryptedKeyBytes,
              targetPrincipal: targetText,
              recoveryId: String(approveDialogRequest.id)
            });
            setShowKeyExportModal(true);
            setApproveDialogRequest(null);
          } catch (err) {
            console.error("[vetKeys] Failed to retrieve encrypted key:", err);
            ue.error(
              "Recovery approved but key retrieval failed. Contact your system administrator."
            );
          } finally {
            setTransportKeyLoading(false);
          }
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      RejectRecoveryDialog,
      {
        request: rejectDialogRequest,
        onClose: () => setRejectDialogRequest(null)
      }
    ),
    enrollConfirmUser && /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: true, onOpenChange: () => setEnrollConfirmUser(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { "data-ocid": "escrow.enroll_vetkeys.dialog", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Enroll in vetKeys Escrow" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "This will enroll the user in the ICP vetKeys key escrow system, allowing their encryption key to be deterministically recovered via dual-control authorization." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-amber-800 dark:text-amber-200", children: [
        "Principal:",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono text-xs", children: enrollConfirmUser })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "outline",
            onClick: () => setEnrollConfirmUser(null),
            "data-ocid": "escrow.enroll_vetkeys.cancel_button",
            children: "Cancel"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            onClick: async () => {
              try {
                await enrollUserKeyEscrow.mutateAsync(enrollConfirmUser);
                ue.success("User enrolled in vetKeys escrow");
                setEnrollConfirmUser(null);
              } catch (err) {
                ue.error(
                  err instanceof Error ? err.message : "Enrollment failed"
                );
              }
            },
            disabled: enrollUserKeyEscrow.isPending,
            "data-ocid": "escrow.enroll_vetkeys.confirm_button",
            children: enrollUserKeyEscrow.isPending ? "Enrolling..." : "Confirm Enrollment"
          }
        )
      ] })
    ] }) }),
    transportKeyLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 shadow-xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-8 w-8 animate-pulse text-blue-500" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs uppercase tracking-widest text-muted-foreground", children: "Retrieving encrypted key via vetKeys transport..." })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SecureKeyExportModal,
      {
        isOpen: showKeyExportModal,
        onClose: () => {
          setShowKeyExportModal(false);
          setRecoveredKeyState(null);
        },
        rawKeyBytes: (recoveredKeyState == null ? void 0 : recoveredKeyState.rawBytes) ?? null,
        targetPrincipal: (recoveredKeyState == null ? void 0 : recoveredKeyState.targetPrincipal) ?? "",
        recoveryId: (recoveredKeyState == null ? void 0 : recoveredKeyState.recoveryId) ?? ""
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      RecoveryWizardDialog,
      {
        request: wizardRequest,
        onClose: () => setWizardRequest(null),
        onKeyDelivered: (rawBytes, targetPrincipal) => {
          setRecoveredKeyState({
            rawBytes,
            targetPrincipal,
            recoveryId: String((wizardRequest == null ? void 0 : wizardRequest.id) ?? "")
          });
          setShowKeyExportModal(true);
          setWizardRequest(null);
        },
        generateTransportKeyPair,
        getEncryptedEscrowKey: async (targetPrincipal, transportPubKeyHex) => {
          var _a;
          return getEncryptedEscrowKey.mutateAsync({
            targetPrincipal,
            transportPublicKey: new Uint8Array(
              ((_a = transportPubKeyHex.match(/.{1,2}/g)) == null ? void 0 : _a.map((h) => Number.parseInt(h, 16))) ?? []
            )
          });
        },
        getEscrowPublicKey: async () => Promise.resolve(null)
      }
    )
  ] });
}
export {
  AdminKeyEscrowPage as default
};
