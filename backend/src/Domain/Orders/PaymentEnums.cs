namespace Domain.Orders;

public enum PaymentMethod
{
    CashOnDelivery = 0,
    Card = 1,
    Wallet = 2
}

public enum PaymentStatus
{
    /// <summary>Payment not yet collected or processed.</summary>
    Pending = 0,

    /// <summary>Payment successfully completed.</summary>
    Paid = 1,

    /// <summary>Payment failed (card declined, etc.).</summary>
    Failed = 2,

    /// <summary>Payment was refunded after cancellation or rejection.</summary>
    Refunded = 3
}
