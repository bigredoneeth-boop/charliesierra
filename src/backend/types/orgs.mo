import Common "common";

module {
  // ── Identity aliases ───────────────────────────────────────────────────────
  public type OrgId = Text; // UUID-style string identifier

  // ── Status / role variants ─────────────────────────────────────────────────
  public type OrgStatus = {
    #Active;
    #Suspended;
    #Archived;
  };

  public type OrgRole = {
    #SuperAdmin;    // Platform-level global role
    #OrgAdmin;      // Org-scoped administrator
    #Auditor;       // Read-only compliance role
    #StandardUser;  // Regular org member
  };

  // Member status within an org (Active, Suspended, or Pending invite)
  public type MemberStatus = {
    #Active;
    #Suspended;
    #Pending;
  };

  public type InviteStatus = {
    #Pending;
    #Accepted;
    #Revoked;
    #Expired;
  };

  // ── Core record types ──────────────────────────────────────────────────────
  public type OrgRecord = {
    id          : OrgId;
    name        : Text;
    description : Text;
    createdAt   : Common.Timestamp;
    createdBy   : Common.UserId;
    status      : OrgStatus;
    memberCount : Nat;
  };

  public type OrgMembership = {
    orgId       : OrgId;
    userId      : Common.UserId;
    role        : OrgRole;
    joinedAt    : Common.Timestamp;
    invitedBy   : Common.UserId;
    status      : MemberStatus;          // Active | Suspended | Pending
    lastActive  : ?Common.Timestamp;     // last time member performed an action
    email       : ?Text;                 // set if invite was email-based
  };

  public type OrgInvite = {
    id               : Text;
    orgId            : OrgId;
    invitedBy        : Common.UserId;
    principalOrEmail : Text;   // Principal.toText() or email address
    role             : OrgRole;
    createdAt        : Common.Timestamp;
    status           : InviteStatus;
    expiresAt        : Common.Timestamp;
  };

  // ── Request / response types ───────────────────────────────────────────────
  public type CreateOrgRequest = {
    name        : Text;
    description : Text;
  };

  public type InviteUserRequest = {
    orgId       : OrgId;
    principalId : Text;              // Principal.toText() of the invited user
    email       : ?Text;             // optional email address for linking
    role        : OrgRole;
  };

  public type UpdateMemberRoleRequest = {
    orgId   : OrgId;
    userId  : Common.UserId;
    newRole : OrgRole;
  };

  public type SuspendUserRequest = {
    orgId  : OrgId;
    userId : Common.UserId;
    reason : Text;
  };

  public type GetOrgUsersRequest = {
    orgId       : ?OrgId;                // null = all orgs (SuperAdmin only)
    limit       : Nat;
    afterUserId : ?Common.UserId;
    search      : ?Text;                 // optional case-insensitive partial match on userId text or email
  };

  public type GetOrgUsersResponse = {
    members : [OrgMembership];
    total   : Nat;
    hasMore : Bool;
  };

  public type GetOrgsRequest = {
    limit      : Nat;
    afterOrgId : ?OrgId;
    search     : ?Text;                  // optional case-insensitive name filter
  };

  public type GetOrgsResponse = {
    orgs  : [OrgRecord];
    total : Nat;
  };
};
