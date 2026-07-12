using LinguaCore.Domain.Entities;
using LinguaCore.Domain.Interfaces.Repositories;
using LinguaCore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Infrastructure.Repositories
{
    public class LevelRepository : GenericRepository<Level>, ILevelRepository
    { 
        public LevelRepository(AppDbContext context) : base(context) { }
        public async Task<IEnumerable<Level>> GetByLanguageIdAsync(Guid languageId)
        {
            //var languageLevelIds = await _context.LanguageLevels
            //    .Where(ll => ll.LanguageId == languageId)
            //    .Select(ll => ll.LevelId)
            //    .ToListAsync();

            //return await _context.Levels
            //    .Where(l => languageLevelIds.Contains(l.Id))
            //    .ToListAsync();

            return await _context.LanguageLevels
                    .Where(ll => ll.LanguageId == languageId)
                    .Select(ll => ll.Level)
                    .ToListAsync();
        }
    }
}
