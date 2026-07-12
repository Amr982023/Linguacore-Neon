using LinguaCore.Application.DTOs;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LinguaCore.Infrastructure.Services;

/// <summary>
/// Notification service — SMTP (e-mail) first, then WhatsApp.
///
/// All messages are sent in both Arabic and German under the Berliner Mauer brand.
///
/// Channel flags
/// ─────────────
///   sendSmtp      → attempt e-mail delivery via ISmtpService
///   sendWhatsApp  → attempt WhatsApp delivery via IWhatsAppService
///   Both default to true so existing internal callers need no changes.
///   The controller passes the appropriate flags based on ?channel= param.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly IWhatsAppService _whatsApp;
    private readonly ISmtpService _smtp;
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IWhatsAppService whatsApp,
        ISmtpService smtp,
        AppDbContext db,
        IConfiguration config,
        ILogger<NotificationService> logger)
    {
        _whatsApp = whatsApp;
        _smtp = smtp;
        _db = db;
        _config = config;
        _logger = logger;
    }

    // =========================================================================
    // Message templates — bilingual (Arabic + German), Berliner Mauer brand
    // =========================================================================

    private static string PaymentDueMessage(string studentName) =>
        $"""
        موضوع: تذكير بالدفع 💡
        مرحباً {studentName}،
        سعداء بحضورك معنا في دوراتنا بمركز Berliner Mauer Institut. لكن حتى الآن لم نستلم رسوم الاشتراك الخاصة بك.
        لضمان استمرارك في الكورس بدون أي انقطاع، نرجو منك إتمام الدفع في أقرب وقت.
        تحياتنا،
        فريق Berliner Mauer Institut

        ---

        Betreff: Zahlungserinnerung 💡
        Hallo {studentName},
        wir freuen uns, dass Sie an den Kursen des Berliner Mauer Instituts teilnehmen. Allerdings ist Ihre Kursgebühr noch offen.
        Um Ihre Teilnahme ohne Unterbrechung fortzusetzen, bitten wir Sie, die Zahlung zeitnah zu erledigen.
        Viele Grüße
        Ihr Berliner Mauer Institut
        """;

    private static string PaymentReceivedMessage(string studentName) =>
        $"""
        موضوع: تم استلام المبلغ ✔️
        أهلاً {studentName}،
        وصل المبلغ الخاص بك لمركز Berliner Mauer Institut، وكل شيء تمام 🎉. شكراً على التزامك، ومع بعض هنكمل خطواتنا في رحلة التعلم 🚀.
        خالص التحية،
        فريق Berliner Mauer

        ---

        Betreff: Zahlung bestätigt ✔️
        Hallo {studentName},
        Ihr Betrag ist erfolgreich beim Berliner Mauer Institut eingegangen 🎉. Vielen Dank für Ihre Verbindlichkeit – gemeinsam geht's weiter auf unserem Lernweg 🚀.
        Herzliche Grüße
        Ihr Berliner Mauer Team
        """;

    private static string EnrollmentConfirmedMessage(string studentName, string groupName) =>
        $"""
        موضوع: أهلاً بك في المجموعة 👋
        أهلاً {studentName}،
        تم إضافتك لمجموعة {groupName} في مركز Berliner Mauer Institut. شارك وتفاعل مع زملاءك!
        فريق Berliner Mauer

        ---

        Betreff: Willkommen in der Gruppe 👋
        Hallo {studentName},
        Sie wurden der Gruppe {groupName} des Berliner Mauer Instituts hinzugefügt. Viel Spaß beim Austausch!
        Ihr Berliner Mauer Team
        """;

    private static string ExamReminderMessage(string studentName, string examTitle, string examDate) =>
        $"""
        موضوع: تذكير بالامتحان 📝
        أهلاً {studentName}،
        نذكرك بأن امتحان "{examTitle}" سيُعقد بتاريخ {examDate} في مركز Berliner Mauer Institut. استعد جيداً وحظاً موفقاً 🌟.
        فريق Berliner Mauer

        ---

        Betreff: Prüfungserinnerung 📝
        Hallo {studentName},
        wir möchten Sie daran erinnern, dass die Prüfung „{examTitle}" am {examDate} im Berliner Mauer Institut stattfindet. Bereiten Sie sich gut vor – viel Erfolg 🌟.
        Ihr Berliner Mauer Team
        """;

    private static string ExamPassedMessage(string studentName, string examTitle, string marks) =>
        $"""
        موضوع: مبروك 🎉
        أهلاً {studentName}،
        نتيجتك النهائية في امتحان "{examTitle}": {marks}. مبروك النجاح، وإلى الأمام دائماً!
        فريق Berliner Mauer

        ---

        Betreff: Glückwunsch 🎉
        Hallo {studentName},
        Ihr Ergebnis in der Prüfung „{examTitle}": {marks}. Herzlichen Glückwunsch zum Bestehen – weiter so!
        Ihr Berliner Mauer Team
        """;

    private static string ExamFailedMessage(string studentName, string examTitle) =>
        $"""
        موضوع: فرصة جديدة ✨
        أهلاً {studentName}،
        نود إبلاغك أن نتيجتك في امتحان "{examTitle}" لم تكن كافية للنجاح هذه المرة. متقلقش – عندك فرصة تعيد الجزء اللي ما عديتش فيه وتستعد بشكل أفضل. إحنا معاك خطوة بخطوة 💪.
        تحياتنا،
        فريق Berliner Mauer

        ---

        Betreff: Neue Chance ✨
        Hallo {studentName},
        leider haben Sie die Prüfung „{examTitle}" diesmal nicht bestanden. Aber keine Sorge – Sie können den Teil, den Sie nicht geschafft haben, erneut ablegen und sich besser vorbereiten. Wir begleiten Sie dabei 💪.
        Viele Grüße
        Ihr Berliner Mauer Team
        """;

    private static string LevelCertificateMessage(string studentName, string levelName) =>
        $"""
        موضوع: شهادة المستوى 🏅
        مبروك {studentName}!
        تم إصدار شهادتك لمستوى {levelName} من مركز Berliner Mauer Institut. نتمنى لك مزيداً من التقدم والنجاح.
        فريق Berliner Mauer

        ---

        Betreff: Stufenzertifikat 🏅
        Herzlichen Glückwunsch, {studentName}!
        Ihr Zertifikat für die Stufe {levelName} wurde vom Berliner Mauer Institut ausgestellt. Wir wünschen Ihnen weiterhin viel Erfolg.
        Ihr Berliner Mauer Team
        """;

    private static string SessionCancelledMessage(string studentName, string groupName, string sessionDate) =>
        $"""
        موضوع: إلغاء الجلسة ⚠️
        أهلاً {studentName}،
        نعلمك بأن جلسة مجموعة {groupName} المقررة بتاريخ {sessionDate} في مركز Berliner Mauer Institut قد تم إلغاؤها. سيتم التواصل معك لتحديد موعد بديل.
        تحياتنا،
        فريق Berliner Mauer

        ---

        Betreff: Sitzung abgesagt ⚠️
        Hallo {studentName},
        die Sitzung der Gruppe {groupName} am {sessionDate} im Berliner Mauer Institut wurde leider abgesagt. Wir werden uns bezüglich eines Ersatztermins mit Ihnen in Verbindung setzen.
        Viele Grüße
        Ihr Berliner Mauer Team
        """;

    private static string EarlyExitRefundMessage(string studentName, string groupName, string amount) =>
        $"""
        موضوع: تم معالجة استرداد المبلغ 💰
        أهلاً {studentName}،
        تم معالجة استرداد مبلغ {amount} الخاص بكورس {groupName} في مركز Berliner Mauer Institut. سيظهر المبلغ خلال 3–5 أيام عمل.
        خالص التحية،
        فريق Berliner Mauer

        ---

        Betreff: Rückerstattung verarbeitet 💰
        Hallo {studentName},
        Ihre Rückerstattung in Höhe von {amount} für den Kurs {groupName} beim Berliner Mauer Institut wurde bearbeitet. Der Betrag erscheint innerhalb von 3–5 Werktagen.
        Herzliche Grüße
        Ihr Berliner Mauer Team
        """;

    private static string WaitingListMessage(string name) =>
        $"""
        موضوع: خبر سار من Berliner Mauer 🎊
        أهلاً {name}،
        يسعدنا إبلاغك بأنه قد يتوفر مقعد لك في مركز Berliner Mauer Institut. يرجى التواصل معنا في أقرب وقت لتأكيد تسجيلك.
        فريق Berliner Mauer

        ---

        Betreff: Gute Neuigkeiten vom Berliner Mauer Institut 🎊
        Hallo {name},
        wir freuen uns, Ihnen mitteilen zu können, dass möglicherweise ein Platz für Sie verfügbar ist. Bitte kontaktieren Sie uns zeitnah, um Ihre Anmeldung zu bestätigen.
        Ihr Berliner Mauer Team
        """;

    private static string AbsentMessage(string studentName, string groupName, string sessionDate) =>
        $"""
        موضوع: غيابك في الجلسة 📋
        أهلاً {studentName}،
        لاحظنا غيابك عن جلسة مجموعة {groupName} بتاريخ {sessionDate} في مركز Berliner Mauer Institut.
        إذا كان هناك عذر، يرجى التواصل معنا. إحنا هنا دايماً لمساعدتك وضمان متابعتك للكورس 💙.
        تحياتنا،
        فريق Berliner Mauer

        ---

        Betreff: Ihre Abwesenheit 📋
        Hallo {studentName},
        wir haben festgestellt, dass Sie bei der Sitzung der Gruppe {groupName} am {sessionDate} im Berliner Mauer Institut gefehlt haben.
        Sollte es einen triftigen Grund geben, melden Sie sich gerne bei uns. Wir sind immer da, um Ihren Lernfortschritt zu unterstützen 💙.
        Viele Grüße
        Ihr Berliner Mauer Team
        """;

    // =========================================================================
    // Targeted send methods
    // =========================================================================

    public async Task SendToGroupAsync(Guid groupId, string message,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        var students = await _db.Students
            .Include(s => s.Person)
            .Where(s => s.IsActive && s.Enrollments.Any(e => e.GroupId == groupId))
            .ToListAsync();

        await DeliverBatchAsync(students, message, "group", sendSmtp, sendWhatsApp);
    }

    public async Task SendToLanguageAsync(Guid languageId, string message,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        var students = await _db.Students
            .Include(s => s.Person)
            .Where(s => s.IsActive &&
                        s.Enrollments.Any(e => e.Group.LanguageLevel.LanguageId == languageId))
            .ToListAsync();

        await DeliverBatchAsync(students, message, "language", sendSmtp, sendWhatsApp);
    }

    public async Task SendToStudentsAsync(List<Guid> studentIds, string message,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (studentIds is null || studentIds.Count == 0) return;

        var students = await _db.Students
            .Include(s => s.Person)
            .Where(s => s.IsActive && studentIds.Contains(s.Id))
            .ToListAsync();

        await DeliverBatchAsync(students, message, "specific", sendSmtp, sendWhatsApp);
    }

    public async Task SendToAllAsync(Guid branchId, string message,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        var students = await _db.Students
            .Include(s => s.Person)
            .Where(s => s.IsActive && s.BranchId == branchId)
            .ToListAsync();

        await DeliverBatchAsync(students, message, "custom", sendSmtp, sendWhatsApp);
    }

    public async Task SendToWaitingListAsync(Guid branchId, string message,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        var entries = await _db.WaitingLists
            .Where(w => w.BranchId == branchId)
            .ToListAsync();

        await DeliverWaitingListBatchAsync(entries, message, sendSmtp, sendWhatsApp);
    }

    public async Task SendAttendanceAsync(Guid sessionId, string message,
        string? statusFilter = null, bool sendSmtp = true, bool sendWhatsApp = true)
    {
        var query = _db.AttendanceRecords
            .Include(a => a.Student).ThenInclude(s => s.Person)
            .Where(a => a.SessionId == sessionId);

        if (!string.IsNullOrWhiteSpace(statusFilter))
            query = query.Where(a => a.Status.ToLower() == statusFilter.ToLower());

        var records = await query.ToListAsync();
        var students = records.Select(a => a.Student).Distinct().ToList();

        await DeliverBatchAsync(students, message,
            $"attendance_{statusFilter ?? "all"}", sendSmtp, sendWhatsApp);
    }

    public async Task SendCustomAsync(CustomNotificationDto dto,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (string.IsNullOrWhiteSpace(dto.Message))
        {
            _logger.LogWarning("[Notification] SendCustomAsync called with empty message.");
            return;
        }

        switch (dto.SendTo?.ToLowerInvariant())
        {
            case "group" when dto.GroupId.HasValue:
                await SendToGroupAsync(dto.GroupId.Value, dto.Message, sendSmtp, sendWhatsApp);
                break;

            case "language" when dto.LanguageId.HasValue:
                await SendToLanguageAsync(dto.LanguageId.Value, dto.Message, sendSmtp, sendWhatsApp);
                break;

            case "specific" when dto.StudentIds is { Count: > 0 }:
                await SendToStudentsAsync(dto.StudentIds, dto.Message, sendSmtp, sendWhatsApp);
                break;

            default:
                if (dto.BranchId == Guid.Empty)
                {
                    _logger.LogWarning(
                        "[Notification] SendCustomAsync — BranchId is empty, cannot send to 'all'.");
                    return;
                }
                await SendToAllAsync(dto.BranchId, dto.Message, sendSmtp, sendWhatsApp);
                break;
        }
    }

    // =========================================================================
    // Event-triggered sends
    // =========================================================================

    public async Task SendPaymentDueReminderAsync(Guid enrollmentId,
      bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("payment_due")) return;

        var enrollment = await _db.Enrollments
            .Include(e => e.Student).ThenInclude(s => s.Person)
            .Include(e => e.Group)
            .FirstOrDefaultAsync(e => e.Id == enrollmentId);

        if (enrollment is null) return;

        var studentName = PersonName(enrollment.Student);
        await DeliverOneAsync(enrollment.Student,
            PaymentDueMessage(studentName),
            "payment_due", sendSmtp, sendWhatsApp);
    }

    public async Task SendPaymentReceivedAsync(Guid paymentId,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("payment_received")) return;

        var payment = await _db.Payments
            .Include(p => p.Enrollment)
                .ThenInclude(e => e.Student).ThenInclude(s => s.Person)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment is null) return;

        var studentName = PersonName(payment.Enrollment.Student);
        await DeliverOneAsync(payment.Enrollment.Student,
            PaymentReceivedMessage(studentName),
            "payment_received", sendSmtp, sendWhatsApp);
    }

    public async Task SendPaymentOverdueAsync(Guid enrollmentId,
     bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("payment_due")) return;

        var enrollment = await _db.Enrollments
            .Include(e => e.Student).ThenInclude(s => s.Person)
            .Include(e => e.Group)
            .Include(e => e.Payments)
            .FirstOrDefaultAsync(e => e.Id == enrollmentId);

        if (enrollment is null) return;

        var studentName = PersonName(enrollment.Student);
        await DeliverOneAsync(enrollment.Student,
            PaymentDueMessage(studentName),    // same bilingual template as due reminder
            "payment_due", sendSmtp, sendWhatsApp);
    }

    public async Task SendEnrollmentConfirmedAsync(Guid enrollmentId,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("enrollment_confirmation")) return;

        var enrollment = await _db.Enrollments
            .Include(e => e.Student).ThenInclude(s => s.Person)
            .Include(e => e.Group)
            .FirstOrDefaultAsync(e => e.Id == enrollmentId);

        if (enrollment is null) return;

        var studentName = PersonName(enrollment.Student);
        var groupName = enrollment.Group?.Name ?? "";

        await DeliverOneAsync(enrollment.Student,
            EnrollmentConfirmedMessage(studentName, groupName),
            "enrollment_confirmation", sendSmtp, sendWhatsApp);
    }

    public async Task SendExamReminderAsync(Guid examId,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("exam_reminder")) return;

        var exam = await _db.Exams
            .Include(e => e.Group)
                .ThenInclude(g => g.Enrollments)
                    .ThenInclude(en => en.Student).ThenInclude(s => s.Person)
            .FirstOrDefaultAsync(e => e.Id == examId);

        if (exam is null) return;

        var examDate = exam.ExamDate.ToString("dd MMM yyyy");

        var students = exam.Group.Enrollments.Select(e => e.Student).ToList();
        foreach (var student in students)
        {
            var msg = ExamReminderMessage(PersonName(student), exam.Title, examDate);
            await DeliverOneAsync(student, msg, "exam_reminder", sendSmtp, sendWhatsApp);
        }
    }

    public async Task SendExamMarksPublishedAsync(Guid examResultId,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("exam_result")) return;

        var result = await _db.ExamResults
            .Include(r => r.Student).ThenInclude(s => s.Person)
            .Include(r => r.Exam)
            .FirstOrDefaultAsync(r => r.Id == examResultId);

        if (result is null) return;

        var studentName = PersonName(result.Student);
        var marks = $"{result.MarksObtained}/{result.Exam?.TotalMarks}";
        var examTitle = result.Exam?.Title ?? "";

        // Determine pass/fail to pick the correct bilingual template
        bool passed = result.Exam is not null &&
                      result.MarksObtained >= (result.Exam.TotalMarks * 0.5m);

        var msg = passed
            ? ExamPassedMessage(studentName, examTitle, marks)
            : ExamFailedMessage(studentName, examTitle);

        await DeliverOneAsync(result.Student, msg, "exam_result", sendSmtp, sendWhatsApp);
    }

    public async Task SendFailedFinalExamAsync(Guid examResultId,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("exam_result")) return;

        var result = await _db.ExamResults
            .Include(r => r.Student).ThenInclude(s => s.Person)
            .Include(r => r.Exam)
            .FirstOrDefaultAsync(r => r.Id == examResultId);

        if (result is null) return;

        var studentName = PersonName(result.Student);
        var examTitle = result.Exam?.Title ?? "";

        await DeliverOneAsync(result.Student,
            ExamFailedMessage(studentName, examTitle),
            "exam_result", sendSmtp, sendWhatsApp);
    }

    public async Task SendLevelCertificationAsync(Guid certificateId,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("enrollment_confirmation")) return;

        var cert = await _db.Certificates
            .Include(c => c.Student).ThenInclude(s => s.Person)
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Language)
            .Include(c => c.LanguageLevel).ThenInclude(ll => ll.Level)
            .FirstOrDefaultAsync(c => c.Id == certificateId);

        if (cert is null) return;

        var studentName = PersonName(cert.Student);
        var levelName = cert.LanguageLevel is not null
            ? $"{cert.LanguageLevel.Language?.Name} {cert.LanguageLevel.Level?.Code}"
            : "your course";

        await DeliverOneAsync(cert.Student,
            LevelCertificateMessage(studentName, levelName),
            "enrollment_confirmation", sendSmtp, sendWhatsApp);
    }

    public async Task SendSessionCancelledAsync(Guid sessionId,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("attendance_absent")) return;

        var session = await _db.Sessions
            .Include(s => s.Group)
                .ThenInclude(g => g.Enrollments)
                    .ThenInclude(e => e.Student).ThenInclude(s => s.Person)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return;

        var sessionDate = session.ScheduledDate.ToString("dd MMM yyyy");
        var groupName = session.Group?.Name ?? "";

        foreach (var student in session.Group.Enrollments.Select(e => e.Student))
        {
            var msg = SessionCancelledMessage(PersonName(student), groupName, sessionDate);
            await DeliverOneAsync(student, msg, "attendance_absent", sendSmtp, sendWhatsApp);
        }
    }

    public async Task SendEarlyExitRefundAsync(Guid refundId,
       bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("payment_received")) return;

        var refund = await _db.RefundRecords
            .Include(r => r.Student).ThenInclude(s => s.Person)
            .Include(r => r.Payment)
                .ThenInclude(p => p.Enrollment)
                    .ThenInclude(e => e.Group)
            .FirstOrDefaultAsync(r => r.Id == refundId);

        if (refund is null) return;

        var studentName = PersonName(refund.Student);
        var groupName = refund.Payment?.Enrollment?.Group?.Name ?? "your course";
        var amount = refund.ActualRefundAmount.ToString("C");

        await DeliverOneAsync(refund.Student,
            EarlyExitRefundMessage(studentName, groupName, amount),
            "payment_received", sendSmtp, sendWhatsApp);
    }

    public async Task SendWaitingListAlarmAsync(Guid waitingListId,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("enrollment_confirmation")) return;

        var entry = await _db.WaitingLists
            .FirstOrDefaultAsync(w => w.Id == waitingListId);

        if (entry is null) return;

        await DeliverWaitingListOneAsync(entry,
            WaitingListMessage(entry.Name),
            sendSmtp, sendWhatsApp);
    }

    /// <summary>
    /// Called automatically by SessionService when a session is marked COMPLETED.
    /// Finds every enrolled student who is ABSENT (no attendance record, or record
    /// with Status = "ABSENT" and not reverted) and sends them a bilingual
    /// absence notification.
    /// </summary>
    public async Task SendAbsentStudentsAsync(Guid sessionId,
     bool sendSmtp = true, bool sendWhatsApp = true)
    {
        if (!IsEnabled("attendance_absent")) return;
        var session = await _db.Sessions
            .Include(s => s.Group)
                .ThenInclude(g => g.Enrollments.Where(e =>
                    e.EnrollStatus != null &&
                    (e.EnrollStatus.Name == "ACTIVE" || e.EnrollStatus.Name == "PENDING" || e.EnrollStatus.Name == "PARTIAL")))
                    .ThenInclude(e => e.Student).ThenInclude(s => s.Person)
            .FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session is null) return;

        // Build the set of students who were marked PRESENT (non-reverted)
        var presentStudentIds = await _db.AttendanceRecords
            .Where(a => a.SessionId == sessionId &&
                        a.Status.ToUpper() == "PRESENT" &&
                        !a.Reverted)
            .Select(a => a.StudentId)
            .ToHashSetAsync();

        var sessionDate = session.ScheduledDate.ToString("dd MMM yyyy");
        var groupName = session.Group?.Name ?? "";

        foreach (var enrollment in session.Group.Enrollments)
        {
            // Defensive guard — only ACTIVE, PENDING, or PARTIAL enrollments get
            // absent notices, even if the filtered Include above ever returns extra
            // tracked entities (EF Core identity-map quirk when enrollments are
            // already tracked elsewhere in the same DbContext scope).
            var statusName = enrollment.EnrollStatus?.Name ?? "";
            if (statusName != "ACTIVE" && statusName != "PENDING" && statusName != "PARTIAL") continue;

            if (presentStudentIds.Contains(enrollment.StudentId)) continue;
            var student = enrollment.Student;
            if (student is null) continue;
            var msg = AbsentMessage(PersonName(student), groupName, sessionDate);
            await DeliverOneAsync(student, msg, "attendance_absent", sendSmtp, sendWhatsApp);
        }
    }

    // =========================================================================
    // Settings / Logs
    // =========================================================================

    public async Task<IEnumerable<NotificationSettingDto>> GetSettingsAsync()
    {
        var keys = new[]
        {
            "payment_due", "payment_received", "enrollment_confirmation",
            "exam_reminder", "exam_result", "attendance_absent"
        };

        return await Task.FromResult(keys.Select(k => new NotificationSettingDto
        {
            Key = k,
            Enabled = IsEnabled(k)
        }));
    }

    public Task UpdateSettingAsync(string key, bool enabled) => Task.CompletedTask;



    // =========================================================================
    // Core delivery — Student (SMTP first, then WhatsApp)
    // =========================================================================

    private async Task DeliverOneAsync(
        Student student, string message, string eventType,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        _logger.LogInformation(
            "[Notification] DeliverOneAsync — student={StudentId} smtp={Smtp} wa={Wa}",
            student.Id, sendSmtp, sendWhatsApp);

        // ── SMTP (first) ──────────────────────────────────────────────────────
        if (sendSmtp)
        {
            var email = student.Person?.Email;
            if (string.IsNullOrWhiteSpace(email))
            {
                _logger.LogWarning(
                    "[Notification] Student {StudentId} has no email — SMTP skipped.", student.Id);
               
            }
            else
            {
                var smtpStatus = "SENT";
                try
                {
                    var subject = SubjectFromEventType(eventType);
                    _logger.LogInformation(
                        "[Notification] SMTP attempting → student {StudentId} ({Email})",
                        student.Id, email);
                    await _smtp.SendAsync(email, subject, message);
                    _logger.LogInformation(
                        "[Notification] SMTP SENT → student {StudentId} ({Email})",
                        student.Id, email);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "[Notification] SMTP FAILED → student {StudentId} ({Email}): {Error}",
                        student.Id, email, ex.Message);
                    smtpStatus = "FAILED";
                }
               
            }
        }

        // ── WhatsApp (second) ─────────────────────────────────────────────────
        if (sendWhatsApp)
        {
            var phone = student.Person?.Phone;
            if (string.IsNullOrWhiteSpace(phone))
            {
                _logger.LogWarning(
                    "[Notification] Student {StudentId} has no phone — WhatsApp skipped.", student.Id);
               
            }
            else
            {
                var waStatus = "SENT";
                try
                {
                    await _whatsApp.SendAsync(phone, message);
                    _logger.LogInformation(
                        "[Notification] WhatsApp SENT → student {StudentId} ({Phone})",
                        student.Id, phone);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "[Notification] WhatsApp FAILED → student {StudentId} ({Phone}): {Error}",
                        student.Id, phone, ex.Message);
                    waStatus = "FAILED";
                }
               
            }
        }
    }

    private async Task DeliverBatchAsync(
        IReadOnlyList<Student> students, string message, string eventType,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        _logger.LogInformation(
            "[Notification] Batch start — eventType={EventType}, recipients={Count}, smtp={Smtp}, wa={Wa}",
            eventType, students.Count, sendSmtp, sendWhatsApp);

        if (students.Count == 0)
        {
            _logger.LogWarning(
                "[Notification] No recipients found for eventType={EventType}.", eventType);
            return;
        }

        foreach (var student in students)
            await DeliverOneAsync(student, message, eventType, sendSmtp, sendWhatsApp);
    }

    // =========================================================================
    // Core delivery — WaitingList (SMTP first, then WhatsApp)
    // =========================================================================

    private async Task DeliverWaitingListOneAsync(WaitingList entry, string message,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        const string eventType = "enrollment_confirmation";

        // ── SMTP (first) ──────────────────────────────────────────────────────
        if (sendSmtp)
        {
            if (string.IsNullOrWhiteSpace(entry.Email))
            {
                _logger.LogWarning(
                    "[Notification] WaitingList {Id} has no email — SMTP skipped.", entry.Id);
                
            }
            else
            {
                var smtpStatus = "SENT";
                try
                {
                    await _smtp.SendAsync(
                        entry.Email,
                        SubjectFromEventType(eventType),
                        message);
                    _logger.LogInformation(
                        "[Notification] SMTP SENT → WaitingList {Id} ({Email})",
                        entry.Id, entry.Email);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "[Notification] SMTP FAILED → WaitingList {Id}: {Error}",
                        entry.Id, ex.Message);
                    smtpStatus = "FAILED";
                }
               
            }
        }

        // ── WhatsApp (second) ─────────────────────────────────────────────────
        if (sendWhatsApp)
        {
            if (string.IsNullOrWhiteSpace(entry.Phone))
            {
                _logger.LogWarning(
                    "[Notification] WaitingList {Id} has no phone — WhatsApp skipped.", entry.Id);
               
            }
            else
            {
                var waStatus = "SENT";
                try
                {
                    await _whatsApp.SendAsync(entry.Phone, message);
                    _logger.LogInformation(
                        "[Notification] WhatsApp SENT → WaitingList {Id} ({Phone})",
                        entry.Id, entry.Phone);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "[Notification] WhatsApp FAILED → WaitingList {Id}: {Error}",
                        entry.Id, ex.Message);
                    waStatus = "FAILED";
                }
                
            }
        }
    }

    private async Task DeliverWaitingListBatchAsync(
        IReadOnlyList<WaitingList> entries, string message,
        bool sendSmtp = true, bool sendWhatsApp = true)
    {
        foreach (var entry in entries)
            await DeliverWaitingListOneAsync(entry, message, sendSmtp, sendWhatsApp);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private static string PersonName(Student? student)
    {
        if (student?.Person is null) return "الطالب";
        return $"{student.Person.FirstName} {student.Person.LastName}".Trim();
    }

   

 

    private bool IsEnabled(string key)
    {
        var raw = _config[$"NotificationSettings:{key}"];
        return raw is null || (bool.TryParse(raw, out var val) && val);
    }

    private static string SubjectFromEventType(string eventType) => eventType switch
    {
        "payment_due" => "تذكير بالدفع | Zahlungserinnerung — Berliner Mauer",
        "payment_received" => "تم استلام المبلغ | Zahlung bestätigt — Berliner Mauer",
        "enrollment_confirmation" => "تأكيد التسجيل | Einschreibung bestätigt — Berliner Mauer",
        "exam_reminder" => "تذكير بالامتحان | Prüfungserinnerung — Berliner Mauer",
        "exam_result" => "نتيجة الامتحان | Prüfungsergebnis — Berliner Mauer",
        "attendance_absent" => "غيابك في الجلسة | Abwesenheit — Berliner Mauer",
        "group" => "رسالة من Berliner Mauer | Nachricht vom Berliner Mauer",
        "language" => "رسالة من Berliner Mauer | Nachricht vom Berliner Mauer",
        "specific" => "رسالة من Berliner Mauer | Nachricht vom Berliner Mauer",
        "custom" => "رسالة من Berliner Mauer | Nachricht vom Berliner Mauer",
        _ => "إشعار | Benachrichtigung — Berliner Mauer"
    };
}