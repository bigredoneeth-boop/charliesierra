/**
 * SecureKeyExportModal.tsx
 * Phase 2: Password-protected key export and guided re-encryption.
 * Key material is NEVER stored in plaintext — always AES-GCM encrypted
 * with user-provided password (PBKDF2-derived) before download.
 */
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileKey,
  Lock,
  RefreshCw,
  Shield,
  X,
} from "lucide-react";
import { useState } from "react";

interface SecureKeyExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawKeyBytes: Uint8Array | null;
  targetPrincipal: string;
  recoveryId: string;
}

function scorePassword(pwd: string): number {
  let score = 0;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

async function exportKeyWithPassword(
  rawKeyBytes: Uint8Array,
  password: string,
  metadata: { targetPrincipal: string; recoveryId: string },
): Promise<void> {
  const enc = new TextEncoder();
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));

  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const encryptedBytes = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    aesKey,
    new Uint8Array(rawKeyBytes),
  );

  const toBase64 = (buf: ArrayBuffer | Uint8Array): string => {
    const arr =
      buf instanceof Uint8Array ? buf : new Uint8Array(buf as ArrayBuffer);
    return btoa(String.fromCharCode(...arr));
  };

  const exportData = {
    version: "1",
    format: "charliesierra-key-export-v1",
    targetPrincipal: metadata.targetPrincipal,
    recoveryId: metadata.recoveryId,
    timestamp: new Date().toISOString(),
    salt: toBase64(saltBytes),
    iv: toBase64(ivBytes),
    encryptedKeyMaterial: toBase64(encryptedBytes),
    warning:
      "This file is encrypted with a user-provided password. No plaintext key material is stored.",
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const shortPrincipal = metadata.targetPrincipal.slice(0, 10);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  a.href = url;
  a.download = `charliesierra-key-recovery-${shortPrincipal}-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SecureKeyExportModal({
  isOpen,
  onClose,
  rawKeyBytes,
  targetPrincipal,
  recoveryId,
}: SecureKeyExportModalProps) {
  const [step, setStep] = useState<"password" | "success">("password");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showReencryptGuide, setShowReencryptGuide] = useState(false);
  const [showAccessGuide, setShowAccessGuide] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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
    "bg-green-500",
  ];

  const handleExport = async () => {
    if (!rawKeyBytes || !canExport) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportKeyWithPassword(rawKeyBytes, password, {
        targetPrincipal,
        recoveryId,
      });
      setStep("success");
    } catch {
      setExportError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-900 text-white p-6 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileKey className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold">Secure Key Export</h2>
              <p className="text-gray-300 text-sm">
                CharlieSierra Key Recovery — Phase 2
              </p>
            </div>
          </div>
          {step === "success" && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          {step === "password" && (
            <div className="space-y-6">
              {/* Security Warning */}
              <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">
                    SECURITY NOTICE
                  </p>
                  <p className="text-red-700 text-sm mt-1">
                    Key material will be encrypted before download.{" "}
                    <strong>Never share your password.</strong> There is no
                    password recovery. If you lose this password, the exported
                    key file cannot be decrypted.
                  </p>
                </div>
              </div>

              {/* Recovery Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Recovery ID:</span>
                  <span className="font-mono text-gray-800">
                    {recoveryId.slice(0, 20)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Principal:</span>
                  <span className="font-mono text-gray-800">
                    {targetPrincipal.slice(0, 20)}...
                  </span>
                </div>
              </div>

              {/* Password Entry */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="export-password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <Lock className="w-4 h-4 inline mr-1" />
                    Export Password
                  </label>
                  <input
                    id="export-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Minimum 12 characters"
                    autoComplete="new-password"
                    data-ocid="escrow.key_export.password_input"
                  />
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded ${
                              i < pwdScore
                                ? scoreColors[pwdScore]
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        {scoreLabels[pwdScore]}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="export-password-confirm"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="export-password-confirm"
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      confirmPwd.length > 0
                        ? pwdMatch
                          ? "border-green-400"
                          : "border-red-400"
                        : "border-gray-300"
                    }`}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    data-ocid="escrow.key_export.confirm_password_input"
                  />
                  {confirmPwd.length > 0 && !pwdMatch && (
                    <p className="text-xs text-red-600 mt-1">
                      Passwords do not match
                    </p>
                  )}
                </div>
              </div>

              {/* File warning */}
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                <strong>
                  This file is encrypted with your password. Store it securely.
                </strong>
              </div>

              {exportError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                  {exportError}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={!canExport || exporting}
                className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                data-ocid="escrow.key_export.submit_button"
              >
                <Download className="w-5 h-5" />
                {exporting
                  ? "Encrypting and Exporting..."
                  : "Export Encrypted Key File"}
              </button>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="bg-green-50 border border-green-300 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-800">
                    Key Recovery Completed Successfully
                  </p>
                  <p className="text-green-700 text-sm mt-1">
                    The encrypted key file has been downloaded. This recovery
                    event is permanently recorded in the audit log.
                  </p>
                </div>
              </div>

              {/* Audit Confirmation */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium text-gray-700 mb-2">
                  Audit Confirmation
                </p>
                <div className="flex justify-between">
                  <span className="text-gray-500">Recovery ID:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {recoveryId.slice(0, 24)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Principal:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {targetPrincipal.slice(0, 24)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Timestamp:</span>
                  <span className="text-gray-800 text-xs">
                    {new Date().toISOString()}
                  </span>
                </div>
              </div>

              {/* What's Next */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">
                  What's Next?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Re-encrypt Card */}
                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">
                        Re-encrypt Historical Messages
                      </h4>
                    </div>
                    <p className="text-sm text-blue-800 mb-3">
                      Use the recovered key to re-encrypt historical messages
                      for the affected user.
                    </p>
                    <ol className="text-xs text-blue-700 space-y-1 mb-3 list-decimal list-inside">
                      <li>Key export file downloaded above</li>
                      <li>Share securely with affected user</li>
                      <li>User imports key in device settings</li>
                      <li>Messages re-indexed and accessible</li>
                    </ol>
                    <button
                      type="button"
                      onClick={() => setShowReencryptGuide(true)}
                      className="w-full text-sm bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-3 rounded transition-colors"
                      data-ocid="escrow.key_export.reencrypt_guide_button"
                    >
                      Start Re-encryption Process
                    </button>
                  </div>

                  {/* Restore Access Card */}
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      <h4 className="font-medium text-green-900">
                        Restore User Access
                      </h4>
                    </div>
                    <p className="text-sm text-green-800 mb-3">
                      If the user has lost device access, follow steps to
                      restore messaging capability.
                    </p>
                    <ol className="text-xs text-green-700 space-y-1 mb-3 list-decimal list-inside">
                      <li>Verify identity via out-of-band channel</li>
                      <li>Provide encrypted key export to user</li>
                      <li>User re-pairs device using key file</li>
                      <li>Monitor audit logs for re-authentication</li>
                    </ol>
                    <button
                      type="button"
                      onClick={() => setShowAccessGuide(true)}
                      className="w-full text-sm bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-3 rounded transition-colors"
                      data-ocid="escrow.key_export.access_guide_button"
                    >
                      View Access Restoration Guide
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Re-encryption Guide Modal */}
      {showReencryptGuide && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                Re-encryption Process — Phase 2 Guidance
              </h3>
              <button
                type="button"
                onClick={() => setShowReencryptGuide(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800 mb-4">
              <strong>Notice:</strong> Full automatic re-encryption will be
              available in Phase 3. The following steps describe the manual
              process for Phase 2.
            </div>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-blue-700 flex-shrink-0">
                  1.
                </span>
                <span>
                  <strong>Secure Transfer:</strong> Transfer the encrypted key
                  export file to the affected user via a secure, out-of-band
                  channel (e.g., encrypted email, secure courier, or in-person).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-700 flex-shrink-0">
                  2.
                </span>
                <span>
                  <strong>User Import:</strong> The user opens CharlieSierra on
                  their device, navigates to Settings → Key Management → Import
                  Recovery Key, and selects the downloaded .json file.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-700 flex-shrink-0">
                  3.
                </span>
                <span>
                  <strong>Password Entry:</strong> The user enters the export
                  password you set during this recovery to decrypt the key
                  material locally.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-700 flex-shrink-0">
                  4.
                </span>
                <span>
                  <strong>Re-indexing:</strong> Once imported, the app will
                  re-decrypt historical messages using the restored key. This
                  may take several minutes for accounts with large message
                  histories.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-700 flex-shrink-0">
                  5.
                </span>
                <span>
                  <strong>Audit Verification:</strong> Monitor the audit logs to
                  confirm successful key import and message re-indexing events
                  for this user.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowReencryptGuide(false)}
              className="mt-6 w-full bg-gray-900 text-white font-medium py-2 px-4 rounded hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Access Restoration Guide Modal */}
      {showAccessGuide && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Access Restoration Guide
              </h3>
              <button
                type="button"
                onClick={() => setShowAccessGuide(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-green-700 flex-shrink-0">
                  1.
                </span>
                <span>
                  <strong>Identity Verification:</strong> Before providing any
                  key material, verify the user's identity through an
                  out-of-band channel (government ID, video call, or in-person
                  verification).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-green-700 flex-shrink-0">
                  2.
                </span>
                <span>
                  <strong>Provide Key Export:</strong> Transfer the encrypted
                  key file to the verified user using a secure channel. Document
                  this transfer in your organizational records.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-green-700 flex-shrink-0">
                  3.
                </span>
                <span>
                  <strong>Device Re-pairing:</strong> The user follows the
                  Device Re-pairing procedure in their account settings,
                  importing the recovery key file when prompted.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-green-700 flex-shrink-0">
                  4.
                </span>
                <span>
                  <strong>Access Restoration:</strong> After successful key
                  import, the user regains full access to their secure messaging
                  account, including historical messages.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-green-700 flex-shrink-0">
                  5.
                </span>
                <span>
                  <strong>Audit Monitoring:</strong> Monitor the audit logs for
                  the next 24–48 hours to confirm successful re-authentication.
                  Escalate any anomalies immediately.
                </span>
              </li>
            </ol>
            <div className="mt-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
              <strong>Security Reminder:</strong> All access restoration actions
              are permanently logged. Any suspicious activity should be reported
              to your security officer immediately.
            </div>
            <button
              type="button"
              onClick={() => setShowAccessGuide(false)}
              className="mt-4 w-full bg-gray-900 text-white font-medium py-2 px-4 rounded hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecureKeyExportModal;
