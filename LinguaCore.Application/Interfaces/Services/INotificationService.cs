using LinguaCore.Application.DTOs;

namespace LinguaCore.Application.Interfaces.Services;

/// <summary>
/// Notification service — SMTP (e-mail) first, then WhatsApp.
///
/// Channel flags
/// ?????????????
///   sendSmtp     ? attempt e-mail delivery via ISmtpService
///   sendWhatsApp ? attempt WhatsApp delivery via IWhatsAppService
///   Both default to true so existing internal callers need no changes.
///   The controller passes the appropriate flags based on ?channel= param.
/// </summary>
public interface INotificationService
{
    // ?? Targeted sends ????????????????????????????????????????????????????????

    /// <summary>Send to every active student enrolled in a group.</summary>
    Task SendToGroupAsync(Guid groupId, string message,
        bool sendSmtp = true, bool sendWhatsApp = true);

    /// <summary>Send to every active student enrolled in any group of a language.</summary>
    Task SendToLanguageAsync(Guid languageId, string message,
        bool sendSmtp = true, bool sendWhatsApp = true);

    /// <summary>Send to a specific list of students by ID.</summary>
    Task SendToStudentsAsync(List<Guid> studentIds, string message,
        bool sendSmtp = true, bool sendWhatsApp = true);

    /// <summary>Send to all active students in a branch.</summary>
    Task SendToAllAsync(Guid branchId, string message,
        bool sendSmtp = true, bool sendWhatsApp = true);

    /// <summary>Send to all waiting-list entries in a branch.</summary>
    Task SendToWaitingListAsync(Guid branchId, string message,
        bool sendSmtp = true, bool sendWhatsApp = true);

    /// <summary>
    /// Send an attendance-related message to the student(s) of a session
    /// whose attendance status matches <paramref name="statusFilter"/>
    /// ("present" | "absent" | null = all).
    /// </summary>
    Task SendAttendanceAsync(Guid sessionId, string message,
        string? statusFilter = null, bool sendSmtp = true, bool sendWhatsApp = true);

    // ?? Custom blast (called from the API controller) ?????????????????????????

    /// <summary>
    /// Dispatches a custom notification based on the routing info in the DTO.
    /// Routing: all | group | language | specific
    /// </summary>
    Task SendCustomAsync(CustomNotificationDto dto,
        bool sendSmtp = true, bool sendWhatsApp = true);

    // ?? Event-triggered sends ?????????????????????????????????????????????????

    Task SendPaymentDueReminderAsync(Guid enrollmentId,
        bool sendSmtp = true, bool sendWhatsApp = true);

    Task SendPaymentReceivedAsync(Guid paymentId,
        bool sendSmtp = true, bool sendWhatsApp = true);

    Task SendPaymentOverdueAsync(Guid enrollmentId,
        bool sendSmtp = true, bool sendWhatsApp = true);

    Task SendEnrollmentConfirmedAsync(Guid enrollmentId,
        bool sendSmtp = true, bool sendWhatsApp = true);

    Task SendExamReminderAsync(Guid examId,
        bool sendSmtp = true, bool sendWhatsApp = true);

    Task SendExamMarksPublishedAsync(Guid examResultId,
        bool sendSmtp = true, bool sendWhatsApp = true);

    Task SendFailedFinalExamAsync(Guid examResultId,
        bool sendSmtp = true, bool sendWhatsApp = true);

    Task SendLevelCertificationAsync(Guid certificateId,
        bool sendSmtp = true, bool sendWhatsApp = true);

    Task SendSessionCancelledAsync(Guid sessionId,
        bool sendSmtp = true, bool sendWhatsApp = true);

    Task SendEarlyExitRefundAsync(Guid refundId,
        bool sendSmtp = true, bool sendWhatsApp = true);

    Task SendWaitingListAlarmAsync(Guid waitingListId,
        bool sendSmtp = true, bool sendWhatsApp = true);

    // ?? Settings / Logs ???????????????????????????????????????????????????????

    Task<IEnumerable<NotificationSettingDto>> GetSettingsAsync();
    Task SendAbsentStudentsAsync(Guid sessionId,
        bool sendSmtp = true, bool sendWhatsApp = true);
    Task UpdateSettingAsync(string key, bool enabled);
    
}