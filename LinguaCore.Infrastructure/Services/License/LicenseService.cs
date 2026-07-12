using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using LinguaCore.Domain.Interfaces.License;
using Microsoft.Win32;

namespace LinguaCore.Infrastructure.Services.License
{
    public class LicenseService : ILicenseService
    {
        private const string MasterSerial = "LC-2026-NOVEXUS-Solutions-GRMKJHU9";
        private const string RegistryPath = @"SOFTWARE\NovexusSolution\LinguaCore";
        private const string RegistryKey = "LicenseToken";
        private const string RegistryMacsKey = "LicenseMacs";

        private static readonly NetworkInterfaceType[] PhysicalTypes =
        [
            NetworkInterfaceType.Ethernet,
        NetworkInterfaceType.Wireless80211,
        NetworkInterfaceType.FastEthernetT,
        NetworkInterfaceType.FastEthernetFx,
        NetworkInterfaceType.GigabitEthernet,
    ];

        public bool ValidateAndActivate(string enteredSerial)
        {
            if (string.IsNullOrWhiteSpace(enteredSerial)) return false;
            if (!string.Equals(enteredSerial.Trim(), MasterSerial, StringComparison.Ordinal))
                return false;

            // Combine MAC-based identifiers with a motherboard/BIOS identifier
            var ids = GetAllHardwareIds();
            if (ids.Count == 0) return false;

            var combinedKey = string.Join(",", ids.OrderBy(m => m));
            var token = ComputeToken(combinedKey, MasterSerial);

            StoreToken(token, ids);
            return true;
        }

        public bool IsActivated()
        {
            var stored = ReadToken();
            var storedIds = ReadMacs();

            if (string.IsNullOrEmpty(stored) || storedIds.Count == 0)
                return false;

            var combinedKey = string.Join(",", storedIds.OrderBy(m => m));
            var expected = ComputeToken(combinedKey, MasterSerial);
            if (!string.Equals(stored, expected, StringComparison.OrdinalIgnoreCase))
                return false;

            // Re-enumerate current hardware ids with retry — first call after boot
            // can occasionally return an incomplete list on some machines
            var currentIds = GetAllHardwareIdsWithRetry();

            // Match if ANY current id matches ANY stored id
            if (currentIds.Any(id => storedIds.Contains(id, StringComparer.OrdinalIgnoreCase)))
                return true;

            return false;
        }

        public string GetRawMac() => GetAllHardwareIds().FirstOrDefault() ?? "NO-MAC-FOUND";

        // ── Retry wrapper: handles transient empty results right after boot ───────
        private static List<string> GetAllHardwareIdsWithRetry()
        {
            for (int attempt = 0; attempt < 3; attempt++)
            {
                var ids = GetAllHardwareIds();
                if (ids.Count > 0) return ids;
                Thread.Sleep(500); // give drivers/WMI a moment to settle
            }
            return GetAllHardwareIds(); // final attempt, return whatever we get
        }

        // ── Combine MAC + motherboard serial for resilience ────────────────────────
        private static List<string> GetAllHardwareIds()
        {
            var ids = new List<string>();
            ids.AddRange(GetAllPhysicalMacs());

            var boardSerial = GetMotherboardSerial();
            if (!string.IsNullOrWhiteSpace(boardSerial) &&
                !boardSerial.Equals("0", StringComparison.OrdinalIgnoreCase) &&
                !boardSerial.Contains("None", StringComparison.OrdinalIgnoreCase) &&
                !boardSerial.Contains("Default", StringComparison.OrdinalIgnoreCase))
            {
                ids.Add(boardSerial);
            }

            return ids.Distinct().ToList();
        }

        private static List<string> GetAllPhysicalMacs()
        {
            try
            {
                return NetworkInterface.GetAllNetworkInterfaces()
                    .Where(n =>
                        PhysicalTypes.Contains(n.NetworkInterfaceType) &&
                        !n.Description.Contains("Virtual", StringComparison.OrdinalIgnoreCase) &&
                        !n.Description.Contains("VPN", StringComparison.OrdinalIgnoreCase) &&
                        !n.Description.Contains("TAP", StringComparison.OrdinalIgnoreCase) &&
                        !n.Description.Contains("Hyper-V", StringComparison.OrdinalIgnoreCase) &&
                        !n.Description.Contains("VMware", StringComparison.OrdinalIgnoreCase) &&
                        !n.Description.Contains("VirtualBox", StringComparison.OrdinalIgnoreCase) &&
                        !n.Description.Contains("Wintun", StringComparison.OrdinalIgnoreCase) &&
                        !n.Description.Contains("WireGuard", StringComparison.OrdinalIgnoreCase) &&
                        !n.Description.Contains("DisplayLink", StringComparison.OrdinalIgnoreCase)
                    )
                    .Select(n => n.GetPhysicalAddress().ToString())
                    .Where(m => !string.IsNullOrEmpty(m) && m != "000000000000")
                    .Distinct()
                    .ToList();
            }
            catch
            {
                return [];
            }
        }

        // Motherboard serial via WMI — survives NIC swaps/docking entirely
        private static string? GetMotherboardSerial()
        {
            if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return null;
            try
            {
                using var searcher = new System.Management.ManagementObjectSearcher(
                    "SELECT SerialNumber FROM Win32_BaseBoard");
                foreach (var obj in searcher.Get())
                {
                    var serial = obj["SerialNumber"]?.ToString();
                    if (!string.IsNullOrWhiteSpace(serial))
                        return serial.Trim();
                }
            }
            catch { /* WMI can be locked down in some environments — ignore */ }
            return null;
        }

        private static string ComputeToken(string data, string serial)
        {
            var key = Encoding.UTF8.GetBytes(serial);
            var bytes = Encoding.UTF8.GetBytes(data);
            using var hmac = new HMACSHA256(key);
            return Convert.ToHexString(hmac.ComputeHash(bytes));
        }

        private static void StoreToken(string token, List<string> ids)
        {
            if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return;
            using var key = Registry.LocalMachine.CreateSubKey(RegistryPath, true);
            key?.SetValue(RegistryKey, token, RegistryValueKind.String);
            key?.SetValue(RegistryMacsKey, string.Join(",", ids), RegistryValueKind.String);
        }

        private static string? ReadToken()
        {
            if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return null;
            using var key = Registry.LocalMachine.OpenSubKey(RegistryPath);
            return key?.GetValue(RegistryKey) as string;
        }

        private static List<string> ReadMacs()
        {
            if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) return [];
            using var key = Registry.LocalMachine.OpenSubKey(RegistryPath);
            var raw = key?.GetValue(RegistryMacsKey) as string;
            return string.IsNullOrEmpty(raw)
                ? []
                : raw.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();
        }
    }
}
