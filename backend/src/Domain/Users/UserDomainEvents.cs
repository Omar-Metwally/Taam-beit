using SharedKernel;

namespace Domain.Users;

public sealed record UserRegisteredDomainEvent(Guid UserId) : IDomainEvent;

public sealed record UserAppliedAsChefDomainEvent(Guid UserId) : IDomainEvent;

public sealed record UserChefProfileApprovedDomainEvent(
    Guid UserId,
    Guid SupervisorUserId) : IDomainEvent;

public sealed record UserChefProfileRejectedDomainEvent(
    Guid UserId,
    Guid SupervisorUserId,
    string Reason) : IDomainEvent;

public sealed record UserAppliedAsDeliveryManDomainEvent(Guid UserId) : IDomainEvent;

public sealed record UserDeliveryManProfileApprovedDomainEvent(
    Guid UserId,
    Guid SupervisorUserId) : IDomainEvent;

public sealed record UserDeliveryManProfileRejectedDomainEvent(
    Guid UserId,
    Guid SupervisorUserId,
    string Reason) : IDomainEvent;
