import Common "../types/common";
import T "../types/calls";
import CallsLib "../lib/calls";

mixin (callsState : CallsLib.State) {
  /// Initiate a WebRTC call (stores encrypted SDP offer for polling).
  public shared ({ caller }) func initiateCall(
    req : T.InitiateCallRequest
  ) : async Common.Result<T.CallRecordPublic, Common.Error> {
    CallsLib.initiateCall(callsState, caller, req)
  };

  /// Answer a call (stores encrypted SDP answer).
  public shared ({ caller }) func answerCall(
    req : T.AnswerCallRequest
  ) : async Common.Result<T.CallRecordPublic, Common.Error> {
    CallsLib.answerCall(callsState, caller, req)
  };

  /// Add an ICE candidate to a call.
  public shared ({ caller }) func addIceCandidate(
    req : T.AddIceCandidateRequest
  ) : async Common.Result<(), Common.Error> {
    CallsLib.addIceCandidate(callsState, caller, req)
  };

  /// End or decline a call.
  public shared ({ caller }) func endCall(
    callId : Common.CallId,
    reason : T.CallStatus,
  ) : async Common.Result<(), Common.Error> {
    CallsLib.endCall(callsState, caller, callId, reason)
  };

  /// Poll a call record for signaling state (SDP answer, ICE candidates).
  public shared query ({ caller }) func getCall(
    callId : Common.CallId
  ) : async ?T.CallRecordPublic {
    CallsLib.getCall(callsState, caller, callId)
  };

  /// List active calls involving the caller.
  public shared query ({ caller }) func listActiveCalls() : async [T.CallRecordPublic] {
    CallsLib.listActiveCalls(callsState, caller)
  };
  /// Decline an incoming call (callee only — shorthand for endCall with #declined).
  public shared ({ caller }) func declineCall(
    callId : Common.CallId
  ) : async Common.Result<(), Common.Error> {
    CallsLib.endCall(callsState, caller, callId, #declined)
  };
};
