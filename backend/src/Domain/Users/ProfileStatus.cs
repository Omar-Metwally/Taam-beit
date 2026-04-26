namespace Domain.Users;

/// <summary>
/// Approval status for chef and delivery man role applications.
/// </summary>
public enum ProfileStatus
{
    /// <summary>Application submitted, awaiting supervisor review.</summary>
    Pending = 0,

    /// <summary>Approved by supervisor — role is active.</summary>
    Approved = 1,

    /// <summary>Application rejected by supervisor.</summary>
    Rejected = 2,

    /// <summary>Previously approved but later suspended.</summary>
    Suspended = 3
}
