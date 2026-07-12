using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Entities
{
    public class CenterDeduction : BaseEntity
    {
        public Guid BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime DeductionDate { get; set; }
        public Guid CreatedBy { get; set; }
        public string? Notes { get; set; }

        // Navigation
        public Branch Branch { get; set; } = null!;
        public User CreatedByUser { get; set; } = null!;
    }
}
