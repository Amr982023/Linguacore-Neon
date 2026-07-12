using System.Text.Json;
using LinguaCore.Application.Interfaces.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LinguaCore.Infrastructure.Services;

/// <summary>
/// Sends WhatsApp messages by writing JSON files to a shared queue folder.
/// The WhatsAppHelper.exe WinForms app (running on the same machine's desktop)
/// picks up the files and sends them via WhatsApp Desktop + AutoHotkey.
///
/// CONFIGURATION  (appsettings.json → "WhatsApp" section)
/// ────────────────────────────────────────────────────────
///   QueueFolder             path to the shared queue folder  (default C:\WhatsAppQueue)
///   BetweenMessageDelayMs   delay between consecutive sends  (default 6000)
/// </summary>
public sealed class WhatsAppQueueService : IWhatsAppService
{
    private const string CfgRoot = "WhatsApp";
    private const int DefaultBetweenMs = 6_000;

    private readonly IConfiguration _config;
    private readonly ILogger<WhatsAppQueueService> _logger;

    public WhatsAppQueueService(
        IConfiguration config,
        ILogger<WhatsAppQueueService> logger)
    {
        _config = config;
        _logger = logger;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    public Task SendAsync(string phone, string message)
        => SendBulkAsync([(phone, message)]);

    public async Task SendBulkAsync(IEnumerable<(string phone, string message)> messages)
    {
        var list = messages?.ToList() ?? [];
        if (list.Count == 0)
        {
            _logger.LogWarning("[WhatsApp] SendBulkAsync called with empty list.");
            return;
        }

        var queueFolder = _config.GetValue<string>($"{CfgRoot}:QueueFolder")
                          ?? @"C:\WhatsAppQueue";

        Directory.CreateDirectory(queueFolder);

        int betweenMs = _config.GetValue($"{CfgRoot}:BetweenMessageDelayMs", DefaultBetweenMs);

        _logger.LogInformation(
            "[WhatsApp] Queuing {Count} message(s) to {Folder}",
            list.Count, queueFolder);

        for (int i = 0; i < list.Count; i++)
        {
            var (phone, message) = list[i];

            string normalized;
            try
            {
                normalized = NormalizePhone(phone);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(
                    "[WhatsApp] Skipping invalid phone '{Phone}': {Reason}",
                    phone, ex.Message);
                continue;
            }

            try
            {
                await QueueOneAsync(queueFolder, normalized, message);

                _logger.LogInformation(
                    "[WhatsApp] Queued → {Phone} ({Index}/{Total})",
                    normalized, i + 1, list.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "[WhatsApp] Failed to queue → {Phone}: {Reason}",
                    normalized, ex.Message);
            }

            // Wait between messages so the Helper has time to process each one
            if (i < list.Count - 1)
            {
                _logger.LogDebug("[WhatsApp] Waiting {Ms}ms before queuing next…", betweenMs);
                await Task.Delay(betweenMs);
            }
        }

        _logger.LogInformation("[WhatsApp] All messages queued.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core queue logic
    // ─────────────────────────────────────────────────────────────────────────

    private static async Task QueueOneAsync(string folder, string phone, string message)
    {
        var payload = new
        {
            id = Guid.NewGuid().ToString(),
            phone,
            message
        };

        var json = JsonSerializer.Serialize(payload);
        var fileName = $"send_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}.json";
        var filePath = Path.Combine(folder, fileName);

        await File.WriteAllTextAsync(filePath, json);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Phone normalisation
    // ─────────────────────────────────────────────────────────────────────────

    private string NormalizePhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());

        if (string.IsNullOrEmpty(digits))
            throw new ArgumentException("Phone number contains no digits.", nameof(phone));

        // Egyptian local: 01xxxxxxxxx (11 digits) → 201xxxxxxxxx
        if (digits.Length == 11 && digits.StartsWith("01"))
            digits = "2" + digits;

        if (digits.Length < 10)
            _logger.LogWarning(
                "[WhatsApp] Unusually short phone after normalisation: {Phone}", digits);

        return digits;
    }
}