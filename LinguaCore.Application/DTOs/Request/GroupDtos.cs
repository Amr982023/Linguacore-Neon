namespace LinguaCore.Application.DTOs.Request;

public record CreateGroupRequest(
    Guid BranchId, Guid LanguageLevelId, Guid InstructorId,
    Guid? HallId, Guid? ZoomAccountId,
    Guid GroupCategoryId, Guid GroupTypeId,
    Guid DeliveryModeId, Guid GroupStatusId,
    string Name, decimal InstructorCommissionPct,
    string PaymentStrategy, decimal FeeAmount,
    int SessionsPerMonth, int GracePeriodDays,
    DateTime StartDate, int? MaxCapacity);

public record UpdateGroupRequest(
    Guid Id, string Name,
    Guid LanguageLevelId,
    Guid GroupCategoryId, Guid GroupTypeId,
    Guid DeliveryModeId, Guid GroupStatusId,
    Guid? HallId, Guid? ZoomAccountId,
    string PaymentStrategy, decimal FeeAmount,
    decimal InstructorCommissionPct,
    int SessionsPerMonth, int GracePeriodDays,
    DateTime StartDate, int? MaxCapacity);

public record ChangeGroupInstructorRequest(
    Guid GroupId, Guid NewInstructorId,
    decimal NewCommissionPct, DateTime EffectiveFrom);
public record ExitEnrollmentRequest(
    Guid EnrollmentId,
    Guid PaymentMethodId,   // refund payment method
    Guid ProcessedBy,       // userId performing the exit
    int SessionsAttended,
    int SessionsTotal,
    DateTime ExitDate);
