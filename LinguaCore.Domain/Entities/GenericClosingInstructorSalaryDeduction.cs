using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Entities
{
    public class GenericClosingInstructorSalaryDeduction : BaseEntity
    {
        public Guid GenericClosingInstructorId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }

        // Navigation
        public GenericClosingInstructor GenericClosingInstructor { get; set; } = null!;
    }
}
