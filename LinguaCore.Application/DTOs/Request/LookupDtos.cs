namespace LinguaCore.Application.DTOs.Request;

public record CreateLanguageRequest(Guid BranchId, string Name, IEnumerable<Guid> LevelIds);

public record CreateGoalRequest(Guid BranchId, string Name);

public record CreateNestedGoalRequest(Guid GoalId, string Name);
public record CreatePaymentMethodRequest(Guid BranchId, string Name);
public record UpdateAppSettingRequest(string Key, string Value);

public record CreateBranchRequest(string Name, string? Address, string? GmailConfig, string? WhatsappConfig);
public record CreateHallRequest(Guid BranchId, string Name, int? Capacity);
public record CreateZoomAccountRequest(Guid BranchId, string AccountEmail, string DisplayName, int MaxParticipants);
public record CreateRoleRequest(Guid BranchId, string Name, string? Permissions);

// UpdateLanguageRequest.cs
public record UpdateLanguageRequest(Guid Id, string Name, IEnumerable<Guid> LevelIds);

// UpdateLevelRequest.cs
public record UpdateLevelRequest(Guid Id, string Code, int DisplayOrder);

// UpdateGoalRequest.cs
public record UpdateGoalRequest(Guid Id, string Name);

// UpdateNestedGoalRequest.cs
public record UpdateNestedGoalRequest(Guid Id, string Name);

// UpdatePaymentMethodRequest.cs
public record UpdatePaymentMethodRequest(Guid Id, string Name, bool IsActive);

// UpdateBranchRequest.cs
public record UpdateBranchRequest(Guid Id, string Name, string Address, string? GmailConfig, string? WhatsappConfig);

// UpdateHallRequest.cs
public record UpdateHallRequest(Guid Id, string Name, int Capacity, bool IsActive);

// UpdateZoomAccountRequest.cs
public record UpdateZoomAccountRequest(Guid Id, string AccountEmail, string DisplayName, int MaxParticipants, bool IsActive);

// UpdateRoleRequest.cs
public record UpdateRoleRequest(Guid Id, string Name, string Permissions);
public record CreateLevelRequest(Guid BranchId, string Code, int DisplayOrder);


public record UpdatePeriodLabelRequest(Guid Id, string Name, string? Description);

public record CreatePeriodLabelRequest(Guid BranchId, string Name, string? Description);
