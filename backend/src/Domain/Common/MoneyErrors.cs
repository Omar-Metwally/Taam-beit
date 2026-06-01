using SharedKernel;

namespace Domain.Common;

public static class MoneyErrors
{
    public static readonly Error NegativeAmount = Error.Problem(
        "Money.NegativeAmount",
        "Monetary amount cannot be negative.");

    public static readonly Error InvalidCurrency = Error.Problem(
        "Money.InvalidCurrency",
        "Currency code cannot be empty.");
}
