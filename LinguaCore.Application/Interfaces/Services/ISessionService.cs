using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services;

public interface ISessionService
{
    Task<ApiResponse<SessionResponse>> CreateAsync(CreateSessionRequest request);
    Task<ApiResponse<SessionResponse>> UpdateAsync(UpdateSessionRequest request);
    Task<ApiResponse<IEnumerable<SessionResponse>>> GetByGroupAsync(Guid groupId);
    Task<ApiResponse<PagedResponse<SessionResponse>>> GetByBranchPagedAsync(
    Guid branchId, SessionQueryParams filter);
    Task<ApiResponse<IEnumerable<SessionResponse>>> GetByHallAsync(Guid hallId, DateTime? from, DateTime? to);
    Task<ApiResponse<IEnumerable<SessionResponse>>> GetByZoomAccountAsync(Guid zoomId, DateTime? from, DateTime? to);
    Task<ApiResponse<AttendanceResponse>> MarkAttendanceAsync(MarkAttendanceRequest request);
    Task<ApiResponse<AttendanceResponse>> QrAttendanceAsync(QrAttendanceRequest request);
    Task<ApiResponse<bool>> RevertAttendanceAsync(RevertAttendanceRequest request);
    Task<ApiResponse<IEnumerable<AttendanceResponse>>> GetAttendanceBySessionAsync(Guid sessionId);
    Task<ApiResponse<int>> GetNextSessionNumberAsync(Guid groupId, Guid periodLabelId);
    Task<ApiResponse<SessionStatsResponse>> GetBranchStatsAsync(Guid branchId);
}
