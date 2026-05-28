import Common "common";
import OrgTypes "orgs";

module {
  public type GroupStatus = {
    #active;
    #suspended;
  };

  public type GroupAdminRecord = {
    id          : Common.ConversationId;
    name        : Text;
    orgId       : ?OrgTypes.OrgId;
    memberCount : Nat;
    createdAt   : Common.Timestamp;
    createdBy   : Common.UserId;
    status      : GroupStatus;
  };

  public type GroupMemberRecord = {
    userId      : Common.UserId;
    joinedAt    : Common.Timestamp;
    displayName : ?Text;
  };

  public type GetAllGroupsRequest = {
    orgId : ?OrgTypes.OrgId;
  };

  public type GetGroupMembersRequest = {
    groupId : Common.ConversationId;
  };

  public type RemoveMemberFromGroupRequest = {
    groupId  : Common.ConversationId;
    memberId : Common.UserId;
  };
};
