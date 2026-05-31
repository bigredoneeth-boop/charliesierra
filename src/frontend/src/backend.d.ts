import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface RetentionPolicy {
    id: string;
    orgId?: OrgId;
    period: RetentionPeriod;
    legalHold: boolean;
    updatedAt: Timestamp;
    updatedBy: UserId;
    autoDelete: boolean;
}
export interface NotificationPreferences {
    groupMessagesEnabled: boolean;
    directMessagesEnabled: boolean;
}
export type Result_2 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export interface RecoveryRequest {
    id: bigint;
    status: RecoveryRequestStatus;
    orgId?: OrgId;
    approvedBy?: UserId;
    createdAt: Timestamp;
    initiatingAdmin: UserId;
    targetDeviceId: string;
    resolvedAt?: Timestamp;
    reason: string;
    targetUserId: UserId;
}
export type Result_20 = {
    __kind__: "ok";
    ok: Array<MessagePublic>;
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
export type Result_4 = {
    __kind__: "ok";
    ok: JoinRequest;
} | {
    __kind__: "err";
    err: Error_;
};
export interface AuditEvent {
    id: bigint;
    orgId?: OrgId;
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
export interface UpdateMemberRoleRequest {
    orgId: OrgId;
    userId: UserId;
    newRole: OrgRole;
}
export interface GetAuditLogRequest {
    afterTimestamp?: Timestamp;
    limit: bigint;
    filterEventType?: AuditEventType;
    beforeTimestamp?: Timestamp;
    filterActor?: UserId;
    filterOrgId?: OrgId;
    afterEventId?: bigint;
}
export interface CreateOrgRequest {
    name: string;
    description: string;
}
export interface EscrowStatsRecord {
    pendingRecoveries: bigint;
    lastRecoveryTimestamp?: Timestamp;
    totalEscrowed: bigint;
}
export interface GetEscrowedUsersRequest {
    orgId?: OrgId;
    limit: bigint;
    afterUserId?: string;
}
export interface GetOrgUsersResponse {
    total: bigint;
    hasMore: boolean;
    members: Array<OrgMembership>;
}
export type Result_6 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_26 = {
    __kind__: "ok";
    ok: Array<AuditEvent>;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_12 = {
    __kind__: "ok";
    ok: GetOrgsResponse;
} | {
    __kind__: "err";
    err: string;
};
export interface GroupRetentionPolicy {
    retentionEnabled: boolean;
    enabledAt?: Timestamp;
    enabledBy?: UserId;
    convId: ConversationId;
}
export interface CreateGroupRequest {
    initialMembers: Array<UserId>;
    displayName?: string;
    description?: string;
    category?: string;
    discoverable: boolean;
    encryptedName: Uint8Array;
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
    ok: Attachment;
} | {
    __kind__: "err";
    err: Error_;
};
export interface UpdateRetentionPolicyRequest {
    id: string;
    period?: RetentionPeriod;
    legalHold?: boolean;
    autoDelete?: boolean;
}
export type MessageId = bigint;
export type Result_8 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export interface GetOrgsRequest {
    search?: string;
    limit: bigint;
    afterOrgId?: OrgId;
}
export interface Attachment {
    id: AttachmentId;
    messageId: MessageId;
    mimeType: string;
    encryptedSizeBytes: bigint;
    storageKey: string;
    uploader: UserId;
    uploadedAt: Timestamp;
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
export type Result_13 = {
    __kind__: "ok";
    ok: Array<UserId>;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_25 = {
    __kind__: "ok";
    ok: EscrowStatsRecord;
} | {
    __kind__: "err";
    err: Error_;
};
export interface PublicGroupSummary {
    id: ConversationId;
    name: string;
    memberCount: bigint;
    description?: string;
    category?: string;
}
export type Result_11 = {
    __kind__: "ok";
    ok: DeviceRecordPublic;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_27 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: Error_;
};
export interface ListPublicGroupsRequest {
    offset: bigint;
    limit: bigint;
    category?: string;
}
export interface GroupMemberRecord {
    displayName?: string;
    userId: UserId;
    joinedAt: Timestamp;
}
export interface GetAllGroupsRequest {
    orgId?: OrgId;
}
export interface GetMessagesRequest {
    beforeMessageId?: MessageId;
    limit: bigint;
    conversationId: ConversationId;
}
export type Result_21 = {
    __kind__: "ok";
    ok: GroupRetentionPolicy;
} | {
    __kind__: "err";
    err: Error_;
};
export interface UserProfilePublic {
    id: UserId;
    ecdhPublicKey: EcdhPublicKey;
    encryptedAvatarKey?: string;
    encryptedDisplayName: Uint8Array;
    registeredAt: Timestamp;
    lastSeen: Timestamp;
}
export type EcdhPublicKey = Uint8Array;
export type Result_18 = {
    __kind__: "ok";
    ok: OrgRole | null;
} | {
    __kind__: "err";
    err: string;
};
export type Result_3 = {
    __kind__: "ok";
    ok: OrgRecord;
} | {
    __kind__: "err";
    err: string;
};
export interface EscrowedUserRecord {
    orgId?: OrgId;
    deviceCount: bigint;
    userId: UserId;
    escrowStatus: EscrowStatus;
    lastBackedUp?: Timestamp;
}
export type Result_23 = {
    __kind__: "ok";
    ok: Array<JoinRequest>;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_15 = {
    __kind__: "ok";
    ok: Array<RetentionMetadataRecord>;
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
export interface PendingNotification {
    id: string;
    notifType: string;
    senderDisplayName: string;
    timestamp: bigint;
    groupName?: string;
}
export type OrgId = string;
export interface LegalHoldRequest {
    orgId: OrgId;
    hold: boolean;
    reason: string;
}
export interface OrgSettings {
    legalHoldReason?: string;
    orgId: string;
    logoStorageKey?: string;
    groupCreationPermission: GroupCreationPermission;
    dataExportPermission: DataExportPermission;
    defaultInviteRole: string;
    logoUrl?: string;
    legalHoldEnabled: boolean;
    messageRetentionDays?: RetentionPeriodDays;
}
export type Result_5 = {
    __kind__: "ok";
    ok: SovereignConfig;
} | {
    __kind__: "err";
    err: Error_;
};
export interface AddDeviceRequest {
    publicKey: Uint8Array;
    deviceLabel: string;
    deviceId: string;
}
export interface PlatformSettings {
    defaultRetentionDays: RetentionPeriodDays;
    keyEscrowEnabled: boolean;
    vetKeysEnabled: boolean;
    sessionTimeoutMinutes: bigint;
    platformTagline: string;
    auditLogRetentionDays: RetentionPeriodDays;
    mfaEnforced: boolean;
    passwordPolicy: PasswordPolicy;
    platformName: string;
}
export interface GroupAdminRecord {
    id: ConversationId;
    status: GroupStatus;
    orgId?: OrgId;
    name: string;
    createdAt: Timestamp;
    createdBy: UserId;
    memberCount: bigint;
}
export type Result_31 = {
    __kind__: "ok";
    ok: Array<EscrowAccessGrant>;
} | {
    __kind__: "err";
    err: Error_;
};
export interface RegisterRequest {
    ecdhPublicKey: EcdhPublicKey;
    encryptedAvatarKey?: string;
    encryptedDisplayName: Uint8Array;
}
export type Result_7 = {
    __kind__: "ok";
    ok: MessagePublic;
} | {
    __kind__: "err";
    err: Error_;
};
export interface RemoveMemberRequest {
    member: UserId;
    conversationId: ConversationId;
}
export type Result_28 = {
    __kind__: "ok";
    ok: ConfigExportBundle;
} | {
    __kind__: "err";
    err: Error_;
};
export interface GetRetentionPoliciesRequest {
    orgId?: OrgId;
}
export type Result_9 = {
    __kind__: "ok";
    ok: RecoveryRequest;
} | {
    __kind__: "err";
    err: Error_;
};
export interface CreateDirectRequest {
    peer: UserId;
}
export interface RemoveMemberFromGroupRequest {
    memberId: UserId;
    groupId: ConversationId;
}
export type DenialReason = string;
export type Result_30 = {
    __kind__: "ok";
    ok: EscrowAccessGrant;
} | {
    __kind__: "err";
    err: Error_;
};
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
export type Timestamp = bigint;
export type Result_17 = {
    __kind__: "ok";
    ok: GetOrgUsersResponse;
} | {
    __kind__: "err";
    err: string;
};
export type Result_16 = {
    __kind__: "ok";
    ok: Array<RecoveryRequest>;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_1 = {
    __kind__: "ok";
    ok: RetentionPolicy;
} | {
    __kind__: "err";
    err: string;
};
export interface RegisterAttachmentRequest {
    messageId: MessageId;
    mimeType: string;
    encryptedSizeBytes: bigint;
    storageKey: string;
}
export type Result_22 = {
    __kind__: "ok";
    ok: Array<GroupMemberRecord>;
} | {
    __kind__: "err";
    err: string;
};
export interface GetGroupMembersRequest {
    groupId: ConversationId;
}
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
export interface ExportAuditLogsRequest {
    afterTimestamp?: Timestamp;
    filterEventType?: AuditEventType;
    beforeTimestamp?: Timestamp;
    filterActor?: UserId;
    filterOrgId?: OrgId;
}
export type ConversationId = bigint;
export type Result_19 = {
    __kind__: "ok";
    ok: Array<OrgMembership>;
} | {
    __kind__: "err";
    err: string;
};
export type Result_29 = {
    __kind__: "ok";
    ok: ConversationPublic;
} | {
    __kind__: "err";
    err: Error_;
};
export interface SubmitJoinRequestRequest {
    conversationId: ConversationId;
    message?: string;
}
export type Result_24 = {
    __kind__: "ok";
    ok: Array<EscrowedUserRecord>;
} | {
    __kind__: "err";
    err: Error_;
};
export type Result_14 = {
    __kind__: "ok";
    ok: OrgMembership;
} | {
    __kind__: "err";
    err: string;
};
export interface AddMemberRequest {
    member: UserId;
    conversationId: ConversationId;
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
export interface InviteUserRequest {
    orgId: OrgId;
    role: OrgRole;
    email?: string;
    principalId: string;
}
export interface GetOrgUsersRequest {
    orgId?: OrgId;
    search?: string;
    limit: bigint;
    afterUserId?: UserId;
}
export interface GetOrgsResponse {
    total: bigint;
    orgs: Array<OrgRecord>;
}
export interface JoinRequestActionRequest {
    denialReason?: DenialReason;
    requestId: string;
    conversationId: ConversationId;
}
export interface SuspendUserRequest {
    orgId: OrgId;
    userId: UserId;
    reason: string;
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
export interface OrgRecord {
    id: OrgId;
    status: OrgStatus;
    name: string;
    createdAt: Timestamp;
    createdBy: UserId;
    memberCount: bigint;
    description: string;
}
export interface TypingIndicatorPublic {
    expiresAt: Timestamp;
    userId: UserId;
    conversationId: ConversationId;
}
export interface OrgMembership {
    status: MemberStatus;
    orgId: OrgId;
    userId: UserId;
    joinedAt: Timestamp;
    role: OrgRole;
    invitedBy: UserId;
    email?: string;
    lastActive?: Timestamp;
}
export interface CreateRetentionPolicyRequest {
    orgId?: OrgId;
    period: RetentionPeriod;
    legalHold: boolean;
    autoDelete: boolean;
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
    legalHoldRemoved = "legalHoldRemoved",
    memberSuspended = "memberSuspended",
    userInvited = "userInvited",
    retentionEnabled = "retentionEnabled",
    memberAdded = "memberAdded",
    policyExpiryCheckPerformed = "policyExpiryCheckPerformed",
    retentionPolicyUpdated = "retentionPolicyUpdated",
    retentionDisabled = "retentionDisabled",
    groupMemberRemoved = "groupMemberRemoved",
    orgCreated = "orgCreated",
    orgDeleted = "orgDeleted",
    platformSettingsUpdated = "platformSettingsUpdated",
    escrowAccessGranted = "escrowAccessGranted",
    callInitiated = "callInitiated",
    sovereignConfigUpdated = "sovereignConfigUpdated",
    keyRecoveryApproved = "keyRecoveryApproved",
    keyRecoveryInitiated = "keyRecoveryInitiated",
    messageQueueDrained = "messageQueueDrained",
    memberReactivated = "memberReactivated",
    legalHoldPlaced = "legalHoldPlaced",
    keyRecoveryCompleted = "keyRecoveryCompleted",
    keyRecoveryRejected = "keyRecoveryRejected",
    adminAction = "adminAction",
    orgSettingsUpdated = "orgSettingsUpdated",
    auditLogExported = "auditLogExported",
    escrowEnrolled = "escrowEnrolled",
    messageSent = "messageSent",
    escrowRevoked = "escrowRevoked",
    compartmentAssigned = "compartmentAssigned",
    policyReportExported = "policyReportExported",
    userRegistered = "userRegistered",
    memberRemoved = "memberRemoved",
    retentionPolicyCreated = "retentionPolicyCreated",
    orgSuspended = "orgSuspended",
    userRemoved = "userRemoved",
    priorityMessageSent = "priorityMessageSent",
    orgUpdated = "orgUpdated",
    keyEscrowEnrolled = "keyEscrowEnrolled",
    memberRoleChanged = "memberRoleChanged"
}
export enum AuditExportEventType {
    memberSuspended = "memberSuspended",
    userInvited = "userInvited",
    retentionEnabled = "retentionEnabled",
    memberAdded = "memberAdded",
    retentionDisabled = "retentionDisabled",
    groupMemberRemoved = "groupMemberRemoved",
    orgCreated = "orgCreated",
    escrowAccessGranted = "escrowAccessGranted",
    callInitiated = "callInitiated",
    keyRecoveryApproved = "keyRecoveryApproved",
    keyRecoveryInitiated = "keyRecoveryInitiated",
    keyRecoveryCompleted = "keyRecoveryCompleted",
    keyRecoveryRejected = "keyRecoveryRejected",
    adminAction = "adminAction",
    auditLogExported = "auditLogExported",
    escrowEnrolled = "escrowEnrolled",
    messageSent = "messageSent",
    escrowRevoked = "escrowRevoked",
    userRegistered = "userRegistered",
    memberRemoved = "memberRemoved",
    orgSuspended = "orgSuspended",
    userRemoved = "userRemoved",
    keyEscrowEnrolled = "keyEscrowEnrolled",
    memberRoleChanged = "memberRoleChanged"
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
export enum DataExportPermission {
    orgAdminsOnly = "orgAdminsOnly",
    disabled = "disabled",
    allMembers = "allMembers"
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
export enum EscrowStatus {
    active = "active",
    revoked = "revoked",
    recovered = "recovered",
    pendingRecovery = "pendingRecovery"
}
export enum GroupCreationPermission {
    orgAdminsOnly = "orgAdminsOnly",
    allMembers = "allMembers"
}
export enum GroupStatus {
    active = "active",
    suspended = "suspended"
}
export enum JoinRequestStatus {
    pending = "pending",
    denied = "denied",
    approved = "approved"
}
export enum MemberStatus {
    Active = "Active",
    Suspended = "Suspended",
    Pending = "Pending"
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
export enum OrgRole {
    OrgAdmin = "OrgAdmin",
    Auditor = "Auditor",
    SuperAdmin = "SuperAdmin",
    StandardUser = "StandardUser"
}
export enum OrgStatus {
    Active = "Active",
    Suspended = "Suspended",
    Archived = "Archived"
}
export enum PasswordPolicy {
    strong = "strong",
    enterprise = "enterprise",
    basic = "basic"
}
export enum RecoveryRequestStatus {
    pending = "pending",
    completed = "completed",
    approved = "approved",
    rejected = "rejected"
}
export enum RetentionPeriod {
    days30 = "days30",
    days90 = "days90",
    unlimited = "unlimited",
    years7 = "years7",
    year1 = "year1"
}
export interface backendInterface {
    addAdmin(newAdmin: UserId): Promise<Result_6>;
    addConversationMember(req: AddMemberRequest): Promise<Result_6>;
    addDevice(req: AddDeviceRequest): Promise<Result_11>;
    adminGetEscrowGrants(targetUserId: UserId | null, limit: bigint, afterGrantId: bigint | null): Promise<Result_31>;
    adminGrantEscrowAccess(targetUserId: UserId, targetDeviceId: string, reason: string): Promise<Result_30>;
    approveJoinRequest(req: JoinRequestActionRequest): Promise<Result_6>;
    approveKeyRecovery(requestId: bigint): Promise<Result_9>;
    bootstrapSuperAdmin(targetPrincipal: UserId): Promise<Result_8>;
    checkPolicyExpiry(callerOrgId: OrgId | null): Promise<Array<RetentionPolicy>>;
    clearTypingIndicator(conversationId: ConversationId): Promise<void>;
    createDirectConversation(req: CreateDirectRequest): Promise<Result_29>;
    createGroupConversation(req: CreateGroupRequest): Promise<Result_29>;
    createOrg(req: CreateOrgRequest): Promise<Result_3>;
    createRetentionPolicy(req: CreateRetentionPolicyRequest): Promise<Result_1>;
    deleteAttachment(attachmentId: AttachmentId): Promise<Result_6>;
    deleteConversation(conversationId: ConversationId): Promise<Result_6>;
    deleteGroupConversation(conversationId: ConversationId): Promise<Result_6>;
    deleteOrg(orgId: OrgId): Promise<Result_2>;
    denyJoinRequest(req: JoinRequestActionRequest): Promise<Result_6>;
    disableGroupRetention(convId: ConversationId): Promise<Result_6>;
    enableGroupRetention(convId: ConversationId): Promise<Result_6>;
    enrollKeyEscrow(deviceId: string, deviceLabel: string, devicePublicKeyFingerprint: string, wrappedKey: Uint8Array, consentLanguageVersion: string): Promise<Result_6>;
    enrollUserKeyEscrow(): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    exportAuditLog(req: AuditExportRequest): Promise<Result_27>;
    exportAuditLogs(req: ExportAuditLogsRequest): Promise<Result_26>;
    exportConfigBundle(): Promise<Result_28>;
    generateDeviceSyncToken(devicePublicKey: Uint8Array): Promise<Result_27>;
    getAllGroups(req: GetAllGroupsRequest): Promise<Array<GroupAdminRecord>>;
    getAuditLog(req: GetAuditLogRequest): Promise<Result_26>;
    getCanisterHealth(): Promise<{
        memoryCapacity: bigint;
        cyclesBalance: bigint;
        memoryUsed: bigint;
    }>;
    getConversation(id: ConversationId): Promise<ConversationPublic | null>;
    getDeploymentInfo(): Promise<SovereignConfig>;
    getEncryptedEscrowKey(targetPrincipal: UserId, transportPublicKey: Uint8Array): Promise<{
        __kind__: "ok";
        ok: Uint8Array;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getEscrowPublicKey(): Promise<{
        __kind__: "ok";
        ok: Uint8Array;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getEscrowStats(): Promise<Result_25>;
    getEscrowedUsers(req: GetEscrowedUsersRequest): Promise<Result_24>;
    getGlobalRetentionPolicy(): Promise<RetentionPolicy | null>;
    getGroupCompartment(convId: ConversationId): Promise<CompartmentLabel | null>;
    getGroupJoinRequests(conversationId: ConversationId): Promise<Result_23>;
    getGroupMembers(req: GetGroupMembersRequest): Promise<Result_22>;
    getGroupRetentionPolicy(convId: ConversationId): Promise<Result_21>;
    getMessageAttachments(messageId: MessageId): Promise<Array<Attachment>>;
    getMessages(req: GetMessagesRequest): Promise<Result_20>;
    getMyEscrowStatus(): Promise<Array<EscrowRecord>>;
    getMyOrgs(): Promise<Result_19>;
    getMyRole(orgId: OrgId): Promise<Result_18>;
    getNotificationPreferences(): Promise<NotificationPreferences>;
    getOrg(orgId: OrgId): Promise<Result_3>;
    getOrgSettings(orgId: string): Promise<OrgSettings>;
    getOrgUsers(req: GetOrgUsersRequest): Promise<Result_17>;
    getPendingNotifications(): Promise<Array<PendingNotification>>;
    getPlatformSettings(): Promise<PlatformSettings>;
    getRecoveryDetails(requestId: bigint): Promise<Result_9>;
    getRecoveryRequests(orgId: OrgId | null, statusFilter: RecoveryRequestStatus | null): Promise<Result_16>;
    getRetentionMetadata(req: GetRetentionMetadataRequest): Promise<Result_15>;
    getRetentionPolicies(req: GetRetentionPoliciesRequest): Promise<Array<RetentionPolicy>>;
    getRetentionPolicy(orgId: OrgId): Promise<RetentionPolicy | null>;
    getTypingIndicators(conversationId: ConversationId): Promise<Array<TypingIndicatorPublic>>;
    getUserProfile(userId: UserId): Promise<UserProfilePublic | null>;
    getUserProfiles(userIds: Array<UserId>): Promise<Array<UserProfilePublic>>;
    getVAPIDPublicKey(): Promise<string>;
    hasDataResetBeenPerformed(): Promise<boolean>;
    hasSuperAdmin(): Promise<boolean>;
    initiateKeyRecovery(targetUserId: UserId, targetDeviceId: string, reason: string, orgId: OrgId | null): Promise<Result_9>;
    inviteUser(req: InviteUserRequest): Promise<Result_14>;
    isAdminCheck(principal: UserId): Promise<boolean>;
    listAdmins(): Promise<Result_13>;
    listConversations(): Promise<Array<ConversationPublic>>;
    listMyDevices(): Promise<Array<DeviceRecordPublic>>;
    listOrgs(req: GetOrgsRequest): Promise<Result_12>;
    listPublicGroups(req: ListPublicGroupsRequest): Promise<Array<PublicGroupSummary>>;
    logPolicyExpiryCheck(): Promise<void>;
    logPolicyReportExported(orgFilter: OrgId | null): Promise<void>;
    markMessageRead(messageId: MessageId): Promise<Result_6>;
    reactivateMember(orgId: OrgId, userId: UserId): Promise<Result_2>;
    redeemDeviceSyncToken(token: string, deviceId: string, deviceLabel: string): Promise<Result_11>;
    registerAttachment(req: RegisterAttachmentRequest): Promise<Result_10>;
    registerPushSubscription(endpoint: string, p256dh: string, auth: string): Promise<Result_2>;
    registerUser(req: RegisterRequest): Promise<Result>;
    rejectKeyRecovery(requestId: bigint): Promise<Result_9>;
    removeAdmin(target: UserId): Promise<Result_6>;
    removeConversationMember(req: RemoveMemberRequest): Promise<Result_6>;
    removeMember(orgId: OrgId, userId: UserId): Promise<Result_2>;
    removeMemberFromGroup(req: RemoveMemberFromGroupRequest): Promise<Result_2>;
    resetAllTestData(): Promise<Result_8>;
    revokeDevice(deviceId: string): Promise<Result_6>;
    revokeKeyEscrow(deviceId: string, reason: string): Promise<Result_6>;
    sendMessage(req: SendMessageRequest): Promise<Result_7>;
    sendPushToUser(targetPrincipal: Principal, senderName: string, messageType: string, convId: string): Promise<void>;
    setGroupCompartment(convId: ConversationId, compartment: CompartmentLabel): Promise<Result_6>;
    setSovereignConfig(residency: DataResidency, subnet: Principal | null, nodeCount: bigint | null, costMult: number | null): Promise<Result_5>;
    setTypingIndicator(conversationId: ConversationId, ttlSeconds: bigint): Promise<void>;
    submitJoinRequest(req: SubmitJoinRequestRequest): Promise<Result_4>;
    subscribeToPush(endpoint: string, auth: string, p256dh: string): Promise<void>;
    suspendMember(req: SuspendUserRequest): Promise<Result_2>;
    suspendOrg(orgId: OrgId): Promise<Result_2>;
    toggleLegalHold(req: LegalHoldRequest): Promise<Result_1>;
    touchPresence(): Promise<void>;
    unregisterPushSubscription(): Promise<Result_2>;
    unsubscribeFromPush(): Promise<void>;
    updateMemberRole(req: UpdateMemberRoleRequest): Promise<Result_2>;
    updateNotificationPreferences(directEnabled: boolean, groupEnabled: boolean): Promise<void>;
    updateOrg(orgId: OrgId, name: string, description: string | null): Promise<Result_3>;
    updateOrgSettings(orgId: string, update: OrgSettings): Promise<Result_2>;
    updatePlatformSettings(update: PlatformSettings): Promise<Result_2>;
    updateRetentionPolicy(req: UpdateRetentionPolicyRequest): Promise<Result_1>;
    updateUserProfile(req: UpdateProfileRequest): Promise<Result>;
    uploadFile(fileBytes: Uint8Array, _mimeType: string): Promise<Uint8Array>;
}
