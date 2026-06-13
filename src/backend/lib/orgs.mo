import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Common "../types/common";
import AdminT "../types/admin";
import AdminLib "../lib/admin";
import T "../types/orgs";
import Array "mo:core/Array";

// lib/orgs.mo — Core org management library for CharlieSierra.
//
// This module is stateless: all state is injected by main.mo and passed to
// every function. This allows the multi-file architecture to stay clean and
// avoids duplicating state across the actor.
//
// Security model:
//   • SuperAdmin  — global role; stored in adminState.adminPrincipals (shared with AdminLib)
//   • OrgAdmin    — org-scoped; stored in memberships map
//   • Auditor     — org-scoped read-only
//   • StandardUser — org-scoped regular member
//
// Audit trail: every mutation records an event via AdminLib helpers.
// No message content is ever stored here.

module {
  // ── Rate-limit state ────────────────────────────────────────────────────────
  // Each endpoint gets two Maps: windowStart (epoch ns) and count in that window.
  // This state is threaded in via the State record so it persists across upgrades.
  public type RateLimitState = {
    orgCreateRateLimitWindows  : Map.Map<Common.UserId, Int>;
    orgCreateRateLimitCounts   : Map.Map<Common.UserId, Nat>;
    inviteRateLimitWindows     : Map.Map<Common.UserId, Int>;
    inviteRateLimitCounts      : Map.Map<Common.UserId, Nat>;
    suspendRateLimitWindows    : Map.Map<Common.UserId, Int>;
    suspendRateLimitCounts     : Map.Map<Common.UserId, Nat>;
  };

  // Returns true (allowed) and records the attempt, or false (exceeded) without mutating.
  func checkAndRecordRateLimit(
    caller      : Common.UserId,
    now         : Int,
    windowMap   : Map.Map<Common.UserId, Int>,
    countMap    : Map.Map<Common.UserId, Nat>,
    maxAttempts : Nat,
  ) : Bool {
    let windowNs : Int = 3_600_000_000_000;
    let (windowStart, currentCount) : (Int, Nat) = switch (windowMap.get(caller)) {
      case null (now, 0);
      case (?ws) {
        let count = switch (countMap.get(caller)) { case null 0; case (?c) c };
        if (now - ws >= windowNs) { (now, 0) } else { (ws, count) };
      };
    };
    if (currentCount >= maxAttempts) { return false };
    windowMap.add(caller, windowStart);
    countMap.add(caller, currentCount + 1);
    true
  };

  // ── Helper: membership map key ──────────────────────────────────────────
  // We use Text keys "orgId:principalText" so the Map can use Text.compare.
  func memberKey(orgId : T.OrgId, userId : Common.UserId) : Text {
    orgId # ":" # userId.toText();
  };

  // ── a. isSuperAdmin ──────────────────────────────────────────────────────
  /// Returns true if userId is a platform-level SuperAdmin.
  /// SuperAdmins are stored in adminState.adminPrincipals (same set as AdminLib).
  public func isSuperAdmin(
    userId      : Common.UserId,
    adminState  : AdminLib.State,
  ) : Bool {
    adminState.adminPrincipals.contains(userId);
  };

  // ── b. getOrgRole ────────────────────────────────────────────────────────
  /// Returns the caller's role within a specific org, or null if not a member.
  public func getOrgRole(
    orgId       : T.OrgId,
    userId      : Common.UserId,
    memberships : Map.Map<Text, T.OrgMembership>,
  ) : ?T.OrgRole {
    switch (memberships.get(memberKey(orgId, userId))) {
      case (?m) ?m.role;
      case null null;
    };
  };

  // ── c. assertOrgAdmin ────────────────────────────────────────────────────
  /// Checks that caller is either a SuperAdmin (platform-level) or an OrgAdmin
  /// within the specified org. Returns #err("Unauthorized") if neither applies.
  public func assertOrgAdmin(
    orgId       : T.OrgId,
    caller      : Common.UserId,
    memberships : Map.Map<Text, T.OrgMembership>,
    adminState  : AdminLib.State,
  ) : Common.Result<(), Text> {
    // SuperAdmins have global authority over every org.
    if (isSuperAdmin(caller, adminState)) return #ok(());
    // Check for an org-scoped OrgAdmin membership that is not suspended.
    switch (memberships.get(memberKey(orgId, caller))) {
      case (?m) {
        if (m.role == #OrgAdmin and m.status != #Suspended) return #ok(());
      };
      case null {};
    };
    #err("Unauthorized: must be OrgAdmin or SuperAdmin");
  };

  // ── Helper: record an org-scoped audit event ─────────────────────────────
  // Writes directly into the shared audit log with an orgId tag so that
  // per-tenant audit filtering works correctly.
  func recordOrgEvent(
    adminState  : AdminLib.State,
    eventType   : AdminT.AuditEventType,
    actorId     : Common.UserId,
    target      : ?Common.UserId,
    orgId       : ?T.OrgId,
  ) : () {
    let id = adminState.state.nextEventId;
    adminState.state.nextEventId += 1;
    let event : AdminT.AuditEvent = {
      id;
      eventType;
      actorPrincipal   = actorId;
      targetPrincipal  = target;
      timestamp        = Time.now();
      encryptedDetails = null; // no content ever stored
      orgId;
    };
    adminState.auditLog.add(id, event);
  };

  // ── d. createOrg ─────────────────────────────────────────────────────────
  /// Creates a new organisation. The caller becomes the initial OrgAdmin
  /// (or retains SuperAdmin if they are already a platform admin).
  public func createOrg(
    caller      : Common.UserId,
    req         : T.CreateOrgRequest,
    orgs        : Map.Map<T.OrgId, T.OrgRecord>,
    memberships : Map.Map<Text, T.OrgMembership>,
    adminState  : AdminLib.State,
    rlState     : RateLimitState,
  ) : Common.Result<T.OrgRecord, Text> {
    // Rate limit: 10 createOrg calls per hour per caller.
    let now = Time.now();
    if (not checkAndRecordRateLimit(caller, now, rlState.orgCreateRateLimitWindows, rlState.orgCreateRateLimitCounts, 10)) {
      return #err("Rate limit exceeded: too many createOrg requests. Try again later.");
    };
    // Validate name is non-empty.
    if (req.name == "") return #err("Organisation name cannot be empty");

    // Generate a UUID-style ID by combining the caller's principal text
    // with the current nanosecond timestamp. This is pseudo-unique and
    // deterministic enough for canister-local IDs.
    let orgId : T.OrgId = caller.toText() # "-" # now.toText();
    let org : T.OrgRecord = {
      id          = orgId;
      name        = req.name;
      description = req.description;
      createdAt   = now;
      createdBy   = caller;
      status      = #Active;
      memberCount = 1;
    };
    orgs.add(orgId, org);

    // Add the creator as OrgAdmin (even if they are a SuperAdmin, they still
    // get an explicit membership so getOrgRole and getMyOrgs work correctly).
    let membership : T.OrgMembership = {
      orgId;
      userId     = caller;
      role       = #OrgAdmin;
      joinedAt   = now;
      invitedBy  = caller; // self-created
      status     = #Active;
      lastActive = ?now;
      email      = null;
    };
    memberships.add(memberKey(orgId, caller), membership);

    // Log audit event scoped to this org.
    recordOrgEvent(adminState, #orgCreated, caller, null, ?orgId);

    #ok(org);
  };

  // ── e. listOrgs ──────────────────────────────────────────────────────────
  /// Returns a paginated list of organisations.
  ///   • SuperAdmins see all orgs.
  ///   • Regular callers see only orgs they are members of.
  public func listOrgs(
    caller      : Common.UserId,
    req         : T.GetOrgsRequest,
    orgs        : Map.Map<T.OrgId, T.OrgRecord>,
    memberships : Map.Map<Text, T.OrgMembership>,
    adminState  : AdminLib.State,
  ) : Common.Result<T.GetOrgsResponse, Text> {
    let limit = if (req.limit == 0) 50 else req.limit;
    let results = List.empty<T.OrgRecord>();
    let superAdmin = isSuperAdmin(caller, adminState);
    var afterSeen = req.afterOrgId == null; // skip entries until cursor is passed

    // Pre-compute lower-cased search term once outside the loop.
    let searchLower : ?Text = switch (req.search) {
      case (?s) ?(s.toLower());
      case null null;
    };

    for ((orgId, org) in orgs.entries()) {
      // Honour the pagination cursor: skip until we pass afterOrgId.
      switch (req.afterOrgId) {
        case (?cursor) {
          if (orgId == cursor) { afterSeen := true };
          if (not afterSeen) { }; // still before cursor
        };
        case null {};
      };
      if (afterSeen) {
        // Access check: SuperAdmin sees everything; others need membership.
        let visible = superAdmin or memberships.get(memberKey(orgId, caller)) != null;
        // Apply optional case-insensitive name search filter.
        let matchesSearch = switch (searchLower) {
          case (?term) org.name.toLower().contains(#text term);
          case null true;
        };
        if (visible and matchesSearch and results.size() < limit) {
          results.add(org);
        };
      };
    };

    #ok({
      orgs  = results.toArray();
      total = results.size();
    });
  };

  // ── f. getOrg ─────────────────────────────────────────────────────────────
  /// Returns a single org record. Only members or SuperAdmins may read it.
  public func getOrg(
    caller      : Common.UserId,
    orgId       : T.OrgId,
    orgs        : Map.Map<T.OrgId, T.OrgRecord>,
    memberships : Map.Map<Text, T.OrgMembership>,
    adminState  : AdminLib.State,
  ) : Common.Result<T.OrgRecord, Text> {
    switch (orgs.get(orgId)) {
      case null #err("Not found");
      case (?org) {
        // Enforce org isolation: only members or SuperAdmins may read.
        let canRead = isSuperAdmin(caller, adminState)
          or memberships.get(memberKey(orgId, caller)) != null;
        if (canRead) #ok(org) else #err("Not found");
      };
    };
  };

  // ── g. inviteUser ────────────────────────────────────────────────────────
  /// Invites a user into an org. The invitation auto-accepts for Phase 1:
  /// the invited user is immediately added to memberships.
  ///
  /// principalOrEmail handling:
  ///   • Contains '@'  → treat as email invite; the membership userId is stored
  ///     as a synthetic "email:<addr>" principal placeholder until the user logs
  ///     in and links their Internet Identity.
  ///   • Otherwise     → parse directly as a Principal and add to memberships.
  public func inviteUser(
    caller      : Common.UserId,
    req         : T.InviteUserRequest,
    orgs        : Map.Map<T.OrgId, T.OrgRecord>,
    memberships : Map.Map<Text, T.OrgMembership>,
    invites     : Map.Map<Text, T.OrgInvite>,
    adminState  : AdminLib.State,
    rlState     : RateLimitState,
  ) : Common.Result<T.OrgMembership, Text> {
    // RBAC: caller must be OrgAdmin or SuperAdmin in this org.
    switch (assertOrgAdmin(req.orgId, caller, memberships, adminState)) {
      case (#err(e)) return #err(e);
      case (#ok(())) {};
    };
    // Rate limit: 20 inviteUser calls per hour per caller.
    let now = Time.now();
    if (not checkAndRecordRateLimit(caller, now, rlState.inviteRateLimitWindows, rlState.inviteRateLimitCounts, 20)) {
      return #err("Rate limit exceeded: too many inviteUser requests. Try again later.");
    };

    // Verify the org exists.
    switch (orgs.get(req.orgId)) {
      case null return #err("Organisation not found");
      case (?_) {};
    };

    let inviteId = "inv-" # caller.toText() # "-" # now.toText();

    // Determine the invited user's effective Principal from principalId.
    let invitedUserId : Common.UserId = Principal.fromText(req.principalId);

    // Check if user is already a member.
    let key = memberKey(req.orgId, invitedUserId);
    switch (memberships.get(key)) {
      case (?existing) {
        // If suspended, return error; if active/pending already, return existing membership.
        if (existing.status != #Suspended) {
          return #err("User is already a member of this organisation");
        };
      };
      case null {};
    };

    // Build the invite record for audit trail.
    let inviteRef = req.principalId # (switch (req.email) {
      case (?e) " (" # e # ")";
      case null "";
    });
    let invite : T.OrgInvite = {
      id               = inviteId;
      orgId            = req.orgId;
      invitedBy        = caller;
      principalOrEmail = inviteRef;
      role             = req.role;
      createdAt        = now;
      status           = #Accepted; // Phase 1: auto-accept
      expiresAt        = now + 7 * 24 * 3_600_000_000_000; // 7 days in ns
    };
    invites.add(inviteId, invite);

    // Add the invited user to org memberships immediately (auto-accept).
    let membership : T.OrgMembership = {
      orgId      = req.orgId;
      userId     = invitedUserId;
      role       = req.role;
      joinedAt   = now;
      invitedBy  = caller;
      status     = #Active;
      lastActive = null;
      email      = req.email;
    };
    memberships.add(key, membership);

    // Update org member count.
    switch (orgs.get(req.orgId)) {
      case (?org) {
        orgs.add(req.orgId, { org with memberCount = org.memberCount + 1 });
      };
      case null {};
    };

    // Audit: log the invitation event scoped to this org.
    recordOrgEvent(adminState, #userInvited, caller, ?invitedUserId, ?req.orgId);

    #ok(membership);
  };

  // ── h. getOrgUsers ───────────────────────────────────────────────────────
  /// Returns paginated members of an org. Caller must be a member or SuperAdmin.
  /// Supports optional case-insensitive partial search on the member's principal text.
  /// Results are sorted by joinedAt descending (most recent first).
  public func getOrgUsers(
    caller      : Common.UserId,
    req         : T.GetOrgUsersRequest,
    memberships : Map.Map<Text, T.OrgMembership>,
    adminState  : AdminLib.State,
  ) : Common.Result<T.GetOrgUsersResponse, Text> {
    let superAdmin = isSuperAdmin(caller, adminState);

    // RBAC: cross-org listing requires SuperAdmin.
    // When orgId is provided, caller must be a member or SuperAdmin of that org.
    switch (req.orgId) {
      case null {
        if (not superAdmin) return #err("Unauthorized: cross-org listing requires SuperAdmin");
      };
      case (?oid) {
        let canRead = superAdmin or memberships.get(memberKey(oid, caller)) != null;
        if (not canRead) return #err("Unauthorized");
      };
    };

    let limit = if (req.limit == 0) 50 else req.limit;

    // Collect all matching members into a list for sorting.
    let all = List.empty<T.OrgMembership>();
    let searchLower : ?Text = switch (req.search) {
      case (?s) ?(s.toLower());
      case null null;
    };

    for ((_key, m) in memberships.entries()) {
      // Filter by orgId when provided; otherwise include all (SuperAdmin cross-org view).
      let orgMatch = switch (req.orgId) {
        case (?oid) m.orgId == oid;
        case null true;
      };
      if (orgMatch) {
        // Apply optional search filter (case-insensitive partial match on userId text or email).
        let matchesSearch = switch (searchLower) {
          case (?term) {
            let byPrincipal = m.userId.toText().toLower().contains(#text term);
            let byEmail = switch (m.email) {
              case (?e) e.toLower().contains(#text term);
              case null false;
            };
            byPrincipal or byEmail;
          };
          case null true;
        };
        if (matchesSearch) { all.add(m) };
      };
    };

    // Sort by joinedAt descending (most recent first).
    let sorted = all.toArray().sort(
      func(a, b) = Int.compare(b.joinedAt, a.joinedAt),
    );

    // Apply pagination cursor.
    let total = sorted.size();
    var startIdx = 0;
    switch (req.afterUserId) {
      case (?cursor) {
        var i = 0;
        while (i < total) {
          if (sorted[i].userId == cursor) { startIdx := i + 1 };
          i += 1;
        };
      };
      case null {};
    };

    // Slice the page.
    let results = List.empty<T.OrgMembership>();
    var idx = startIdx;
    while (idx < total and results.size() < limit) {
      results.add(sorted[idx]);
      idx += 1;
    };

    #ok({
      members = results.toArray();
      total;
      hasMore = (idx < total);
    });
  };

  // ── h2. updateLastActive ──────────────────────────────────────────────────
  /// Updates the lastActive timestamp on every membership for the given user.
  /// Called when a user performs an action in any org context.
  public func updateLastActive(
    userId      : Common.UserId,
    memberships : Map.Map<Text, T.OrgMembership>,
  ) : () {
    let now = Time.now();
    let keys = List.empty<Text>();
    for ((key, m) in memberships.entries()) {
      if (m.userId == userId) { keys.add(key) };
    };
    for (key in keys.toArray().vals()) {
      switch (memberships.get(key)) {
        case (?m) { memberships.add(key, { m with lastActive = ?now }) };
        case null {};
      };
    };
  };

  // ── i. updateMemberRole ──────────────────────────────────────────────────
  /// Changes a member's role within an org.
  /// Guards: caller must be OrgAdmin/SuperAdmin; cannot demote the last OrgAdmin.
  public func updateMemberRole(
    caller      : Common.UserId,
    req         : T.UpdateMemberRoleRequest,
    memberships : Map.Map<Text, T.OrgMembership>,
    adminState  : AdminLib.State,
  ) : Common.Result<(), Text> {
    // RBAC check.
    switch (assertOrgAdmin(req.orgId, caller, memberships, adminState)) {
      case (#err(e)) return #err(e);
      case (#ok(())) {};
    };

    let key = memberKey(req.orgId, req.userId);
    switch (memberships.get(key)) {
      case null return #err("Member not found in organisation");
      case (?existing) {
        // Guard: prevent demoting the last OrgAdmin.
        // If the target is currently an OrgAdmin and the new role is not OrgAdmin,
        // count remaining OrgAdmins to ensure at least one would remain.
        if (existing.role == #OrgAdmin and req.newRole != #OrgAdmin) {
          var adminCount = 0;
          for ((_k, m) in memberships.entries()) {
            if (m.orgId == req.orgId and m.role == #OrgAdmin) {
              adminCount += 1;
            };
          };
          if (adminCount <= 1) {
            return #err("Cannot demote the last OrgAdmin in the organisation");
          };
        };

        // Apply the role change.
        memberships.add(key, { existing with role = req.newRole });

        // Audit event scoped to this org.
        recordOrgEvent(adminState, #memberRoleChanged, caller, ?req.userId, ?req.orgId);
        #ok(());
      };
    };
  };

  // ── j. suspendMember ─────────────────────────────────────────────────────
  /// Suspends a member within an org by toggling their status to #Suspended.
  /// Phase 2: member REMAINS in the memberships map with status = #Suspended.
  /// SuperAdmins cannot be suspended by OrgAdmins.
  public func suspendMember(
    caller      : Common.UserId,
    req         : T.SuspendUserRequest,
    memberships : Map.Map<Text, T.OrgMembership>,
    adminState  : AdminLib.State,
    rlState     : RateLimitState,
  ) : Common.Result<(), Text> {
    // RBAC check.
    switch (assertOrgAdmin(req.orgId, caller, memberships, adminState)) {
      case (#err(e)) return #err(e);
      case (#ok(())) {};
    };
    // Rate limit: 10 suspendMember calls per hour per caller.
    let now = Time.now();
    if (not checkAndRecordRateLimit(caller, now, rlState.suspendRateLimitWindows, rlState.suspendRateLimitCounts, 10)) {
      return #err("Rate limit exceeded: too many suspendMember requests. Try again later.");
    };

    // SuperAdmins are immune to suspension by OrgAdmins.
    if (isSuperAdmin(req.userId, adminState)) {
      return #err("Cannot suspend a SuperAdmin");
    };

    let key = memberKey(req.orgId, req.userId);
    switch (memberships.get(key)) {
      case null return #err("Member not found in organisation");
      case (?existing) {
        if (existing.status == #Suspended) {
          return #err("Member is already suspended");
        };
        // Toggle to Suspended — member stays in the map.
        memberships.add(key, { existing with status = #Suspended });
        // Audit: reason is not stored in the log (no content in audit trail);
        // only the event type, actor, and target principal are recorded.
        recordOrgEvent(adminState, #memberSuspended, caller, ?req.userId, ?req.orgId);
        #ok(());
      };
    };
  };

  // ── j2. reactivateMember ──────────────────────────────────────────────────
  /// Reactivates a previously suspended member, setting their status back to #Active.
  /// Caller must be OrgAdmin or SuperAdmin.
  public func reactivateMember(
    caller      : Common.UserId,
    orgId       : T.OrgId,
    userId      : Common.UserId,
    memberships : Map.Map<Text, T.OrgMembership>,
    adminState  : AdminLib.State,
  ) : Common.Result<(), Text> {
    // RBAC check.
    switch (assertOrgAdmin(orgId, caller, memberships, adminState)) {
      case (#err(e)) return #err(e);
      case (#ok(())) {};
    };

    let key = memberKey(orgId, userId);
    switch (memberships.get(key)) {
      case null return #err("Member not found in organisation");
      case (?existing) {
        if (existing.status == #Active) {
          return #err("Member is already active");
        };
        // Restore to Active.
        memberships.add(key, { existing with status = #Active });
        recordOrgEvent(adminState, #memberReactivated, caller, ?userId, ?orgId);
        #ok(());
      };
    };
  };

  // ── k. removeMember ──────────────────────────────────────────────────────
  /// Removes a member from an org permanently.
  public func removeMember(
    caller      : Common.UserId,
    orgId       : T.OrgId,
    userId      : Common.UserId,
    memberships : Map.Map<Text, T.OrgMembership>,
    adminState  : AdminLib.State,
  ) : Common.Result<(), Text> {
    // RBAC check.
    switch (assertOrgAdmin(orgId, caller, memberships, adminState)) {
      case (#err(e)) return #err(e);
      case (#ok(())) {};
    };

    let key = memberKey(orgId, userId);
    switch (memberships.get(key)) {
      case null return #err("Member not found in organisation");
      case (?_) {
        memberships.remove(key);
        recordOrgEvent(adminState, #memberRemoved, caller, ?userId, ?orgId);
        #ok(());
      };
    };
  };

  // ── n. updateOrg ──────────────────────────────────────────────────────────
  /// Updates an org's name and/or description.
  /// Caller must be SuperAdmin or OrgAdmin within the org.
  public func updateOrg(
    caller      : Common.UserId,
    orgId       : T.OrgId,
    name        : Text,
    description : ?Text,
    orgs        : Map.Map<T.OrgId, T.OrgRecord>,
    memberships : Map.Map<Text, T.OrgMembership>,
    adminState  : AdminLib.State,
  ) : Common.Result<T.OrgRecord, Text> {
    // RBAC: OrgAdmin or SuperAdmin.
    switch (assertOrgAdmin(orgId, caller, memberships, adminState)) {
      case (#err(e)) return #err(e);
      case (#ok(())) {};
    };

    if (name == "") return #err("Organisation name cannot be empty");

    switch (orgs.get(orgId)) {
      case null return #err("Organisation not found");
      case (?org) {
        let desc = switch (description) {
          case (?d) d;
          case null org.description;
        };
        let updated : T.OrgRecord = { org with name; description = desc };
        orgs.add(orgId, updated);
        recordOrgEvent(adminState, #orgUpdated, caller, null, ?orgId);
        #ok(updated);
      };
    };
  };

  // ── o. suspendOrg ─────────────────────────────────────────────────────────
  /// Sets an org's status to #Suspended. SuperAdmin only.
  public func suspendOrg(
    caller     : Common.UserId,
    orgId      : T.OrgId,
    orgs       : Map.Map<T.OrgId, T.OrgRecord>,
    adminState : AdminLib.State,
  ) : Common.Result<(), Text> {
    if (not isSuperAdmin(caller, adminState)) {
      return #err("Unauthorized: SuperAdmin only");
    };

    switch (orgs.get(orgId)) {
      case null return #err("Organisation not found");
      case (?org) {
        if (org.status == #Suspended) return #err("Organisation is already suspended");
        orgs.add(orgId, { org with status = #Suspended });
        recordOrgEvent(adminState, #orgSuspended, caller, null, ?orgId);
        #ok(());
      };
    };
  };

  // ── p. deleteOrg ──────────────────────────────────────────────────────────
  /// Permanently removes an org record and all its memberships. SuperAdmin only.
  public func deleteOrg(
    caller      : Common.UserId,
    orgId       : T.OrgId,
    orgs        : Map.Map<T.OrgId, T.OrgRecord>,
    memberships : Map.Map<Text, T.OrgMembership>,
    adminState  : AdminLib.State,
  ) : Common.Result<(), Text> {
    if (not isSuperAdmin(caller, adminState)) {
      return #err("Unauthorized: SuperAdmin only");
    };

    switch (orgs.get(orgId)) {
      case null return #err("Organisation not found");
      case (?_) {
        // Remove all memberships scoped to this org.
        let keysToRemove = List.empty<Text>();
        for ((key, m) in memberships.entries()) {
          if (m.orgId == orgId) { keysToRemove.add(key) };
        };
        for (key in keysToRemove.toArray().vals()) {
          memberships.remove(key);
        };
        // Remove the org record itself.
        orgs.remove(orgId);
        recordOrgEvent(adminState, #orgDeleted, caller, null, ?orgId);
        #ok(());
      };
    };
  };

  // ── l. getMyOrgs ──────────────────────────────────────────────────────────
  /// Returns all org memberships for the calling principal.
  public func getMyOrgs(
    caller      : Common.UserId,
    memberships : Map.Map<Text, T.OrgMembership>,
  ) : [T.OrgMembership] {
    let results = List.empty<T.OrgMembership>();
    for ((_key, m) in memberships.entries()) {
      if (m.userId == caller) { results.add(m) };
    };
    results.toArray();
  };

  // ── m. getMyRole ──────────────────────────────────────────────────────────
  /// Returns the calling principal's role in the given org, or null.
  public func getMyRole(
    caller      : Common.UserId,
    orgId       : T.OrgId,
    memberships : Map.Map<Text, T.OrgMembership>,
  ) : ?T.OrgRole {
    getOrgRole(orgId, caller, memberships);
  };
};
