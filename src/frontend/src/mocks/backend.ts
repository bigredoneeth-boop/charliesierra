import type { backendInterface } from "../backend";
import { AuditEventType } from "../types/audit";
import {
  CompartmentLabel,
  ConversationKind,
  DataResidency,
  Error_,
  MessageType,
} from "../backend";
import { Principal } from "@icp-sdk/core/principal";

const alice = Principal.fromText("2vxsx-fae");
const bob = Principal.fromText("aaaaa-aa");

const sampleEcdhKey = new Uint8Array(32).fill(1);
const sampleEncrypted = new Uint8Array(16).fill(2);

const aliceProfile = {
  id: alice,
  ecdhPublicKey: sampleEcdhKey,
  encryptedAvatarKey: undefined,
  encryptedDisplayName: sampleEncrypted,
  registeredAt: BigInt(Date.now()) * BigInt(1_000_000),
  lastSeen: BigInt(Date.now()) * BigInt(1_000_000),
};

const bobProfile = {
  id: bob,
  ecdhPublicKey: sampleEcdhKey,
  encryptedAvatarKey: undefined,
  encryptedDisplayName: sampleEncrypted,
  registeredAt: BigInt(Date.now()) * BigInt(1_000_000),
  lastSeen: BigInt(Date.now()) * BigInt(1_000_000),
};

const directConversation = {
  id: BigInt(1),
  members: [alice, bob],
  lastMessageAt: BigInt(Date.now()) * BigInt(1_000_000),
  kind: ConversationKind.direct,
  createdAt: BigInt(Date.now() - 86400000) * BigInt(1_000_000),
  createdBy: alice,
  encryptedName: undefined,
  discoverable: false,
  displayName: undefined,
  description: undefined,
  category: undefined,
};

const groupConversation = {
  id: BigInt(2),
  members: [alice, bob],
  lastMessageAt: BigInt(Date.now() - 3600000) * BigInt(1_000_000),
  kind: ConversationKind.group,
  createdAt: BigInt(Date.now() - 172800000) * BigInt(1_000_000),
  createdBy: alice,
  encryptedName: sampleEncrypted,
  discoverable: false,
  displayName: undefined,
  description: undefined,
  category: undefined,
};

const sampleMessage = {
  id: BigInt(1),
  ttlSeconds: undefined,
  encryptedContent: sampleEncrypted,
  isDeleted: false,
  sender: alice,
  sentAt: BigInt(Date.now() - 60000) * BigInt(1_000_000),
  messageType: MessageType.text,
  conversationId: BigInt(1),
  readBy: [{ userId: alice, readAt: BigInt(Date.now()) * BigInt(1_000_000) }],
};

const sampleMessage2 = {
  id: BigInt(2),
  ttlSeconds: undefined,
  encryptedContent: sampleEncrypted,
  isDeleted: false,
  sender: bob,
  sentAt: BigInt(Date.now() - 30000) * BigInt(1_000_000),
  messageType: MessageType.text,
  conversationId: BigInt(1),
  readBy: [],
};

