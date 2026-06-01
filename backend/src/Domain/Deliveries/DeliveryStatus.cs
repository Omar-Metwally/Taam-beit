namespace Domain.Deliveries;

public enum DeliveryStatus
{
    /// <summary>Delivery man accepted the order and is heading to the chef for pickup.</summary>
    Assigned = 0,

    /// <summary>Delivery man picked up the order from the chef.</summary>
    PickedUp = 1,

    /// <summary>Order successfully handed to the customer.</summary>
    Delivered = 2
}
