/**
 * RecoveryWizardDialog.tsx
 * Phase 2: 4-step dual-control recovery wizard for vetKeys key delivery.
 * Steps: Request Review → First Authorization → Second Authorization → Key Delivery
 * Government/military tone. All steps audited. No plaintext key material exposed.
 */
import {
  AlertTriangle,
  CheckCircle,
  Key,
  Loader2,
  Shield,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";

type WizardStep = 1 | 2 | 3 | 4;

interface RecoveryRequest {
  id: bigint;
  targetUserId: unknown;
  initiatingAdmin: unknown;
  reason: string;
  createdAt: bigint;
  approvedBy?: unknown;
}

interface RecoveryWizardDialogProps {
  request: RecoveryRequest | null;
  onClose: () => void;
  onKeyDelivered: (rawBytes: Uint8Array, targetPrincipal: string) => void;
  generateTransportKeyPair: () => Promise<{
    publicKeyBytes: Uint8Array;
    secretKey: unknown;
  }>;
  getEncryptedEscrowKey: (
    targetPrincipal: string,
    transportPubKeyHex: string,
  ) => Promise<unknown>;
  getEscrowPublicKey: () => Promise<unknown>;
}

function principalText(p: unknown): string {
  if (typeof p === "string") return p;
  if (p && typeof (p as { toText?: () => string }).toText === "function") {
    return (p as { toText: () => string }).toText();
  }
  return String(p);
}

function formatNano(ns: bigint): string {
  const ms = Number(ns / 1_000_000n);
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STEPS: { label: string; short: string }[] = [
  { label: "Recovery Requested", short: "Request" },
  { label: "First Authorization", short: "Auth 1" },
  { label: "Second Authorization", short: "Auth 2" },
  { label: "Key Delivery", short: "Delivery" },
];

function StepIndicator({
  currentStep,
}: {
  currentStep: WizardStep;
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((s, i) => {
        const stepNum = (i + 1) as WizardStep;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div
            key={s.short}
            className="flex-1 flex flex-col items-center relative"
          >
            {/* connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={`absolute top-4 left-1/2 w-full h-0.5 ${
                  isDone ? "bg-blue-500" : "bg-gray-200"
                }`}
                style={{ left: "50%" }}
              />
            )}
            {/* circle */}
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                isDone
                  ? "bg-blue-600 border-blue-600 text-white"
                  : isActive
                    ? "bg-blue-100 border-blue-500 text-blue-700"
                    : "bg-white border-gray-300 text-gray-400"
              }`}
            >
              {isDone ? <CheckCircle className="w-4 h-4" /> : stepNum}
            </div>
            <p
              className={`mt-1.5 text-[0.65rem] font-medium text-center ${
                isActive
                  ? "text-blue-700"
                  : isDone
                    ? "text-blue-500"
                    : "text-gray-400"
              }`}
            >
              {s.short}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function RecoveryWizardDialog({
  request,
  onClose,
  onKeyDelivered,
  generateTransportKeyPair,
  getEncryptedEscrowKey,
}: RecoveryWizardDialogProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transportKeyPair, setTransportKeyPair] = useState<{
    publicKeyBytes: Uint8Array;
    secretKey: unknown;
  } | null>(null);

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
      const kp = await generateTransportKeyPair();
      setTransportKeyPair(kp);
      setStep(3);
    } catch (e) {
      setError(
        `Failed to generate transport key pair: ${
          e instanceof Error ? e.message : String(e)
        }`,
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
      // Derive hex of transport public key for the canister call
      const hexPubKey = Array.from(transportKeyPair.publicKeyBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const encryptedResult = await getEncryptedEscrowKey(
        targetPrincipal,
        hexPubKey,
      );

      // encryptedResult is the encrypted key bytes from the canister
      let rawBytes: Uint8Array;
      if (encryptedResult instanceof Uint8Array) {
        rawBytes = encryptedResult;
      } else if (Array.isArray(encryptedResult)) {
        rawBytes = new Uint8Array(encryptedResult as number[]);
      } else {
        // Fallback: treat as empty — error will surface
        throw new Error("Unexpected key format from canister");
      }

      setStep(4);
      // Deliver to parent after brief render
      setTimeout(() => {
        onKeyDelivered(rawBytes, targetPrincipal);
      }, 800);
    } catch (e) {
      setError(
        `Key retrieval failed: ${
          e instanceof Error ? e.message : String(e)
        }. Contact your system administrator.`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-900 text-white p-6 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold">Key Recovery Wizard</h2>
              <p className="text-gray-300 text-sm">
                Dual-Control vetKeys Recovery — Phase 2
              </p>
            </div>
          </div>
          {step < 4 && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
              aria-label="Close wizard"
              data-ocid="escrow.wizard.close_button"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          <StepIndicator currentStep={step} />

          {/* Dual-control warning — always visible */}
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Dual authorization required.</strong> Neither admin can
              approve their own request. This action is{" "}
              <strong>permanent and audited.</strong> All steps are
              cryptographically recorded on the Internet Computer.
            </p>
          </div>

          {/* ── Step 1: Request Review ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900 text-base">
                Step 1 — Review Recovery Request
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-100 text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-500 font-medium">Recovery ID</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {String(request.id).slice(0, 24)}...
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-500 font-medium">Target User</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {targetPrincipal.slice(0, 20)}...
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-500 font-medium">
                    Requested By
                  </span>
                  <span className="font-mono text-gray-800 text-xs">
                    {requestedBy.slice(0, 20)}...
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-500 font-medium">Submitted</span>
                  <span className="text-gray-800 text-xs">
                    {formatNano(request.createdAt)}
                  </span>
                </div>
                <div className="px-4 py-2.5">
                  <span className="text-gray-500 font-medium block mb-1">
                    Reason
                  </span>
                  <p className="text-gray-800 text-xs">{request.reason}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStep2}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                data-ocid="escrow.wizard.step1_next_button"
              >
                Proceed to First Authorization
              </button>
            </div>
          )}

          {/* ── Step 2: First Authorization ── */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900 text-base">
                Step 2 — First Authorization
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-green-800">
                    First authorization recorded
                  </p>
                  <p className="text-green-700 mt-1">
                    The initial recovery request has been verified. A second,
                    distinct authorized admin must now provide the second
                    authorization to proceed.
                  </p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-red-800 mb-1">
                  ⚠ Second Authorizer Must Be a Different Admin
                </p>
                <p className="text-red-700">
                  The admin who initiated this request cannot provide the second
                  authorization. Confirm that a second authorized admin is
                  present and has reviewed this request before proceeding.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleStep3()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                data-ocid="escrow.wizard.step2_auth_button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Generating
                    Transport Keys...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" /> Confirm Second Authorization
                    &amp; Generate Transport Key
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Step 3: Second Authorization + Key Retrieve ── */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900 text-base">
                Step 3 — Retrieve Encrypted Key via vetKeys
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <p className="font-semibold text-blue-800">
                    Transport Key Generated
                  </p>
                </div>
                <p className="text-blue-700">
                  A one-time ephemeral transport key pair has been generated in
                  your browser. The canister will encrypt the recovered key
                  under this public key so only your browser can decrypt it.
                </p>
                {transportKeyPair && (
                  <p className="font-mono text-blue-600 text-xs mt-2 break-all">
                    Transport key fingerprint:{" "}
                    {Array.from(transportKeyPair.publicKeyBytes)
                      .slice(0, 8)
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .join(":")}
                    ...
                  </p>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <strong>Final confirmation required.</strong> Clicking the
                button below will contact the ICP vetKeys system, derive the
                user's escrowed key, encrypt it under your transport key, and
                deliver it to your browser. This action is{" "}
                <strong>irreversible and permanently audited.</strong>
              </div>
              <button
                type="button"
                onClick={() => void handleDeliverKey()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                data-ocid="escrow.wizard.step3_retrieve_button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Contacting
                    vetKeys System...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" /> Retrieve Encrypted Key — Final
                    Authorization
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Step 4: Key Delivered ── */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900 text-base">
                Step 4 — Key Delivery
              </h3>
              <div className="bg-green-50 border border-green-300 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-800">
                    Encrypted Key Delivered
                  </p>
                  <p className="text-green-700 text-sm mt-1">
                    The key has been securely delivered to your browser session.
                    The Secure Key Export dialog will open momentarily to allow
                    you to protect it with a password before downloading.
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Recovery ID:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {String(request.id).slice(0, 24)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Principal:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {targetPrincipal.slice(0, 20)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed:</span>
                  <span className="text-gray-800 text-xs">
                    {new Date().toISOString()}
                  </span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                The Secure Key Export dialog is opening. You will be prompted to
                set a strong password to encrypt the key before it is saved to
                your device.
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecoveryWizardDialog;
