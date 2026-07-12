using LinguaCore.Application.DTOs.Request;
using LinguaCore.Application.DTOs.Response;

namespace LinguaCore.Application.Interfaces.Services;

//public interface IWaitingListService
//{
//    Task<ApiResponse<WaitingListResponse>> CreateAsync(CreateWaitingListRequest request);
//    Task<ApiResponse<WaitingListResponse>> UpdateStatusAsync(UpdateWaitingListStatusRequest request);
//    Task<ApiResponse<IEnumerable<WaitingListResponse>>> GetByBranchAsync(Guid branchId);
//    Task<ApiResponse<IEnumerable<WaitingListResponse>>> GetExceedingThresholdAsync(int days);
//    Task<ApiResponse<StudentResponse>> ConvertToStudentAsync(ConvertToStudentRequest request);
//}


public interface IWaitingListService
{
    Task<ApiResponse<WaitingListResponse>> CreateAsync(CreateWaitingListRequest req);
    Task<ApiResponse<WaitingListResponse>> UpdateAsync(UpdateWaitingListRequest req);
    Task<ApiResponse<WaitingListResponse>> UpdateStatusAsync(UpdateWaitingListStatusRequest req);
    Task<ApiResponse<PagedResponse<WaitingListResponse>>> GetByBranchAsync(Guid branchId, WaitingListFilterRequest filter);
    Task<ApiResponse<PagedResponse<WaitingListResponse>>> GetExceedingThresholdAsync(int days, WaitingListFilterRequest filter, Guid? branchId = null);
    Task<ApiResponse<StudentResponse>> ConvertToStudentAsync(ConvertToStudentRequest req);
}