using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;
using LinguaCore.Application.Interfaces.Services;
using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces;

namespace LinguaCore.Application.Services;

public class InstructorService : IInstructorService
{
    private readonly IUnitOfWork _uow;
    public InstructorService(IUnitOfWork uow) => _uow = uow;

    public async Task<ApiResponse<InstructorResponse>> ToggleActiveAsync(Guid id)
    {
        var instructor = await _uow.Instructors.GetWithDetailsAsync(id);
        if (instructor is null) return ApiResponse<InstructorResponse>.Fail("Instructor not found.");

        instructor.IsActive = !instructor.IsActive;
        _uow.Instructors.Update(instructor);
        await _uow.SaveChangesAsync();

        return ApiResponse<InstructorResponse>.Ok(MapToResponse(instructor));
    }
    public async Task<ApiResponse<InstructorResponse>> CreateAsync(CreateInstructorRequest req)
    {
        var person = new Person
        {
            FirstName = req.FirstName, SecondName = req.SecondName, LastName = req.LastName,
            NationalId = req.NationalId, Age = req.Age, Gender = req.Gender,
            Phone = req.Phone, WhatsappNumber = req.WhatsappNumber,
            Address = req.Address, Email = req.Email,
        };
        await _uow.Repository<Person>().AddAsync(person);

        var instructor = new Instructor { BranchId = req.BranchId, PersonId = person.Id, IsActive = true };
        await _uow.Instructors.AddAsync(instructor);

        foreach (var langId in req.LanguageIds)
            await _uow.Repository<InstructorLanguage>().AddAsync(
                new InstructorLanguage { InstructorId = instructor.Id, LanguageId = langId, Certified = true });

        await _uow.SaveChangesAsync();
        var result = await _uow.Instructors.GetWithDetailsAsync(instructor.Id);
        return ApiResponse<InstructorResponse>.Ok(MapToResponse(result!));
    }

    public async Task<ApiResponse<InstructorResponse>> UpdateAsync(UpdateInstructorRequest req)
    {
        var instructor = await _uow.Instructors.GetWithDetailsAsync(req.Id);
        if (instructor is null) return ApiResponse<InstructorResponse>.Fail("Instructor not found.");

        instructor.Person.FirstName = req.FirstName; instructor.Person.LastName = req.LastName;
        instructor.Person.Phone = req.Phone; instructor.Person.Email = req.Email;
        instructor.IsActive = req.IsActive;
        instructor.Person.SecondName = req.SecondName;
        instructor.Person.NationalId = req.NationalId;
        instructor.Person.Age = req.Age;
        instructor.Person.Gender = req.Gender;
        instructor.Person.WhatsappNumber = req.WhatsappNumber;
        instructor.Person.Address = req.Address;

        var existingLangs = await _uow.Repository<InstructorLanguage>().FindAsync(il => il.InstructorId == req.Id);
        _uow.Repository<InstructorLanguage>().RemoveRange(existingLangs);
        foreach (var langId in req.LanguageIds)
            await _uow.Repository<InstructorLanguage>().AddAsync(
                new InstructorLanguage { InstructorId = req.Id, LanguageId = langId, Certified = true });

        _uow.Instructors.Update(instructor);
        await _uow.SaveChangesAsync();
        var result = await _uow.Instructors.GetWithDetailsAsync(req.Id);
        return ApiResponse<InstructorResponse>.Ok(MapToResponse(result!));
    }

    public async Task<ApiResponse<InstructorResponse>> GetByIdAsync(Guid id)
    {
        var inst = await _uow.Instructors.GetWithDetailsAsync(id);
        if (inst is null) return ApiResponse<InstructorResponse>.Fail("Instructor not found.");
        return ApiResponse<InstructorResponse>.Ok(MapToResponse(inst));
    }

    public async Task<ApiResponse<IEnumerable<InstructorResponse>>> GetByBranchAsync(Guid branchId)
    {
        var instructors = await _uow.Instructors.GetByBranchAsync(branchId);
        return ApiResponse<IEnumerable<InstructorResponse>>.Ok(instructors.Select(MapToResponse));
    }

    public async Task<ApiResponse<IEnumerable<InstructorResponse>>> GetByLanguageAsync(Guid languageId)
    {
        var instructors = await _uow.Instructors.GetByLanguageAsync(languageId);
        return ApiResponse<IEnumerable<InstructorResponse>>.Ok(instructors.Select(MapToResponse));
    }

    private static InstructorResponse MapToResponse(Instructor i) => new(
    i.Id, i.BranchId, i.Branch?.Name ?? "",
    new PersonResponse(i.Person.Id, i.Person.FirstName, i.Person.SecondName,
        i.Person.LastName, i.Person.NationalId, i.Person.Age, i.Person.Gender,
        i.Person.Phone, i.Person.WhatsappNumber, i.Person.Address, i.Person.Email),
    i.IsActive,
    i.InstructorLanguages?.Select(il => il.Language?.Name ?? "") ?? Enumerable.Empty<string>(),
    i.InstructorLanguages?.Select(il => il.LanguageId) ?? Enumerable.Empty<Guid>(),
    i.Groups?.Select(g => new InstructorGroupSummary(      // ? add
        g.Id,
        g.Name,
        g.LanguageLevel?.Language?.Id ?? Guid.Empty
    )) ?? Enumerable.Empty<InstructorGroupSummary>(),
    i.CreatedAt, i.ModifiedAt);
}
