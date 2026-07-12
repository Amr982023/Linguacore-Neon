using LinguaCore.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Interfaces.Repositories
{
    public interface ILevelRepository
    {
        Task<IEnumerable<Level>> GetAllAsync();
        Task<IEnumerable<Level>> GetByLanguageIdAsync(Guid languageId);
    }
}
