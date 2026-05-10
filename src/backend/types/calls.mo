import Common "common";

module {
  public type CallType = { #audio; #video };

  public type CallStatus = {
    #ringing;
    #active;
    #ended;
    #declined;
    #missed;
  };

  // SDP and ICE blobs are encrypted end-to-end
  public type CallRecord = {
    id : Common.CallId;
    caller : Common.UserId;
    callees : [Common.UserId];     // single-element for 1:1, multiple for group
    conversationId : ?Common.ConversationId;
    callType : CallType;
    var status : CallStatus;
    encryptedSdpOffer : ?Blob;     // encrypted SDP offer from caller
    var encryptedSdpAnswer : ?Blob; // encrypted SDP answer from callee
    var iceCandiates : [Blob];     // accumulated ICE candidates (encrypted)
    initiatedAt : Common.Timestamp;
    var updatedAt : Common.Timestamp;
  };

  // Shared (API-boundary) variant — no var fields
  public type CallRecordPublic = {
    id : Common.CallId;
    caller : Common.UserId;
    callees : [Common.UserId];
    conversationId : ?Common.ConversationId;
    callType : CallType;
    status : CallStatus;
    encryptedSdpOffer : ?Blob;
    encryptedSdpAnswer : ?Blob;
    iceCandidates : [Blob];
    initiatedAt : Common.Timestamp;
    updatedAt : Common.Timestamp;
  };

  public type InitiateCallRequest = {
    callees : [Common.UserId];
    conversationId : ?Common.ConversationId;
    callType : CallType;
    encryptedSdpOffer : Blob;
  };

  public type AnswerCallRequest = {
    callId : Common.CallId;
    encryptedSdpAnswer : Blob;
  };

  public type AddIceCandidateRequest = {
    callId : Common.CallId;
    encryptedIceCandidate : Blob;
  };
};
