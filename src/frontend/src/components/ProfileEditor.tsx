import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useCrypto } from "@/context/crypto-context";
import {
  getLocalAvatarDataUrl,
  getLocalAvatarKey,
  getLocalDisplayName,
  removeLocalAvatar,
  setLocalAvatarDataUrl,
  setLocalDisplayName,
  useUpdateProfile,
  useUserProfile,
} from "@/hooks/use-profiles";
import {
  deriveDisplayNameKey,
  encryptMessage,
  exportPublicKey,
} from "@/lib/crypto";
import {
  Check,
  Copy,
  ImagePlus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "./UserAvatar";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function ProfileEditor() {
  const { principal } = useAuth();
  const { keyPair, isReady } = useCrypto();
  const { isLoading } = useUserProfile(principal);
  const updateProfile = useUpdateProfile();

  const principalText = principal?.toText() ?? "";

  // ── Display name ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Avatar ────────────────────────────────────────────────────────────────
  // existingDataUrl: the avatar currently stored in localStorage (already saved)
  const existingDataUrl = principalText
    ? getLocalAvatarDataUrl(principalText)
    : null;
  // pendingFile: a newly selected (not-yet-saved) file
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // pendingPreview: data URL for the pending file
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  // clearAvatar: user wants to remove the existing avatar
  const [clearAvatar, setClearAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(principalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, GIF, or WebP images are supported.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPendingPreview(dataUrl);
      setPendingFile(file);
      setClearAvatar(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveAvatar = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setClearAvatar(true);
  };

  const handleCancelPending = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setClearAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Current display URL for the avatar preview area
  const previewUrl = pendingPreview ?? (clearAvatar ? null : existingDataUrl);
  const hasAnyAvatar = !!previewUrl;
  const hasChanges = displayName.trim() || pendingFile !== null || clearAvatar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!keyPair || !isReady) return;
    if (!hasChanges) return;

    try {
      setUploadProgress(0);

      // ── Export ECDH public key (always required)
      const pubBytes = await exportPublicKey(keyPair.publicKey);

      // ── Encrypt display name if provided
      let encryptedDisplayName: Uint8Array | undefined;
      if (name) {
        const aesKey = await deriveDisplayNameKey(principal!);
        encryptedDisplayName = await encryptMessage(aesKey, name);
      }

      // ── Handle avatar
      let encryptedAvatarKey: string | undefined;

      if (pendingFile && pendingPreview) {
        // Simulate upload progress for the file-reading step
        setUploadProgress(30);
        // Store the data URL in localStorage
        setLocalAvatarDataUrl(principalText, pendingPreview);
        setUploadProgress(80);
        // Write the localStorage key as the encryptedAvatarKey so the backend
        // knows this user has an avatar (key = localStorage key on this device)
        encryptedAvatarKey = getLocalAvatarKey(principalText);
        setUploadProgress(100);
      } else if (clearAvatar) {
        removeLocalAvatar(principalText);
        // Empty string signals "remove" to the backend
        encryptedAvatarKey = "";
      }

      // Must always send ecdhPublicKey — backend requires it
      await updateProfile.mutateAsync({
        encryptedDisplayName,
        ecdhPublicKey: pubBytes,
        ...(encryptedAvatarKey !== undefined ? { encryptedAvatarKey } : {}),
      });

      toast.success("Profile updated successfully");
      // Cache plaintext display name locally so it can be shown everywhere
      if (name && principalText) {
        setLocalDisplayName(principalText, name);
      }
      setDisplayName("");
      setPendingFile(null);
      setPendingPreview(null);
      setClearAvatar(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadProgress(0);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to update profile. Please try again.";
      toast.error(message);
    }
  };

  const isUploading =
    updateProfile.isPending && uploadProgress > 0 && uploadProgress < 100;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      data-ocid="profile.form"
    >
      {/* Identity verified badge */}
      <div className="flex items-center gap-2">
        <ShieldCheck size={15} className="text-primary flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          Your identity is verified via
        </span>
        <Badge variant="outline" className="text-xs font-medium">
          Internet Identity
        </Badge>
      </div>

      {/* Avatar upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Profile Picture</Label>
        <div className="flex items-start gap-4">
          {/* Preview circle */}
          <div className="relative flex-shrink-0">
            <div
              className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center"
              data-ocid="profile.avatar_preview"
            >
              {hasAnyAvatar ? (
                <img
                  src={previewUrl!}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserAvatar principal={principalText} size={64} />
              )}
            </div>
            {/* Upload button overlay */}
            <button
              type="button"
              aria-label="Change profile picture"
              data-ocid="profile.avatar_change_button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ImagePlus size={12} aria-hidden />
            </button>
          </div>

          {/* Actions beside the preview */}
          <div className="flex flex-col gap-2 justify-center min-h-[64px]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              data-ocid="profile.avatar_upload_button"
              className="flex items-center gap-2 text-xs h-8"
            >
              <Upload size={13} />
              {pendingFile
                ? "Change image"
                : existingDataUrl && !clearAvatar
                  ? "Replace image"
                  : "Upload image"}
            </Button>

            {pendingFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelPending}
                className="flex items-center gap-2 text-xs h-8 text-muted-foreground"
                data-ocid="profile.avatar_cancel_button"
              >
                Cancel
              </Button>
            )}

            {existingDataUrl && !clearAvatar && !pendingFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                data-ocid="profile.avatar_remove_button"
                className="flex items-center gap-2 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={13} />
                Remove
              </Button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_AVATAR_TYPES.join(",")}
            className="sr-only"
            aria-hidden
            data-ocid="profile.avatar_file_input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </div>

        {/* Pending file name */}
        {pendingFile && (
          <p className="text-xs text-muted-foreground pl-0.5">
            Ready to save:{" "}
            <span className="font-medium text-foreground">
              {pendingFile.name}
            </span>{" "}
            ({(pendingFile.size / 1024).toFixed(0)} KB)
          </p>
        )}

        {/* Upload progress bar */}
        {isUploading && (
          <div className="space-y-1" data-ocid="profile.upload_loading_state">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Saving image…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          JPG, PNG, GIF or WebP · Max 5 MB · Stored locally on this device
        </p>
      </div>

      {/* Principal ID */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Principal ID</Label>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 min-w-0 font-mono text-xs text-foreground bg-muted/60 border border-border rounded-md px-3 py-2 break-all"
            data-ocid="profile.principal_id"
          >
            {isLoading ? <Skeleton className="h-3 w-48" /> : principalText}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy principal ID"
            data-ocid="profile.copy_principal"
            className="flex-shrink-0 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
          >
            {copied ? (
              <Check size={14} className="text-primary" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <Label htmlFor="display-name" className="text-sm font-medium">
          Display Name
        </Label>
        <Input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={
            isLoading
              ? "Loading\u2026"
              : (getLocalDisplayName(principalText) ?? "Enter a display name")
          }
          maxLength={64}
          disabled={!isReady || isLoading}
          data-ocid="profile.display_name_input"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Your display name is encrypted before leaving this device.
        </p>
      </div>

      <Button
        type="submit"
        disabled={!hasChanges || !isReady || updateProfile.isPending}
        data-ocid="profile.save_button"
        className="w-full sm:w-auto"
      >
        {updateProfile.isPending ? "Saving\u2026" : "Save Changes"}
      </Button>
    </form>
  );
}
