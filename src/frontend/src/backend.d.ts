import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Result_2 = {
    __kind__: "ok";
    ok: SovereignConfig;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_5 = {
    __kind__: "ok";
    ok: Attachment;
} | {
    __kind__: "err";
    err: Error_;
};
export interface EscrowAccessGrant {
    grantTimestamp: Timestamp;
    grantId: bigint;
    accessOutcome: string;
    targetDeviceId: string;
    reason: string;
    requestingAdmin: UserId;
    targetUserId: UserId;
}
export interface AddDeviceRequest {
    publicKey: Uint8Array;
    deviceLabel: string;
    deviceId: string;
}
export type Result_4 = {
    __kind__: "ok";
    ok: MessagePublic;
} | {
    __kind__: "err";
    err: Error_;
};
export interface AuditEvent {
    id: bigint;
    targetPrincipal?: UserId;
    encryptedDetails?: Uint8Array;
    timestamp: Timestamp;
    actorPrincipal: UserId;
    eventType: AuditEventType;
}
export interface SendMessageRequest {
    ttlSeconds?: bigint;
    encryptedContent: Uint8Array;
    messageType: MessageType;
    conversationId: ConversationId;
    priority?: MessagePriority;
}
export interface GetAuditLogRequest {
    limit: bigint;
    filterEventType?: AuditEventType;
    afterEventId?: bigint;
}
export interface RegisterRequest {
    ecdhPublicKey: EcdhPublicKey;
    encryptedAvatarKey?: string;
    encryptedDisplayName: Uint8Array;
}
export type Result_7 = {
    __kind__: "ok";
    ok: Array<UserId>;
} | {
    __kind__: "err";
    err: Error_;
};
export interface RemoveMemberRequest {
    member: UserId;
    conversationId: ConversationId;
}
export type Result_6 = {
    __kind__: "ok";
    ok: DeviceRecordPublic;
} | {
    __kind__: "err";
    err: Error_;
};
export interface CreateGroupRequest {
    initialMembers: Array<UserId>;
    displayName?: string;
    description?: string;
    category?: string;
    discoverable: boolean;
    encryptedName: Uint8Array;
}
export type Result_12 = {
    __kind__: "ok";
    ok: Array<AuditEvent>;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_9 = {
    __kind__: "ok";
    ok: Array<MessagePublic>;
} | {
    __kind__: "err";
    err: Error_;
};
export interface GroupRetentionPolicy {
    retentionEnabled: boolean;
    enabledAt?: Timestamp;
    enabledBy?: UserId;
    convId: ConversationId;
}
export interface CreateDirectRequest {
    peer: UserId;
}
export type UserId = Principal;
export type AttachmentId = bigint;
export type Result = {
    __kind__: "ok";
    ok: UserProfilePublic;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_10 = {
    __kind__: "ok";
    ok: GroupRetentionPolicy;
} | {
    __kind__: "err";
    err: Error_;
};
export type MessageId = bigint;
export interface Attachment {
    id: AttachmentId;
    messageId: MessageId;
    mimeType: string;
    encryptedSizeBytes: bigint;
    storageKey: string;
    uploader: UserId;
    uploadedAt: Timestamp;
}
export type Result_8 = {
    __kind__: "ok";
    ok: Array<RetentionMetadataRecord>;
} | {
    __kind__: "err";
    err: Error_;
};
export type DenialReason = string;
export interface ReadReceipt {
    userId: UserId;
    readAt: Timestamp;
}
export interface DeviceRecordPublic {
    publicKey: Uint8Array;
    deviceLabel: string;
    deviceId: string;
    registeredAt: Timestamp;
    lastSeen: Timestamp;
}
export interface AuditExportRequest {
    endDate?: Timestamp;
    affectedUser?: UserId;
    eventTypes?: Array<AuditExportEventType>;
    startDate?: Timestamp;
    format: AuditExportFormat;
}
export interface JoinRequest {
    status: JoinRequestStatus;
    requestId: string;
    createdAt: Timestamp;
    conversationId: ConversationId;
    message?: string;
    requesterId: UserId;
}
export type Timestamp = bigint;
export type Result_17 = {
    __kind__: "ok";
    ok: Array<EscrowAccessGrant>;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_13 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: Error_;
};
export interface EscrowRecord {
    devicePublicKeyFingerprint: string;
    userId: UserId;
    consentTimestamp: Timestamp;
    deviceLabel: string;
    wrappedKey: Uint8Array;
    deviceId: string;
    consentLanguageVersion: string;
    revokedAt?: Timestamp;
    revokedReason?: string;
}
export type Result_16 = {
    __kind__: "ok";
    ok: EscrowAccessGrant;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_1 = {
    __kind__: "ok";
    ok: JoinRequest;
} | {
    __kind__: "err";
    err: Error_;
};
export interface RegisterAttachmentRequest {
    messageId: MessageId;
    mimeType: string;
    encryptedSizeBytes: bigint;
    storageKey: string;
}
export interface PublicGroupSummary {
    id: ConversationId;
    name: string;
    memberCount: bigint;
    description?: string;
    category?: string;
}
export type Result_11 = {
    __kind__: "ok";
    ok: Array<JoinRequest>;
} | {
    __kind__: "err";
    err: Error_;
};
export type ConversationId = bigint;
export interface RetentionMetadataRecord {
    messageId: MessageId;
    sentAt: Timestamp;
    senderPrincipal: UserId;
    recipientPrincipals: Array<UserId>;
    convId: ConversationId;
}
export interface UpdateProfileRequest {
    ecdhPublicKey?: EcdhPublicKey;
    encryptedAvatarKey?: string;
    encryptedDisplayName?: Uint8Array;
}
export interface SubmitJoinRequestRequest {
    conversationId: ConversationId;
    message?: string;
}
export interface AddMemberRequest {
    member: UserId;
    conversationId: ConversationId;
}
export type Result_14 = {
    __kind__: "ok";
    ok: ConfigExportBundle;
} | {
    __kind__: "err";
    err: Error_;
};
export interface ListPublicGroupsRequest {
    offset: bigint;
    limit: bigint;
    category?: string;
}
export interface MessagePublic {
    id: MessageId;
    ttlSeconds?: bigint;
    encryptedContent: Uint8Array;
    isDeleted: boolean;
    sender: UserId;
    sentAt: Timestamp;
    messageType: MessageType;
    conversationId: ConversationId;
    priority?: MessagePriority;
    readBy: Array<ReadReceipt>;
}
export interface JoinRequestActionRequest {
    denialReason?: DenialReason;
    requestId: string;
    conversationId: ConversationId;
}
export interface GetMessagesRequest {
    beforeMessageId?: MessageId;
    limit: bigint;
    conversationId: ConversationId;
}
export interface ConversationPublic {
    id: ConversationId;
    members: Array<UserId>;
    lastMessageAt: Timestamp;
    displayName?: string;
    kind: ConversationKind;
    createdAt: Timestamp;
    createdBy: UserId;
    description?: string;
    category?: string;
    discoverable: boolean;
    encryptedName?: Uint8Array;
}
export interface UserProfilePublic {
    id: UserId;
    ecdhPublicKey: EcdhPublicKey;
    encryptedAvatarKey?: string;
    encryptedDisplayName: Uint8Array;
    registeredAt: Timestamp;
    lastSeen: Timestamp;
}
export interface TypingIndicatorPublic {
    expiresAt: Timestamp;
    userId: UserId;
    conversationId: ConversationId;
}
export type EcdhPublicKey = Uint8Array;
export type Result_3 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_15 = {
    __kind__: "ok";
    ok: ConversationPublic;
} | {
    __kind__: "err";
    err: Error_;
};
export interface ConfigExportBundle {
    compartmentMappings: Array<[ConversationId, CompartmentLabel]>;
    adminPrincipals: Array<UserId>;
    exportedAt: Timestamp;
    exportedBy: UserId;
    subnetPrincipal?: string;
    canisters: string;
    groupRetentionPolicies: Array<[ConversationId, GroupRetentionPolicy]>;
    residencyLabel: DataResidency;
}
export interface SovereignConfig {
    lastUpdated: Timestamp;
    subnetPrincipal?: Principal;
    canisters: string;
    nodeCount?: bigint;
    cyclesCostMultiplier?: number;
    residencyLabel: DataResidency;
}
export interface GetRetentionMetadataRequest {
    endDate?: Timestamp;
    limit: bigint;
    afterMessageId?: MessageId;
    convId?: ConversationId;
    startDate?: Timestamp;
}
export enum AuditEventType {
    retentionEnabled = "retentionEnabled",
    memberAdded = "memberAdded",
    retentionDisabled = "retentionDisabled",
    escrowAccessGranted = "escrowAccessGranted",
    callInitiated = "callInitiated",
    sovereignConfigUpdated = "sovereignConfigUpdated",
    messageQueueDrained = "messageQueueDrained",
    adminAction = "adminAction",
    auditLogExported = "auditLogExported",
    escrowEnrolled = "escrowEnrolled",
    messageSent = "messageSent",
    escrowRevoked = "escrowRevoked",
    compartmentAssigned = "compartmentAssigned",
    userRegistered = "userRegistered",
    memberRemoved = "memberRemoved",
    userRemoved = "userRemoved",
    priorityMessageSent = "priorityMessageSent"
}
export enum AuditExportEventType {
    retentionEnabled = "retentionEnabled",
    memberAdded = "memberAdded",
    retentionDisabled = "retentionDisabled",
    escrowAccessGranted = "escrowAccessGranted",
    callInitiated = "callInitiated",
    adminAction = "adminAction",
    auditLogExported = "auditLogExported",
    escrowEnrolled = "escrowEnrolled",
    messageSent = "messageSent",
    escrowRevoked = "escrowRevoked",
    userRegistered = "userRegistered",
    memberRemoved = "memberRemoved",
    userRemoved = "userRemoved"
}
export enum AuditExportFormat {
    csv = "csv",
    json = "json"
}
export enum CompartmentLabel {
    classified = "classified",
    unclassified = "unclassified"
}
export enum ConversationKind {
    group = "group",
    direct = "direct"
}
export enum DataResidency {
    eu = "eu",
    us = "us",
    apac = "apac",
    global = "global"
}
export enum Error_ {
    forbidden = "forbidden",
    alreadyExists = "alreadyExists",
    invalidInput = "invalidInput",
    notFound = "notFound",
    unauthorized = "unauthorized"
}
export enum JoinRequestStatus {
    pending = "pending",
    denied = "denied",
    approved = "approved"
}
export enum MessagePriority {
    normal = "normal",
    high = "high"
}
export enum MessageType {
    audio = "audio",
    video = "video",
    file = "file",
    text = "text",
    image = "image"
}
export interface backendInterface {
    addAdmin(newAdmin: UserId): Promise<Result_3>;
    addConversationMember(req: AddMemberRequest): Promise<Result_3>;
    addDevice(req: AddDeviceRequest): Promise<Result_6>;
    adminGetEscrowGrants(targetUserId: UserId | null, limit: bigint, afterGrantId: bigint | null): Promise<Result_17>;
    adminGrantEscrowAccess(targetUserId: UserId, targetDeviceId: string, reason: string): Promise<Result_16>;
    approveJoinRequest(req: JoinRequestActionRequest): Promise<Result_3>;
    clearTypingIndicator(conversationId: ConversationId): Promise<void>;
    createDirectConversation(req: CreateDirectRequest): Promise<Result_15>;
    createGroupConversation(req: CreateGroupRequest): Promise<Result_15>;
    deleteAttachment(attachmentId: AttachmentId): Promise<Result_3>;
    deleteConversation(conversationId: ConversationId): Promise<Result_3>;
    deleteGroupConversation(conversationId: ConversationId): Promise<Result_3>;
    denyJoinRequest(req: JoinRequestActionRequest): Promise<Result_3>;
    disableGroupRetention(convId: ConversationId): Promise<Result_3>;
    enableGroupRetention(convId: ConversationId): Promise<Result_3>;
    enrollKeyEscrow(deviceId: string, deviceLabel: string, devicePublicKeyFingerprint: string, wrappedKey: Uint8Array, consentLanguageVersion: string): Promise<Result_3>;
    exportAuditLog(req: AuditExportRequest): Promise<Result_13>;
    exportConfigBundle(): Promise<Result_14>;
    generateDeviceSyncToken(devicePublicKey: Uint8Array): Promise<Result_13>;
    getAuditLog(req: GetAuditLogRequest): Promise<Result_12>;
    getConversation(id: ConversationId): Promise<ConversationPublic | null>;
    getDeploymentInfo(): Promise<SovereignConfig>;
    getGroupCompartment(convId: ConversationId): Promise<CompartmentLabel | null>;
    getGroupJoinRequests(conversationId: ConversationId): Promise<Result_11>;
    getGroupRetentionPolicy(convId: ConversationId): Promise<Result_10>;
    getMessageAttachments(messageId: MessageId): Promise<Array<Attachment>>;
    getMessages(req: GetMessagesRequest): Promise<Result_9>;
    getMyEscrowStatus(): Promise<Array<EscrowRecord>>;
    getRetentionMetadata(req: GetRetentionMetadataRequest): Promise<Result_8>;
    getTypingIndicators(conversationId: ConversationId): Promise<Array<TypingIndicatorPublic>>;
    getUserProfile(userId: UserId): Promise<UserProfilePublic | null>;
    getUserProfiles(userIds: Array<UserId>): Promise<Array<UserProfilePublic>>;
    isAdminCheck(principal: UserId): Promise<boolean>;
    listAdmins(): Promise<Result_7>;
    listConversations(): Promise<Array<ConversationPublic>>;
    listMyDevices(): Promise<Array<DeviceRecordPublic>>;
    listPublicGroups(req: ListPublicGroupsRequest): Promise<Array<PublicGroupSummary>>;
    markMessageRead(messageId: MessageId): Promise<Result_3>;
    redeemDeviceSyncToken(token: string, deviceId: string, deviceLabel: string): Promise<Result_6>;
    registerAttachment(req: RegisterAttachmentRequest): Promise<Result_5>;
    registerUser(req: RegisterRequest): Promise<Result>;
    removeAdmin(target: UserId): Promise<Result_3>;
    removeConversationMember(req: RemoveMemberRequest): Promise<Result_3>;
    revokeDevice(deviceId: string): Promise<Result_3>;
    revokeKeyEscrow(deviceId: string, reason: string): Promise<Result_3>;
    sendMessage(req: SendMessageRequest): Promise<Result_4>;
    setGroupCompartment(convId: ConversationId, compartment: CompartmentLabel): Promise<Result_3>;
    setSovereignConfig(residency: DataResidency, subnet: Principal | null, nodeCount: bigint | null, costMult: number | null): Promise<Result_2>;
    setTypingIndicator(conversationId: ConversationId, ttlSeconds: bigint): Promise<void>;
    submitJoinRequest(req: SubmitJoinRequestRequest): Promise<Result_1>;
    touchPresence(): Promise<void>;
    updateUserProfile(req: UpdateProfileRequest): Promise<Result>;
}
