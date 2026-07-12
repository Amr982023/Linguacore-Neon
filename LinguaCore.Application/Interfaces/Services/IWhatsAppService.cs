using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.Interfaces.Services
{
   

    /// <summary>
    /// Sends WhatsApp messages via WhatsApp Desktop (Win32 only).
    /// Implementations must be sequential — no parallel sends.
    /// </summary>
    public interface IWhatsAppService
    {
        /// <summary>Send a single message to one phone number.</summary>
        Task SendAsync(string phone, string message);

        /// <summary>
        /// Send messages to multiple recipients sequentially.
        /// Failures on individual recipients must not abort the batch.
        /// </summary>
        Task SendBulkAsync(IEnumerable<(string phone, string message)> messages);
    }
}
