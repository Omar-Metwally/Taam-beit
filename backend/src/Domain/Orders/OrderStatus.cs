namespace Domain.Orders;

public enum OrderStatus
{
    /// <summary>Order placed by customer, awaiting chef confirmation.</summary>
    Pending = 0,

    /// <summary>Chef accepted the order and will prepare it.</summary>
    Confirmed = 1,

    /// <summary>Chef is actively preparing the order.</summary>
    Preparing = 2,

    /// <summary>
    /// Chef finished cooking. Order is waiting for a delivery man to pick it up.
    /// Nearby delivery men are notified at this point.
    /// </summary>
    ReadyForPickup = 3,

    /// <summary>A delivery man accepted and picked up the order.</summary>
    OutForDelivery = 4,

    /// <summary>Order successfully delivered to the customer.</summary>
    Delivered = 5,

    /// <summary>Chef declined the order.</summary>
    Rejected = 6,

    /// <summary>Customer cancelled — only allowed before Preparing.</summary>
    Cancelled = 7
}
