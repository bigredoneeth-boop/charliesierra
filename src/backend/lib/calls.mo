module {


  /// Initiate a new call (stores encrypted SDP offer).
  public func initiateCall(
    s : State,
    caller : Common.UserId,
    req : T.InitiateCallRequest,
  ) : Common.Result<T.CallRecordPublic, Common.Error> {
    // Require at least one callee
    if (req.callees.size() == 0) {
      return #err(#invalidInput);
    };
    let callId = s.state.nextId;
    s.state.nextId += 1;
    let now = Time.now();
    let record : T.CallRecord = {
      id = callId;
      caller = caller;
      callees = req.callees;
      conversationId = req.conversationId;
      callType = req.callType;
      var status = #ringing;
      encryptedSdpOffer = ?req.encryptedSdpOffer;
      var encryptedSdpAnswer = null;
      var iceCandidates = [];
      initiatedAt = now;
      var updatedAt = now;
    };
    s.calls.add(callId, record);
    #ok(toPublic(record))
  };

  /// Answer a call (stores encrypted SDP answer, transitions to #active).
  public func answerCall(
    s : State,
    caller : Common.UserId,
    req : T.AnswerCallRequest,
  ) : Common.Result<T.CallRecordPublic, Common.Error> {
    switch (s.calls.get(req.callId)) {
      case null { #err(#notFound) };
      case (?record) {
        // Only a listed callee can answer
        let isCallee = record.callees.find(func(c : Common.UserId) : Bool {
          Principal.equal(c, caller)
        });
        switch (isCallee) {
          case null { #err(#unauthorized) };
          case (?_) {
            if (record.status != #ringing) {
              return #err(#forbidden);
            };
            record.encryptedSdpAnswer := ?req.encryptedSdpAnswer;
            record.status := #active;
            record.updatedAt := Time.now();
            #ok(toPublic(record))
          };
        }
      };
    }
  };

  /// Add an ICE candidate blob to a call.
  public func addIceCandidate(
    s : State,
    caller : Common.UserId,
    req : T.AddIceCandidateRequest,
  ) : Common.Result<(), Common.Error> {
    switch (s.calls.get(req.callId)) {
      case null { #err(#notFound) };
      case (?record) {
        // Any participant (caller or callee) may add ICE candidates
        let isParticipant = Principal.equal(record.caller, caller) or
          record.callees.find(func(c : Common.UserId) : Bool {
            Principal.equal(c, caller)
          }) != null;
        if (not isParticipant) {
          return #err(#unauthorized);
        };
        if (record.status != #ringing and record.status != #active) {
          return #err(#forbidden);
        };
        record.iceCandidates := record.iceCandidates.concat([req.encryptedIceCandidate]);
        record.updatedAt := Time.now();
        #ok(())
      };
    }
  };

  /// Decline or end a call.
  public func endCall(
    s : State,
    caller : Common.UserId,
    callId : Common.CallId,
    reason : T.CallStatus,
  ) : Common.Result<(), Common.Error> {
    switch (s.calls.get(callId)) {
      case null { #err(#notFound) };
      case (?record) {
        let isParticipant = Principal.equal(record.caller, caller) or
          record.callees.find(func(c : Common.UserId) : Bool {
            Principal.equal(c, caller)
          }) != null;
        if (not isParticipant) {
          return #err(#unauthorized);
        };
        // decline is callee-only
        if (reason == #declined) {
          let isCallee = record.callees.find(func(c : Common.UserId) : Bool {
            Principal.equal(c, caller)
          });
          if (isCallee == null) {
            return #err(#forbidden);
          };
        };
        record.status := reason;
        record.updatedAt := Time.now();
        #ok(())
      };
    }
  };

  /// Poll the current state of a call (for WebRTC signaling).
  public func getCall(
    s : State,
    caller : Common.UserId,
    callId : Common.CallId,
  ) : ?T.CallRecordPublic {
    switch (s.calls.get(callId)) {
      case null { null };
      case (?record) {
        let isParticipant = Principal.equal(record.caller, caller) or
          record.callees.find(func(c : Common.UserId) : Bool {
            Principal.equal(c, caller)
          }) != null;
        if (isParticipant) { ?toPublic(record) } else { null }
      };
    }
  };

  /// List active calls involving the caller.
  public func listActiveCalls(
    s : State,
    caller : Common.UserId,
  ) : [T.CallRecordPublic] {
    s.calls.entries().filterMap<(Common.CallId, T.CallRecord), T.CallRecordPublic>(
      func((_, record)) {
        let isParticipant = Principal.equal(record.caller, caller) or
          record.callees.find(func(c : Common.UserId) : Bool {
            Principal.equal(c, caller)
          }) != null;
        let isActive = record.status == #ringing or record.status == #active;
        if (isParticipant and isActive) { ?toPublic(record) } else { null }
      }
    ).toArray()
  };

  /// Convert internal call record to public.
  public func toPublic(c : T.CallRecord) : T.CallRecordPublic {
    {
      id = c.id;
      caller = c.caller;
      callees = c.callees;
      conversationId = c.conversationId;
      callType = c.callType;
      status = c.status;
      encryptedSdpOffer = c.encryptedSdpOffer;
      encryptedSdpAnswer = c.encryptedSdpAnswer;
      iceCandidates = c.iceCandidates;
      initiatedAt = c.initiatedAt;
      updatedAt = c.updatedAt;
    }
  };
};
