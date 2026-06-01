using SharedKernel;

namespace Domain.Deliveries;

public static class DeliveryErrors
{
    public static Error NotFound(Guid deliveryTrackingId) => Error.NotFound(
        "Deliveries.NotFound",
        $"The delivery tracking record with Id = '{deliveryTrackingId}' was not found.");

    public static Error NotFoundByOrder(Guid orderId) => Error.NotFound(
        "Deliveries.NotFoundByOrder",
        $"No delivery tracking record found for order '{orderId}'.");

    public static Error InvalidStatusTransition(DeliveryStatus current, DeliveryStatus target) => Error.Problem(
        "Deliveries.InvalidStatusTransition",
        $"Cannot transition delivery from '{current}' to '{target}'.");
}
