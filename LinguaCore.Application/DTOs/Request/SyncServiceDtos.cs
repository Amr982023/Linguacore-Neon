// ============================================================================
// FILE: SyncDtos.cs
//
// One DTO per synced entity. Rules:
//   - Only the fields that belong in the sync payload
//   - No navigation properties
//   - No computed properties (e.g. SerialNumber default, QrCode default)
//   - Nullable mirrors entity nullability exactly
//   - CreatedAt included for insert; ModifiedAt carried as the event timestamp
//     (passed separately as `incoming` — not inside the DTO)
//   - User.PasswordHash intentionally excluded
// ============================================================================

namespace LinguaCore.Infrastructure.Services.SyncServiceDtos;

// ── TIER 1 ────────────────────────────────────────────────────────────────────

public sealed class PersonSyncDto
{
    public string FirstName { get; set; } = string.Empty;
    public string? SecondName { get; set; }
    public string LastName { get; set; } = string.Empty;
    public string? NationalId { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public string? Phone { get; set; }
    public string? WhatsappNumber { get; set; }
    public string? Address { get; set; }
    public string? Email { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class BranchSyncDto
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? GmailConfig { get; set; }
    public string? WhatsappConfig { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LanguageSyncDto
{
    public string? Name { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid BranchId { get; set; }  // ← NEW
}

public class LevelSyncDto
{
    public string? Code { get; set; }
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid BranchId { get; set; }  // ← NEW
}

public class PeriodLabelSyncDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
    public Guid BranchId { get; set; }  // ← NEW
}

// ── TIER 2 ────────────────────────────────────────────────────────────────────

public sealed class HallSyncDto
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? Capacity { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
public class GroupPeriodSyncDto
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid PeriodLabelId { get; set; }
    public int ExpectedSessionsCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
}

public class CenterDeductionSyncDto
{
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime DeductionDate { get; set; }
    public Guid CreatedBy { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}
public sealed class ZoomAccountSyncDto
{
    public Guid BranchId { get; set; }
    public string AccountEmail { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int MaxParticipants { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GenericClosingRefundSnapshotSyncDto
{
    public Guid GenericClosingId { get; set; }
    public Guid RefundRecordId { get; set; }
    public Guid StudentId { get; set; }
    public Guid GroupId { get; set; }
    public int SessionsAttended { get; set; }
    public int SessionsTotal { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal RefundAmount { get; set; }
    public DateTime RefundDate { get; set; }
    public DateTime CreatedAt { get; set; }
}
public sealed class LanguageLevelSyncDto
{
    public Guid BranchId { get; set; }
    public Guid LanguageId { get; set; }
    public Guid LevelId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class StudentSyncDto
{
    public Guid Id { get; set; }
    public Guid BranchId { get; set; }
    public Guid PersonId { get; set; }
    public Guid? GoalId { get; set; }
    public Guid? NestedGoalId { get; set; }
    public string? AttendanceMode { get; set; }
    public string? QrCode { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }

    // ── Denormalized Person fields (present in bootstrap payload) ──
    public string? FirstName { get; set; }
    public string? SecondName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public string? WhatsappNumber { get; set; }
    public string? Email { get; set; }
    public string? Gender { get; set; }
    public int? Age { get; set; }
    public string? NationalId { get; set; }
    public string? Address { get; set; }
}
public class InstructorSyncDto
{
    public Guid Id { get; set; }
    public Guid BranchId { get; set; }
    public Guid PersonId { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }

    // Denormalized Person fields
    public string? FirstName { get; set; }
    public string? SecondName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public string? WhatsappNumber { get; set; }
    public string? Email { get; set; }
    public string? Gender { get; set; }

    // ── Denormalized InstructorLanguages ──────────────────────────────────
    public List<InstructorLanguageItemDto>? Languages { get; set; }
}

public class InstructorLanguageItemDto
{
    public Guid LanguageId { get; set; }
    public bool Certified { get; set; }
    public string? LanguageName { get; set; }  // ← add this
}

/// <summary>
/// PasswordHash is intentionally absent.
/// The synced User record satisfies FK constraints only.
/// Authentication remains local to each branch.
/// </summary>
public sealed class UserSyncDto
{
    public Guid BranchId { get; set; }
    public Guid RoleId { get; set; }
    public Guid PersonId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;  // ADDED
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ── TIER 3 ────────────────────────────────────────────────────────────────────

public class InstructorLanguageSyncDto
{
    public Guid Id { get; set; }
    public Guid InstructorId { get; set; }
    public Guid LanguageId { get; set; }
    public bool Certified { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }

    // ── Denormalized for self-sufficiency ─────────────────────────────────
    public string? LanguageName { get; set; }
}

public class GroupSyncDto
{
    public Guid Id { get; set; }
    public Guid BranchId { get; set; }
    public Guid LanguageLevelId { get; set; }
    public Guid InstructorId { get; set; }
    public Guid? HallId { get; set; }
    public Guid? ZoomAccountId { get; set; }
    public Guid? GroupCategoryId { get; set; }
    public Guid? GroupTypeId { get; set; }
    public Guid? DeliveryModeId { get; set; }
    public Guid? GroupStatusId { get; set; }
    public string? Name { get; set; }
    public decimal InstructorCommissionPct { get; set; }
    public string? PaymentStrategy { get; set; }
    public decimal FeeAmount { get; set; }
    public int SessionsPerMonth { get; set; }
    public int GracePeriodDays { get; set; }
    public DateTime? StartDate { get; set; }
    public int? MaxCapacity { get; set; }
    public int ExpectedSessionsCount { get; set; }  // ← NEW
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
    // Denormalized
    public Guid? LanguageId { get; set; }
    public string? LanguageName { get; set; }
    public Guid? LevelId { get; set; }
    public string? LevelCode { get; set; }
    public string? LevelDescription { get; set; }
    public int LevelDisplayOrder { get; set; }
}
public sealed class WaitingListSyncDto
{
    public Guid BranchId { get; set; }
    public Guid LanguageId { get; set; }
    public Guid LevelId { get; set; }
    public Guid? AssignedTo { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public decimal ReservationFee { get; set; }
    public DateTime RegisteredAt { get; set; }
    public string Status { get; set; } = "WAITING";
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ── TIER 4 ────────────────────────────────────────────────────────────────────

public sealed class GroupInstructorHistorySyncDto
{
    public Guid GroupId { get; set; }
    public Guid InstructorId { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public decimal CommissionPct { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class EnrollmentSyncDto
{
    public Guid StudentId { get; set; }
    public Guid GroupId { get; set; }
    public Guid EnrollStatusId { get; set; }   // seeded — no dep check
    public DateTime EnrollDate { get; set; }
    public decimal EffectiveFee { get; set; }
    public bool IsPartial { get; set; }
    public DateTime? PartialStart { get; set; }
    public DateTime? PartialEnd { get; set; }
    public decimal? PartialCost { get; set; }
    public bool Scholarship { get; set; }
    public decimal DiscountPct { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GenericClosingPartialPaymentSyncDto
{
    public Guid Id { get; set; }
    public Guid GenericClosingId { get; set; }
    public Guid PaymentId { get; set; }
    public Guid GroupId { get; set; }
    public Guid PeriodLabelId { get; set; }
    public int ProcessedSessionsCount { get; set; }
    public int ExpectedSessionsCount { get; set; }
    public decimal AmountPaid { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }

}

public class GenericClosingCenterDeductionSyncDto
{
    public Guid GenericClosingId { get; set; }
    public Guid? CenterDeductionId { get; set; }   // ← NEW
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime DeductionDate { get; set; }    // ← NEW
    public DateTime CreatedAt { get; set; }
}

public class GenericClosingInstructorBonusSyncDto
{
    public Guid Id { get; set; }
    public Guid GenericClosingInstructorId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
}

public class GenericClosingInstructorSalaryDeductionSyncDto
{
    public Guid Id { get; set; }
    public Guid GenericClosingInstructorId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
}

public class SessionSyncDto
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid InstructorId { get; set; }
    public Guid? HallId { get; set; }
    public Guid? ZoomAccountId { get; set; }
    public Guid PeriodLabelId { get; set; }
    public int SessionNumber { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? ActualDate { get; set; }
    public string? Topic { get; set; }
    public string? Status { get; set; }
    public string? CancelledReason { get; set; }
    public bool IsCommissionFullyDistributed { get; set; } // ← NEW
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
}

public sealed class ExamSyncDto
{
    public Guid GroupId { get; set; }
    public Guid CreatedBy { get; set; }
    public bool IsFinalExam { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal TotalMarks { get; set; }
    public decimal PassPercentage { get; set; }
    public DateTime ExamDate { get; set; }
    public int DurationMins { get; set; }
    public bool IsCustom { get; set; }
    public DateTime CreatedAt { get; set; }
}



// ── TIER 5 ────────────────────────────────────────────────────────────────────

public sealed class AttendanceSyncDto
{
    public Guid SessionId { get; set; }
    public Guid StudentId { get; set; }
    public Guid RecordedBy { get; set; }
    public Guid? RevertedBy { get; set; }
    public string Method { get; set; } = "MANUAL";
    public string Status { get; set; } = "PRESENT";
    public DateTime RecordedAt { get; set; }
    public bool Reverted { get; set; }
    public string? RevertReason { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PaymentSyncDto
{
    public Guid Id { get; set; }
    public Guid EnrollmentId { get; set; }
    public Guid PaymentMethodId { get; set; }
    public Guid RecordedBy { get; set; }
    public Guid PeriodLabelId { get; set; }
    public decimal AmountDue { get; set; }
    public decimal AmountPaid { get; set; }
    public DateTime PaymentDate { get; set; }
    public DateTime DueDate { get; set; }
    public string? Notes { get; set; }
    public int ProcessedSessionsCount { get; set; }           // ← NEW
    public bool CommissionDistributionCompleted { get; set; } // ← NEW
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
    public bool IsCommissionDistributionBlocked { get; set; }
}

public sealed class ExamResultSyncDto
{
    public Guid ExamId { get; set; }
    public Guid StudentId { get; set; }
    public Guid RecordedBy { get; set; }
    public decimal MarksObtained { get; set; }
    public bool Passed { get; set; }
    public int AttemptNumber { get; set; }
    public bool IsRetake { get; set; }
    public string? RetakeReason { get; set; }
    public DateTime RecordedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}



// ── TIER 6 ────────────────────────────────────────────────────────────────────

public sealed class CertificateSyncDto
{
    public Guid StudentId { get; set; }
    public Guid LanguageLevelId { get; set; }
    public Guid? ExamResultId { get; set; }
    public string SerialNumber { get; set; } = string.Empty;  // never regenerate
    public DateTime IssuedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RefundRecordSyncDto
{
    public Guid StudentId { get; set; }
    public Guid PaymentId { get; set; }
    public Guid PaymentMethodId { get; set; }
    public Guid ProcessedBy { get; set; }
    public int SessionsAttended { get; set; }
    public int SessionsTotal { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal RefundAmount { get; set; }
    public decimal CalculatedRefundAmount { get; set; }  // ← NEW
    public decimal ActualRefundAmount { get; set; }      // ← NEW
    public string? AdjustmentReason { get; set; }        // ← NEW
    public DateTime RefundDate { get; set; }
    public DateTime CreatedAt { get; set; }
}
public class GenericClosingSyncDto
{
    public Guid Id { get; set; }
    public Guid BranchId { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string? Status { get; set; }
    public Guid CreatedBy { get; set; }
    public Guid? ConfirmedBy { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? Notes { get; set; }
    public decimal TotalCenterDeductions { get; set; }  // ← NEW
    public decimal CenterNetEarned { get; set; }         // ← NEW
    public decimal TotalInstructorBonuses { get; set; }            // ← NEW
    public decimal TotalInstructorSalaryDeductions { get; set; }   // ← NEW
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
    // Denormalized User
    public string? CreatedByName { get; set; }
    public string? CreatedByEmail { get; set; }
    public Guid? CreatedByPersonId { get; set; }
    public Guid? CreatedByRoleId { get; set; }
    public decimal TotalIncomeReceived { get; set; }
    public decimal TotalRefunded { get; set; }
}


public class GenericClosingInstructorSyncDto
{
    public Guid Id { get; set; }
    public Guid GenericClosingId { get; set; }
    public Guid InstructorId { get; set; }
    public decimal TotalGross { get; set; }
    public decimal TotalCommission { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal TotalBonus { get; set; }                 // ← NEW
    public decimal TotalSalaryDeductions { get; set; }       // ← NEW
    public decimal NetPayable { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
}

public class GenericClosingDetailSyncDto
{
    public Guid Id { get; set; }
    public Guid GenericClosingInstructorId { get; set; }
    public Guid CommissionLedgerId { get; set; }
    public Guid GroupId { get; set; }
    public Guid PaymentId { get; set; }
    public Guid? SessionId { get; set; }          // ← NEW
    public decimal GrossPayment { get; set; }
    public decimal CommissionAmount { get; set; }
    public bool IsAdjustment { get; set; }
    public bool IsFromPreviousPeriod { get; set; } // ← NEW
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }
}

public class CommissionLedgerSyncDto
{
    public Guid Id { get; set; }
    public Guid PaymentId { get; set; }
    public Guid InstructorId { get; set; }
    public Guid GroupId { get; set; }
    public Guid? SessionId { get; set; }
    public decimal CommissionPct { get; set; }
    public decimal GrossPayment { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal CentreAmount { get; set; }
    public string? PeriodLabel { get; set; }
    public bool IsAdjustment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ModifiedAt { get; set; }

    // ── Denormalized Payment fields ───────────────────────────────────────
    public Guid? EnrollmentId { get; set; }
    public Guid? PaymentMethodId { get; set; }
    public Guid? RecordedBy { get; set; }
    public Guid? PeriodLabelId { get; set; }
    public decimal AmountDue { get; set; }
    public decimal AmountPaid { get; set; }
    public DateTime? PaymentDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string? PaymentNotes { get; set; }
    public DateTime PaymentCreatedAt { get; set; }

    // ── Denormalized Enrollment fields ────────────────────────────────────
    public Guid? StudentId { get; set; }
    public Guid? EnrollGroupId { get; set; }
    public Guid? EnrollStatusId { get; set; }
    public DateTime? EnrollDate { get; set; }
    public decimal EffectiveFee { get; set; }
    public DateTime EnrollCreatedAt { get; set; }

    // ── Denormalized RecordedBy User fields ───────────────────────────────
    public string? RecordedByName { get; set; }
    public string? RecordedByEmail { get; set; }
    public Guid? RecordedByPersonId { get; set; }
    public Guid? RecordedByRoleId { get; set; }
}


public class LookupSyncDto
{
    public string? Name { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid BranchId { get; set; }  // ← NEW
}

public sealed class GoalSyncDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class NestedGoalSyncDto
{
    public Guid GoalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}