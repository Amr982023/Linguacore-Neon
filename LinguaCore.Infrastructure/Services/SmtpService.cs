using LinguaCore.Application.Interfaces.Services;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace LinguaCore.Infrastructure.Services;

public class SmtpService : ISmtpService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpService> _logger;

    public SmtpService(IConfiguration config, ILogger<SmtpService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string body)
    {
        var host = _config["Smtp:Host"] ?? throw new InvalidOperationException("Smtp:Host is not configured.");
        var port = int.Parse(_config["Smtp:Port"] ?? "587");
        var username = _config["Smtp:Username"] ?? throw new InvalidOperationException("Smtp:Username is not configured.");
        var password = _config["Smtp:Password"] ?? throw new InvalidOperationException("Smtp:Password is not configured.");
        var fromName = _config["Smtp:FromName"] ?? "LinguaCore";

        _logger.LogInformation("[SMTP] Attempting → {To} via {Host}:{Port}", to, host, port);

        var email = new MimeMessage();
        email.From.Add(new MailboxAddress(fromName, username));
        email.To.Add(MailboxAddress.Parse(to));
        email.Subject = subject;
        email.Body = new TextPart("plain") { Text = body };

        using var client = new MailKit.Net.Smtp.SmtpClient();

        try
        {
            await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(username, password);
            await client.SendAsync(email);
            await client.DisconnectAsync(true);

            _logger.LogInformation("[SMTP] Sent → {To} | Subject: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SMTP] Failed → {To}: {Error}", to, ex.Message);
            throw;
        }
    }
}