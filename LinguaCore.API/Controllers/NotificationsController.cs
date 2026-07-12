using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LinguaCore.Application.DTOs;
using LinguaCore.Application.Interfaces.Services;

namespace LinguaCore.API.Controllers;

/// <summary>
/// Notifications controller.
///
/// Channel routing via ?channel= query param:
///   gmail     → SMTP only
///   whatsapp  → WhatsApp only
///   all       → both (default when param is omitted)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications)
        => _notifications = notifications;

    /// <summary>
    /// Resolves sendSmtp / sendWhatsApp flags from the ?channel= param.
    /// </summary>
    private static (bool smtp, bool whatsApp) ResolveChannels(string channel) =>
        channel.ToLowerInvariant() switch
        {
            "gmail" => (smtp: true, whatsApp: false),
            "whatsapp" => (smtp: false, whatsApp: true),
            _ => (smtp: true, whatsApp: true)   // "all" or anything else
        };

    // ── Settings ──────────────────────────────────────────────────────────────

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _notifications.GetSettingsAsync();
        return Ok(new { data = settings });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSetting([FromBody] NotificationSettingDto dto)
    {
        await _notifications.UpdateSettingAsync(dto.Key, dto.Enabled);
        return Ok(new { saved = true });
    }

    

    // ── Custom blast ──────────────────────────────────────────────────────────

    [HttpPost("send-custom")]
    public async Task<IActionResult> SendCustom(
        [FromBody] CustomNotificationDto dto,
        [FromQuery] string channel = "all")
    {
        if (dto.BranchId == Guid.Empty)
            return BadRequest(new { message = "BranchId is required." });

        if (string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest(new { message = "Message is required." });

        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendCustomAsync(dto, smtp, wa);
        return Ok(new { sent = true });
    }

    // ── Event-triggered endpoints ─────────────────────────────────────────────

    [HttpPost("payment-due/{enrollmentId}")]
    public async Task<IActionResult> PaymentDue(
        Guid enrollmentId, [FromQuery] string channel = "all")
    {
        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendPaymentDueReminderAsync(enrollmentId, smtp, wa);
        return Ok(new { sent = true });
    }

    [HttpPost("payment-received/{paymentId}")]
    public async Task<IActionResult> PaymentReceived(
        Guid paymentId, [FromQuery] string channel = "all")
    {
        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendPaymentReceivedAsync(paymentId, smtp, wa);
        return Ok(new { sent = true });
    }

    [HttpPost("payment-overdue/{enrollmentId}")]
    public async Task<IActionResult> PaymentOverdue(
        Guid enrollmentId, [FromQuery] string channel = "all")
    {
        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendPaymentOverdueAsync(enrollmentId, smtp, wa);
        return Ok(new { sent = true });
    }

    [HttpPost("enrollment-confirmed/{enrollmentId}")]
    public async Task<IActionResult> EnrollmentConfirmed(
        Guid enrollmentId, [FromQuery] string channel = "all")
    {
        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendEnrollmentConfirmedAsync(enrollmentId, smtp, wa);
        return Ok(new { sent = true });
    }

    [HttpPost("exam-reminder/{examId}")]
    public async Task<IActionResult> ExamReminder(
        Guid examId, [FromQuery] string channel = "all")
    {
        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendExamReminderAsync(examId, smtp, wa);
        return Ok(new { sent = true });
    }

    [HttpPost("exam-marks/{examResultId}")]
    public async Task<IActionResult> ExamMarks(
        Guid examResultId, [FromQuery] string channel = "all")
    {
        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendExamMarksPublishedAsync(examResultId, smtp, wa);
        return Ok(new { sent = true });
    }

    [HttpPost("level-certificate/{certificateId}")]
    public async Task<IActionResult> LevelCertificate(
        Guid certificateId, [FromQuery] string channel = "all")
    {
        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendLevelCertificationAsync(certificateId, smtp, wa);
        return Ok(new { sent = true });
    }

    [HttpPost("failed-exam/{examResultId}")]
    public async Task<IActionResult> FailedExam(
        Guid examResultId, [FromQuery] string channel = "all")
    {
        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendFailedFinalExamAsync(examResultId, smtp, wa);
        return Ok(new { sent = true });
    }

    [HttpPost("session-cancelled/{sessionId}")]
    public async Task<IActionResult> SessionCancelled(
        Guid sessionId, [FromQuery] string channel = "all")
    {
        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendSessionCancelledAsync(sessionId, smtp, wa);
        return Ok(new { sent = true });
    }

    [HttpPost("early-exit-refund/{refundId}")]
    public async Task<IActionResult> EarlyExitRefund(
        Guid refundId, [FromQuery] string channel = "all")
    {
        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendEarlyExitRefundAsync(refundId, smtp, wa);
        return Ok(new { sent = true });
    }

    [HttpPost("waiting-list-alarm/{waitingListId}")]
    public async Task<IActionResult> WaitingListAlarm(
        Guid waitingListId, [FromQuery] string channel = "all")
    {
        var (smtp, wa) = ResolveChannels(channel);
        await _notifications.SendWaitingListAlarmAsync(waitingListId, smtp, wa);
        return Ok(new { sent = true });
    }
}