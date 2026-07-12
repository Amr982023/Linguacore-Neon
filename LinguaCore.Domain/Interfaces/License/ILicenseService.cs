using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Interfaces.License
{
    public interface ILicenseService
    {
        bool ValidateAndActivate(string enteredSerial);
        bool IsActivated();
        string GetRawMac();
    }
}
