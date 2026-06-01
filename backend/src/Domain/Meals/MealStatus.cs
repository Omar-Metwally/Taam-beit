namespace Domain.Meals;

/// <summary>
/// Represents the lifecycle state of a meal.
///
/// Transitions:
///   Draft   ←→  Active   (chef toggles availability)
///   Draft    →  Archived (chef archives)
///   Active   →  Archived (chef archives — only if no active/pending orders)
///   Archived →  Draft    (chef restores)
/// </summary>
public enum MealStatus
{
    /// <summary>
    /// Meal has been created but is not visible to customers.
    /// This is the initial state after creation.
    /// </summary>
    Draft = 0,

    /// <summary>
    /// Meal is live and orderable by customers.
    /// </summary>
    Active = 1,

    /// <summary>
    /// Meal has been archived by the chef.
    /// Hidden from discovery and the dashboard active list,
    /// but preserved in the database for order history integrity.
    /// </summary>
    Archived = 2,
}