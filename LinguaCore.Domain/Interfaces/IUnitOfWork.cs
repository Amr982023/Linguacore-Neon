using LinguaCore.Domain.Interfaces.Repositories;

namespace LinguaCore.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    // Repositories
    IStudentRepository Students { get; }
    IInstructorRepository Instructors { get; }
    IRefundRepository Refunds { get; }
    IUserRepository Users { get; }
    IGroupRepository Groups { get; }
    IEnrollmentRepository Enrollments { get; }
    ISessionRepository Sessions { get; }
    IAttendanceRepository Attendances { get; }
    IPaymentRepository Payments { get; }
    ICommissionLedgerRepository CommissionLedgers { get; }
    IGenericClosingRepository GenericClosings { get; }
    IExamRepository Exams { get; }
    ICertificateRepository Certificates { get; }
    IWaitingListRepository WaitingLists { get; }
   
    ILevelRepository LevelRepository { get; }
    
    IGroupPeriodRepository GroupPeriods { get; }


    // Store & Sales ← new
    IItemCategoryRepository ItemCategories { get; }
    IStoreItemRepository StoreItems { get; }
    ISaleRepository Sales { get; }
    ISaleItemRepository SaleItems { get; }

    IGenericRepository<T> Repository<T>() where T : Domain.Entities.BaseEntity;

    // Persistence
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync();
    Task CommitTransactionAsync();
    Task RollbackTransactionAsync();
}