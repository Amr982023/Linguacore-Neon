using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories;

public interface IAttendanceRepository : IGenericRepository<AttendanceRecord>
{
    Task<IEnumerable<AttendanceRecord>> GetBySessionAsync(Guid sessionId);
    Task<IEnumerable<AttendanceRecord>> GetByStudentAsync(Guid studentId);
    Task<AttendanceRecord?> GetBySessionAndStudentAsync(Guid sessionId, Guid studentId);
    Task<int> GetAttendanceCountAsync(Guid studentId, Guid groupId);
}
