namespace LinguaCore.Application.DTOs.Response;

public record InstructorResponse(
    Guid Id, Guid BranchId, string BranchName,
    PersonResponse Person, bool IsActive,
    IEnumerable<string> Languages,
    IEnumerable<Guid> LanguageIds,
    IEnumerable<InstructorGroupSummary> Groups,   // ? add
    DateTime CreatedAt, DateTime ModifiedAt);


public record InstructorGroupSummary(Guid Id, string Name, Guid LanguageId);
