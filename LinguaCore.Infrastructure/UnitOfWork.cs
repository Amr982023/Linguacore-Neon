using Microsoft.EntityFrameworkCore.Storage;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;
using LinguaCore.Infrastructure.Repositories;

namespace LinguaCore.Infrastructure;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IDbContextTransaction? _transaction;

    // Lazy-initialized repositories
    private IStudentRepository? _students;
    private IInstructorRepository? _instructors;
    private IUserRepository? _users;
    private IGroupRepository? _groups;
    private IEnrollmentRepository? _enrollments;
    private ISessionRepository? _sessions;
    private IAttendanceRepository? _attendances;
    private IPaymentRepository? _payments;
    private ICommissionLedgerRepository? _commissionLedgers;
    private IGenericClosingRepository? _genericClosings;
    private IExamRepository? _exams;
    private ICertificateRepository? _certificates;
    private IWaitingListRepository? _waitingLists;
    private ILevelRepository? _levelRepository;

    private IGroupPeriodRepository? _groupPeriods;   // ← add with other fields

    private IRefundRepository? _refunds;


    private IItemCategoryRepository? _itemCategories;
    private IStoreItemRepository? _storeItems;
    private ISaleRepository? _sales;
    private ISaleItemRepository? _saleItems;

    public UnitOfWork(AppDbContext context) => _context = context;



    public IItemCategoryRepository ItemCategories => _itemCategories ??= new ItemCategoryRepository(_context);
    public IStoreItemRepository StoreItems => _storeItems ??= new StoreItemRepository(_context);
    public ISaleRepository Sales => _sales ??= new SaleRepository(_context);
    public ISaleItemRepository SaleItems => _saleItems ??= new SaleItemRepository(_context);


    public IStudentRepository Students => _students ??= new StudentRepository(_context);
    public IRefundRepository Refunds => _refunds ??= new RefundRepository(_context);
    public IInstructorRepository Instructors => _instructors ??= new InstructorRepository(_context);
    public IUserRepository Users => _users ??= new UserRepository(_context);
    public IGroupRepository Groups => _groups ??= new GroupRepository(_context);
    public IEnrollmentRepository Enrollments => _enrollments ??= new EnrollmentRepository(_context);
    public ISessionRepository Sessions => _sessions ??= new SessionRepository(_context);
    public IAttendanceRepository Attendances => _attendances ??= new AttendanceRepository(_context);
    public IPaymentRepository Payments => _payments ??= new PaymentRepository(_context);
    public ICommissionLedgerRepository CommissionLedgers => _commissionLedgers ??= new CommissionLedgerRepository(_context);
    public IGenericClosingRepository GenericClosings => _genericClosings ??= new GenericClosingRepository(_context);
    public IExamRepository Exams => _exams ??= new ExamRepository(_context);
    public ICertificateRepository Certificates => _certificates ??= new CertificateRepository(_context);
    public IWaitingListRepository WaitingLists => _waitingLists ??= new WaitingListRepository(_context);
    public ILevelRepository LevelRepository => _levelRepository ??= new LevelRepository(_context);

    public IGroupPeriodRepository GroupPeriods => _groupPeriods ??= new GroupPeriodRepository(_context);  // ← add with other properties

    public IGenericRepository<T> Repository<T>() where T : BaseEntity
        => new GenericRepository<T>(_context);

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => await _context.SaveChangesAsync(cancellationToken);

    public async Task BeginTransactionAsync()
        => _transaction = await _context.Database.BeginTransactionAsync();

    public async Task CommitTransactionAsync()
    {
        if (_transaction is null) throw new InvalidOperationException("No active transaction.");
        await _transaction.CommitAsync();
        await _transaction.DisposeAsync();
        _transaction = null;
    }

    public async Task RollbackTransactionAsync()
    {
        if (_transaction is null) return;
        await _transaction.RollbackAsync();
        await _transaction.DisposeAsync();
        _transaction = null;
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}