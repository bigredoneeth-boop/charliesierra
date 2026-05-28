module {
  public type PasswordPolicy = { #basic; #strong; #enterprise };

  public type RetentionPeriodDays = { #days30; #days90; #year1; #years7; #unlimited };

  public type GroupCreationPermission = { #orgAdminsOnly; #allMembers };

  public type DataExportPermission = { #disabled; #orgAdminsOnly; #allMembers };

  public type PlatformSettings = {
    platformName            : Text;
    platformTagline         : Text;
    mfaEnforced             : Bool;
    sessionTimeoutMinutes   : Nat;
    passwordPolicy          : PasswordPolicy;
    defaultRetentionDays    : RetentionPeriodDays;
    vetKeysEnabled          : Bool;
    keyEscrowEnabled        : Bool;
    auditLogRetentionDays   : RetentionPeriodDays;
  };

  public type OrgSettings = {
    orgId                   : Text;
    defaultInviteRole       : Text;  // "orgAdmin" | "auditor" | "standardUser"
    messageRetentionDays    : ?RetentionPeriodDays;
    groupCreationPermission : GroupCreationPermission;
    legalHoldEnabled        : Bool;
    legalHoldReason         : ?Text;
    dataExportPermission    : DataExportPermission;
    logoUrl                 : ?Text;
    logoStorageKey          : ?Text;
  };
};
