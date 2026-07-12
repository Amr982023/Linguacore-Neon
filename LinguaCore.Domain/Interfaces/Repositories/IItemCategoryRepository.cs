using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Domain.Entities;

namespace LinguaCore.Domain.Interfaces.Repositories
{
    public interface IItemCategoryRepository : IGenericRepository<ItemCategory>
    {
        Task<IEnumerable<ItemCategory>> GetAllActiveAsync();
        Task<ItemCategory?> GetByNameAsync(string name);
    }
}
