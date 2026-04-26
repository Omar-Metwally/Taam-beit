using SharedKernel;

namespace Domain.Common;

/// <summary>
/// Represents a monetary amount with currency.
/// Immutable value object to avoid accidental mutation of prices.
/// </summary>
public sealed record Money
{
    public decimal Amount { get; init; }
    public string Currency { get; init; }

    private Money() { }

    public static Result<Money> Create(decimal amount, string currency)
    {
        if (amount < 0)
            return Result.Failure<Money>(MoneyErrors.NegativeAmount);

        if (string.IsNullOrWhiteSpace(currency))
            return Result.Failure<Money>(MoneyErrors.InvalidCurrency);

        return Result.Success(new Money
        {
            Amount = amount,
            Currency = currency.ToUpperInvariant()
        });
    }

    public static Money Zero(string currency = "USD") => new() { Amount = 0, Currency = currency };

    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException($"Cannot add money in different currencies: {Currency} and {other.Currency}.");

        return this with { Amount = Amount + other.Amount };
    }

    public Money Multiply(int quantity) => this with { Amount = Amount * quantity };

    public override string ToString() => $"{Amount:F2} {Currency}";
}
