using SharedKernel;

namespace Domain.Meals;

public sealed record MealCreatedDomainEvent(Guid MealId, Guid ChefId) : IDomainEvent;
