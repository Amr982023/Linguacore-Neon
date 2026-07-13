namespace LinguaCore.Application.DTOs.Response;

public record GroupResponse(
    Guid Id, Guid BranchId, string BranchName,
    Guid LanguageLevelId,                          // ADD
    Guid LanguageId,
    string LanguageName,
    Guid LevelId, string LevelCode,
    Guid InstructorId, string InstructorName,
    Guid? HallId, string? HallName,                // ADD HallId
    Guid? ZoomAccountId, string? ZoomAccountName,  // ADD ZoomAccountId
    Guid GroupCategoryId,                          // ADD
    Guid GroupTypeId,                              // ADD
    Guid DeliveryModeId,                           // ADD
    Guid GroupStatusId,                            // ADD
    string Name, string GroupCategory, string GroupType,
    string DeliveryMode, string GroupStatus,
    decimal InstructorCommissionPct, string PaymentStrategy,
    decimal FeeAmount, int SessionsPerMonth,
    int GracePeriodDays, DateTime StartDate,
    int? MaxCapacity, int EnrolledCount,
    DateTime CreatedAt, DateTime ModifiedAt);