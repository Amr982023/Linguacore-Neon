namespace LinguaCore.Application.DTOs.Response;

public record LookupResponse(Guid Id, string Name);
public record LanguageResponse(Guid Id, string Name, IEnumerable<LookupResponse> Levels, DateTime ModifiedAt);
public record GoalResponse(Guid Id, string Name, IEnumerable<LookupResponse> NestedGoals);
public record BranchResponse(Guid Id, string Name, string? Address, DateTime ModifiedAt);
public record HallResponse(Guid Id, Guid BranchId, string BranchName, string Name, int? Capacity, bool IsActive, DateTime ModifiedAt);
public record ZoomAccountResponse(Guid Id, Guid BranchId, string BranchName, string AccountEmail, string DisplayName, int MaxParticipants, bool IsActive, DateTime ModifiedAt);
public record RoleResponse(Guid Id, string Name, bool IsSystem, string? Permissions);
public record AppSettingResponse(string Key, string Value, string? Description);

public record LanguageLevelResponse(Guid Id, string Name, Guid LanguageLevelId);
public record LanguageWithLevelIdsResponse(Guid Id, string Name, IEnumerable<LanguageLevelResponse> Levels, DateTime ModifiedAt);
