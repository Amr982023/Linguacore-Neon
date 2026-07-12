using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.DTOs.Response;


// Scholarship, DiscountPct, LanguageId, LevelId REMOVED from Student responses.
// Languages and Levels are now derived lists from active enrollments.
// NestedGoalId / NestedGoalName ADDED.


public record StudentResponse(
    Guid Id,
    Guid BranchId,
    string BranchName,
    PersonResponse Person,
    string AttendanceMode,
    string QrCode,
    bool IsActive,
    Guid? GoalId,
    string? GoalName,
    Guid? NestedGoalId,
    string? NestedGoalName,
    IEnumerable<string> ActiveLanguages,   // DISTINCT — from active enrollments only
    IEnumerable<string> ActiveLevels,      // DISTINCT — from active enrollments only
    string? Notes,
    DateTime CreatedAt,
    DateTime ModifiedAt);


public record StudentDetailResponse(
    Guid Id,
    Guid BranchId,
    string BranchName,
    PersonResponse Person,
    string AttendanceMode,
    string QrCode,
    bool IsActive,
    Guid? GoalId,
    string? GoalName,
    Guid? NestedGoalId,
    string? NestedGoalName,
    IEnumerable<string> ActiveLanguages,   // DISTINCT from active enrollments
    IEnumerable<string> ActiveLevels,      // DISTINCT from active enrollments
    IEnumerable<EnrollmentResponse> ActiveEnrollments, // status: Pending|Active|Suspended|Partial
    IEnumerable<EnrollmentResponse> AllEnrollments,    // history: every enrollment
    IEnumerable<CertificateResponse> Certificates,
    string? Notes,
    DateTime CreatedAt,
    DateTime ModifiedAt);




