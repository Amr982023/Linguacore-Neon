using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinguaCore.Domain.Options
{
    public class BackupSettings
    {
        /// <summary>
        /// Absolute path where .bak files will be written.
        /// Example: "C:/LinguaCoreBackups/" or "/var/backups/linguacore/"
        /// </summary>
        public string OutputPath { get; set; } = "C:/LinguaCoreBackups/";

        /// <summary>
        /// How many days to keep backup files before deletion.
        /// </summary>
        public int RetentionDays { get; set; } = 7;

        /// <summary>
        /// How often the backup worker fires, in hours.
        /// </summary>
        public double IntervalHours { get; set; } = 24;
    }

}