export const mockBackend: backendInterface = {
  addDevice: async () => ({ __kind__: "ok", ok: { deviceId: "device-1", deviceLabel: "My Device", publicKey: sampleEcdhKey, registeredAt: BigInt(Date.now()) * BigInt(1_000_000), lastSeen: BigInt(Date.now()) * BigInt(1_000_000) } }),
  listMyDevices: async () => [],
  addAdmin: async () => ({ __kind__: "ok", ok: null }),
  revokeDevice: async () => ({ __kind__: "ok", ok: null }),
  generateDeviceSyncToken: async () => ({ __kind__: "ok", ok: "sync-token-123" }),
  redeemDeviceSyncToken: async () => ({ __kind__: "ok", ok: { deviceId: "device-2", deviceLabel: "New Device", publicKey: sampleEcdhKey, registeredAt: BigInt(Date.now()) * BigInt(1_000_000), lastSeen: BigInt(Date.now()) * BigInt(1_000_000) } }),
  listPublicGroups: async () => [],
  submitJoinRequest: async () => ({ __kind__: "ok", ok: { requestId: "req-1", conversationId: BigInt(2), requesterId: alice, message: undefined, status: "pending" as any, createdAt: BigInt(Date.now()) * BigInt(1_000_000) } }),
  getGroupJoinRequests: async () => ({ __kind__: "ok", ok: [] }),
  approveJoinRequest: async () => ({ __kind__: "ok", ok: null }),
  denyJoinRequest: async () => ({ __kind__: "ok", ok: null }),
  addConversationMember: async () => ({ __kind__: "ok", ok: null }),
  clearTypingIndicator: async () => undefined,
  createDirectConversation: async () => ({
    __kind__: "ok",
    ok: directConversation,
  }),
  createGroupConversation: async () => ({
    __kind__: "ok",
    ok: groupConversation,
  }),
  deleteAttachment: async () => ({ __kind__: "ok", ok: null }),
  getAuditLog: async () => ({
    __kind__: "ok",
    ok: [
      {
        id: BigInt(1),
        targetPrincipal: bob,
        encryptedDetails: undefined,
        timestamp: BigInt(Date.now()) * BigInt(1_000_000),
        actorPrincipal: alice,
        eventType: AuditEventType.userRegistered,
      },
    ],
  }),
  getConversation: async () => directConversation,
  getMessageAttachments: async () => [],
  getMessages: async () => ({
    __kind__: "ok",
    ok: [sampleMessage, sampleMessage2],
  }),
  getTypingIndicators: async () => [],
  getUserProfile: async () => aliceProfile,
  getUserProfiles: async () => [aliceProfile, bobProfile],
  isAdminCheck: async () => true,
  listConversations: async () => [directConversation, groupConversation],
  markMessageRead: async () => ({ __kind__: "ok", ok: null }),
  registerAttachment: async () => ({
    __kind__: "ok",
    ok: {
      id: BigInt(1),
      messageId: BigInt(1),
      mimeType: "image/png",
      encryptedSizeBytes: BigInt(1024),
      storageKey: "sample-key",
      uploader: alice,
      uploadedAt: BigInt(Date.now()) * BigInt(1_000_000),
    },
  }),
  registerUser: async () => ({ __kind__: "ok", ok: aliceProfile }),
  removeAdmin: async () => ({ __kind__: "ok", ok: null }),
  listAdmins: async () => ({ __kind__: "ok", ok: [alice] }),
  removeConversationMember: async () => ({ __kind__: "ok", ok: null }),
  revokeKeyEscrow: async () => ({ __kind__: "ok", ok: null }),
  sendMessage: async () => ({ __kind__: "ok", ok: sampleMessage }),
  setTypingIndicator: async () => undefined,
  touchPresence: async () => undefined,
  updateUserProfile: async () => ({ __kind__: "ok", ok: aliceProfile }),
  adminGetEscrowGrants: async () => ({ __kind__: "ok", ok: [] }),
  adminGrantEscrowAccess: async () => ({
    __kind__: "ok",
    ok: {
      grantTimestamp: BigInt(Date.now()) * BigInt(1_000_000),
      grantId: BigInt(1),
      accessOutcome: "granted",
      targetDeviceId: "device-1",
      reason: "legal request",
      requestingAdmin: alice,
      targetUserId: bob,
    },
  }),
  disableGroupRetention: async () => ({ __kind__: "ok", ok: null }),
  enableGroupRetention: async () => ({ __kind__: "ok", ok: null }),
  enrollKeyEscrow: async () => ({ __kind__: "ok", ok: null }),
  exportAuditLog: async () => ({ __kind__: "ok", ok: "[]" }),
  getGroupRetentionPolicy: async () => ({
    __kind__: "ok",
    ok: {
      retentionEnabled: false,
      enabledAt: undefined,
      enabledBy: undefined,
      convId: BigInt(1),
    },
  }),
  getMyEscrowStatus: async () => [],
  getRetentionMetadata: async () => ({ __kind__: "ok", ok: [] }),
  exportConfigBundle: async () => ({
    __kind__: "ok",
    ok: {
      compartmentMappings: [],
      adminPrincipals: [alice],
      exportedAt: BigInt(Date.now()) * BigInt(1_000_000),
      exportedBy: alice,
      subnetPrincipal: undefined,
      canisters: "{}",
      groupRetentionPolicies: [],
      residencyLabel: DataResidency.global,
    },
  }),
  getDeploymentInfo: async () => ({
    lastUpdated: BigInt(Date.now()) * BigInt(1_000_000),
    subnetPrincipal: undefined,
    canisters: "{}",
    nodeCount: undefined,
    cyclesCostMultiplier: undefined,
    residencyLabel: DataResidency.global,
  }),
  getGroupCompartment: async () => CompartmentLabel.unclassified,
  setGroupCompartment: async () => ({ __kind__: "ok", ok: null }),
  setSovereignConfig: async () => ({
    __kind__: "ok",
    ok: {
      lastUpdated: BigInt(Date.now()) * BigInt(1_000_000),
      subnetPrincipal: undefined,
      canisters: "{}",
      nodeCount: undefined,
      cyclesCostMultiplier: undefined,
      residencyLabel: DataResidency.global,
    },
  }),
  deleteGroupConversation: async () => ({ __kind__: "ok", ok: null }),
  deleteConversation: async () => ({ __kind__: "ok", ok: null }),
};
