using SharedKernel;

namespace Infrastructure.DateTimeProvider;

public class DateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow => TimeProvider.System.GetUtcNow().UtcDateTime;
}