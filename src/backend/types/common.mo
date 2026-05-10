import Time "mo:core/Time";

module {
  // Shared identity and time primitives
  public type UserId = Principal;
  public type ConversationId = Nat;
  public type MessageId = Nat;
  public type CallId = Nat;
  public type AttachmentId = Nat;
  public type Timestamp = Int; // Time.now() nanoseconds

  // Generic result wrapper
  public type Result<T, E> = { #ok : T; #err : E };

  // Common errors
  public type Error = {
    #unauthorized;
    #notFound;
    #alreadyExists;
    #invalidInput;
    #forbidden;
  };
};
