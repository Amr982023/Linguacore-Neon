using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Request.Filters;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;

namespace LinguaCore.Application.Services;

/// <summary>
/// Student lifecycle service.
/// BUSINESS RULE: Student no longer owns Scholarship, DiscountPct, Language, or Level.
///   - Scholarship / DiscountPct ? live on Enrollment
///   - Languages / Levels        ? derived from Enrollments ? Group ? LanguageLevel
/// ACTIVE statuses for language/level derivation: Pending | Active | Suspended | Partial
/// </summary>
public class StudentService : IStudentService
{
    private static readonly HashSet<string> ActiveStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "PENDING", "ACTIVE", "SUSPENDED", "PARTIAL" };

    private readonly IUnitOfWork _uow;
    public StudentService(IUnitOfWork uow) => _uow = uow;

    // ?? Create ????????????????????????????????????????????????????????????????

    public async Task<ApiResponse<StudentResponse>> CreateAsync(CreateStudentRequest req)
    {
        var person = new Person
        {
            FirstName = req.FirstName,
            SecondName = req.SecondName,
            LastName = req.LastName,
            NationalId = req.NationalId,
            Age = req.Age,
            Gender = req.Gender,
            Phone = req.Phone,
            WhatsappNumber = req.WhatsappNumber,
            Address = req.Address,
            Email = req.Email,
        };
        await _uow.Repository<Person>().AddAsync(person);

        var student = new Student
        {
            PersonId = person.Id,
            BranchId = req.BranchId,
            AttendanceMode = req.AttendanceMode,
            GoalId = req.GoalId,
            NestedGoalId = req.NestedGoalId,   // ? persisted
            Notes = req.Notes,
            // Scholarship and DiscountPct are NOT set here — they belong on Enrollment
        };
        await _uow.Students.AddAsync(student);
        await _uow.SaveChangesAsync();

        var result = await _uow.Students.GetWithDetailsAsync(student.Id);
        return ApiResponse<StudentResponse>.Ok(MapToResponse(result!));
    }

    // ?? Update ????????????????????????????????????????????????????????????????

    public async Task<ApiResponse<StudentResponse>> UpdateAsync(UpdateStudentRequest req)
    {
        var student = await _uow.Students.GetWithDetailsAsync(req.Id);
        if (student is null) return ApiResponse<StudentResponse>.Fail("Student not found.");

        student.Person.FirstName = req.FirstName;
        student.Person.SecondName = req.SecondName;
        student.Person.LastName = req.LastName;
        student.Person.NationalId = req.NationalId;
        student.Person.Age = req.Age;
        student.Person.Gender = req.Gender;
        student.Person.Phone = req.Phone;
        student.Person.WhatsappNumber = req.WhatsappNumber;
        student.Person.Address = req.Address;
        student.Person.Email = req.Email;
        student.AttendanceMode = req.AttendanceMode;
        student.GoalId = req.GoalId;
        student.NestedGoalId = req.NestedGoalId;
        student.Notes = req.Notes;
        student.IsActive = req.IsActive;

        // NOTE: entity is already tracked (loaded via context, not AsNoTracking).
        // EF's snapshot change tracking already marks it Modified from the property
        // assignments above. Do NOT call _uow.Students.Update(student) here —
        // that forces a full-graph Update() over Person/Goal/NestedGoal/Enrollments/
        // Group/LanguageLevel, which is unnecessary and is the suspected cause of
        // inconsistent re-sync on subsequent edits.
        await _uow.SaveChangesAsync();
        return ApiResponse<StudentResponse>.Ok(MapToResponse(student));
    }

    public async Task<ApiResponse<PagedResponse<StudentResponse>>> GetByBranchPagedAsync(
    Guid branchId, StudentFilterRequest filter)
    {
        var (entries, total) = await _uow.Students.GetByBranchPagedAsync(
            branchId,
            filter.Page, filter.PageSize,
            filter.Search, filter.AttendanceMode, filter.IsActive,
            filter.LanguageId, filter.LevelId, filter.GoalId, filter.NestedGoalId);

        var items = entries.Select(MapToResponse).ToList();

        return ApiResponse<PagedResponse<StudentResponse>>.Ok(
            new PagedResponse<StudentResponse>(
                items, total, filter.Page, filter.PageSize,
                (int)Math.Ceiling(total / (double)filter.PageSize)));
    }

    // ?? Queries ???????????????????????????????????????????????????????????????

    /// <summary>
    /// Full detail: loads ALL enrollments (history) + active-only language/level derivation.
    /// Step 5: GetStudentWithDetails implementation.
    /// </summary>
    public async Task<ApiResponse<StudentDetailResponse>> GetByIdAsync(Guid id)
    {
        // 1. Load student with ALL enrollments + full Group ? LanguageLevel chain
        var student = await _uow.Students.GetWithDetailsAsync(id);
        if (student is null) return ApiResponse<StudentDetailResponse>.Fail("Student not found.");

        return ApiResponse<StudentDetailResponse>.Ok(MapToDetailResponse(student));
    }

    public async Task<ApiResponse<IEnumerable<StudentResponse>>> GetByBranchAsync(Guid branchId)
    {
        var students = await _uow.Students.GetByBranchAsync(branchId);
        return ApiResponse<IEnumerable<StudentResponse>>.Ok(students.Select(MapToResponse));
    }

    public async Task<ApiResponse<StudentResponse>> GetByQrCodeAsync(string qrCode)
    {
        var student = await _uow.Students.GetByQrCodeAsync(qrCode);
        if (student is null) return ApiResponse<StudentResponse>.Fail("Student not found.");
        return ApiResponse<StudentResponse>.Ok(MapToResponse(student));
    }

    public async Task<ApiResponse<bool>> DeactivateAsync(Guid id)
    {
        var student = await _uow.Students.GetByIdAsync(id);
        if (student is null) return ApiResponse<bool>.Fail("Student not found.");

        // Block if any active enrollments exist
        var hasActiveEnrollment = await _uow.Enrollments
            .AnyAsync(e => e.StudentId == id && e.EnrollStatus.Name.ToUpper() == "ACTIVE");
        if (hasActiveEnrollment)
            return ApiResponse<bool>.Fail("Cannot deactivate: student has active enrollments. Please suspend or complete them first.");

        // Block if student has pending enrollment AND attended sessions without paying
        var pendingEnrollment = await _uow.Enrollments
            .FirstOrDefaultAsync(e => e.StudentId == id && e.EnrollStatus.Name.ToUpper() == "PENDING");
        if (pendingEnrollment is not null)
        {
            var didAttendSessions = await _uow.Attendances
                .AnyAsync(a => a.StudentId == id);
            if (didAttendSessions)
                return ApiResponse<bool>.Fail("Cannot deactivate: student has unpaid attended sessions. There is pening enrollment for this student");
            else
            {
                var cancelledStatus = await _uow.Repository<EnrollStatus>()
                    .FirstOrDefaultAsync(s => s.Name.ToUpper() == "CANCELLED");

                if (cancelledStatus != null)
                {
                    var studentEnrollments = await _uow.Enrollments.FindAsync(e => e.StudentId == id
                                                && e.EnrollStatus.Name.ToUpper() == "PENDING");

                    foreach (var enrollment in studentEnrollments)
                    {
                        enrollment.EnrollStatusId = cancelledStatus.Id;
                        _uow.Enrollments.Update(enrollment);
                    }
                }

            }
        }

        student.IsActive = false;
        _uow.Students.Update(student);
        await _uow.SaveChangesAsync();
        return ApiResponse<bool>.Ok(true);
    }

    public async Task<ApiResponse<string>> RegenerateQrCodeAsync(Guid id)
    {
        var student = await _uow.Students.GetByIdAsync(id);
        if (student is null) return ApiResponse<string>.Fail("Student not found.");
        student.QrCode = Guid.NewGuid().ToString();
        _uow.Students.Update(student);
        await _uow.SaveChangesAsync();
        return ApiResponse<string>.Ok(student.QrCode);
    }

    // ?? Mapping helpers ???????????????????????????????????????????????????????

    /// <summary>
    /// Derives ActiveLanguages and ActiveLevels from enrollments whose status is
    /// in the active set (Pending | Active | Suspended | Partial).
    /// DISTINCT is applied so duplicates are never returned.
    /// DO NOT use direct Student.LanguageId — it does not exist any more.
    /// </summary>
    private static (IEnumerable<string> langs, IEnumerable<string> levels)
        DeriveActiveLanguagesAndLevels(Student s)
    {
        var active = s.Enrollments
            .Where(e => e.EnrollStatus is not null &&
                        ActiveStatuses.Contains(e.EnrollStatus.Name))
            .ToList();

        var langs = active
            .Select(e => e.Group?.LanguageLevel?.Language?.Name)
            .Where(n => n is not null)
            .Distinct()
            .Select(n => n!)
            .ToList();

        var levels = active
            .Select(e => e.Group?.LanguageLevel?.Level?.Code)
            .Where(c => c is not null)
            .Distinct()
            .Select(c => c!)
            .ToList();

        return (langs, levels);
    }

    private static StudentResponse MapToResponse(Student s)
    {
        var (langs, levels) = DeriveActiveLanguagesAndLevels(s);
        return new StudentResponse(
            s.Id,
            s.BranchId,
            s.Branch?.Name ?? "",
            new PersonResponse(
                s.Person.Id, s.Person.FirstName, s.Person.SecondName,
                s.Person.LastName, s.Person.NationalId, s.Person.Age,
                s.Person.Gender, s.Person.Phone, s.Person.WhatsappNumber,
                s.Person.Address, s.Person.Email),
            s.AttendanceMode,
            s.QrCode,
            s.IsActive,
            s.GoalId,
            s.Goal?.Name,
            s.NestedGoalId,
            s.NestedGoal?.Name,
            langs,
            levels,
            s.Notes,
            s.CreatedAt,
            s.ModifiedAt);
    }

    private static StudentDetailResponse MapToDetailResponse(Student s)
    {
        var (langs, levels) = DeriveActiveLanguagesAndLevels(s);

        // ACTIVE VIEW: Pending | Active | Suspended | Partial
        var activeEnrollments = s.Enrollments
            .Where(e => e.EnrollStatus is not null &&
                        ActiveStatuses.Contains(e.EnrollStatus.Name))
            .Select(e => MapEnrollment(e, s))
            .ToList();

        // HISTORY VIEW: all enrollments
        var allEnrollments = s.Enrollments
            .OrderByDescending(e => e.EnrollDate)
            .Select(e => MapEnrollment(e, s))
            .ToList();

        var certificates = s.Certificates
     .Select(c => new CertificateResponse(
         c.Id, c.StudentId,
         $"{s.Person.FirstName} {s.Person.LastName}",
         c.LanguageLevel?.Language?.Name ?? "",
         c.LanguageLevel?.Level?.Code ?? "",
         c.SerialNumber, c.IssuedAt,
         c.CreatedAt, c.ModifiedAt))   // ? 9 args, matches positions 1-9
     .ToList();

        return new StudentDetailResponse(
            s.Id,
            s.BranchId,
            s.Branch?.Name ?? "",
            new PersonResponse(
                s.Person.Id, s.Person.FirstName, s.Person.SecondName,
                s.Person.LastName, s.Person.NationalId, s.Person.Age,
                s.Person.Gender, s.Person.Phone, s.Person.WhatsappNumber,
                s.Person.Address, s.Person.Email),
            s.AttendanceMode,
            s.QrCode,
            s.IsActive,
            s.GoalId,
            s.Goal?.Name,
            s.NestedGoalId,
            s.NestedGoal?.Name,
            langs,
            levels,
            activeEnrollments,
            allEnrollments,
            certificates,
            s.Notes,
            s.CreatedAt,
            s.ModifiedAt);
    }

    private static EnrollmentResponse MapEnrollment(Enrollment e, Student s) => new(
        e.Id,
        e.StudentId,
        $"{s.Person.FirstName} {s.Person.LastName}",
        e.GroupId,
        e.Group?.Name ?? "",
        e.Group?.PaymentStrategy ?? "MONTHLY",
        e.Group?.LanguageLevel?.Language?.Name ?? "",
        e.Group?.LanguageLevel?.Level?.Code ?? "",
        e.EnrollStatus?.Name ?? "",
        e.Scholarship,    // ? from Enrollment, not Student
        e.DiscountPct,    // ? from Enrollment, not Student
        e.EnrollDate,
        e.EffectiveFee,
        e.IsPartial,
        e.PartialStart,
        e.PartialEnd,
        e.PartialCost,
        e.CreatedAt,
        e.ModifiedAt);
}
