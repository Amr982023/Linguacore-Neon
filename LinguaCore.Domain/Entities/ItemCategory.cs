using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Entities
{
    public class ItemCategory : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string IconKey { get; set; } = string.Empty;
        public string? CustomImageUrl { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<StoreItem> StoreItems { get; set; } = new List<StoreItem>();
    }
}
