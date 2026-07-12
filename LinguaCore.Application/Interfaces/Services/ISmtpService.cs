using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Application.Interfaces.Services
{
    public interface ISmtpService
    {
        Task SendAsync(string to, string subject, string body);
    }

}
