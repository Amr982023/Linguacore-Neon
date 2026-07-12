using System.Runtime.InteropServices;

namespace LinguaCore.Infrastructure.Services.Win32;

/// <summary>
/// Minimal Win32 P/Invoke declarations needed to drive WhatsApp Desktop.
/// All members are internal — consumed only by WhatsAppWin32Service.
/// </summary>
internal static class NativeMethods
{
    // ── Window management ─────────────────────────────────────────────────────

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    internal static extern IntPtr FindWindow(string? lpClassName, string lpWindowName);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    internal static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    internal static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    internal static extern bool IsIconic(IntPtr hWnd);

    internal const int SW_RESTORE = 9;

    // ── Keyboard input ────────────────────────────────────────────────────────

    [DllImport("user32.dll", SetLastError = true)]
    internal static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [DllImport("user32.dll")]
    internal static extern IntPtr GetMessageExtraInfo();

    // ── INPUT structures ──────────────────────────────────────────────────────

    [StructLayout(LayoutKind.Sequential)]
    internal struct INPUT
    {
        internal uint type;
        internal InputUnion u;
    }

    [StructLayout(LayoutKind.Explicit)]
    internal struct InputUnion
    {
        [FieldOffset(0)] internal MOUSEINPUT mi;
        [FieldOffset(0)] internal KEYBDINPUT ki;
        [FieldOffset(0)] internal HARDWAREINPUT hi;
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct KEYBDINPUT
    {
        internal ushort wVk;
        internal ushort wScan;
        internal uint dwFlags;
        internal uint time;
        internal IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct MOUSEINPUT
    {
        internal int dx, dy, mouseData;
        internal uint dwFlags, time;
        internal IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct HARDWAREINPUT
    {
        internal uint uMsg;
        internal ushort wParamL, wParamH;
    }

    // ── Input type ────────────────────────────────────────────────────────────

    internal const uint INPUT_KEYBOARD = 1;

    // dwFlags
    internal const uint KEYEVENTF_KEYDOWN = 0x0000;
    internal const uint KEYEVENTF_KEYUP = 0x0002;
    internal const uint KEYEVENTF_UNICODE = 0x0004;

    // ── Virtual key codes ─────────────────────────────────────────────────────

    internal const ushort VK_RETURN = 0x0D;
    internal const ushort VK_ESCAPE = 0x1B;
    internal const ushort VK_DELETE = 0x2E;
    internal const ushort VK_CONTROL = 0x11;
    internal const ushort VK_LWIN = 0x5B;   // Left Windows key  (Win+R)
    internal const ushort VK_R = 0x52;   // 'R' key           (Win+R)
    internal const ushort VK_A = 0x41;   // 'A' key           (Ctrl+A)

    // ── Factory helpers ───────────────────────────────────────────────────────

    /// <summary>Virtual key DOWN event.</summary>
    internal static INPUT KeyDown(ushort vk) => new INPUT
    {
        type = INPUT_KEYBOARD,
        u = new InputUnion
        {
            ki = new KEYBDINPUT
            {
                wVk = vk,
                dwFlags = KEYEVENTF_KEYDOWN,
                dwExtraInfo = GetMessageExtraInfo()
            }
        }
    };

    /// <summary>Virtual key UP event.</summary>
    internal static INPUT KeyUp(ushort vk) => new INPUT
    {
        type = INPUT_KEYBOARD,
        u = new InputUnion
        {
            ki = new KEYBDINPUT
            {
                wVk = vk,
                dwFlags = KEYEVENTF_KEYUP,
                dwExtraInfo = GetMessageExtraInfo()
            }
        }
    };

    /// <summary>
    /// Returns a DOWN + UP pair of Unicode character injection events.
    /// This is the correct way to type any Unicode character regardless of the
    /// active keyboard layout (works for Arabic, emoji, punctuation, etc.).
    /// </summary>
    internal static INPUT[] UnicodeChar(char c)
    {
        var down = new INPUT
        {
            type = INPUT_KEYBOARD,
            u = new InputUnion
            {
                ki = new KEYBDINPUT
                {
                    wVk = 0,
                    wScan = c,
                    dwFlags = KEYEVENTF_UNICODE,
                    dwExtraInfo = GetMessageExtraInfo()
                }
            }
        };

        var up = down;
        up.u.ki.dwFlags |= KEYEVENTF_KEYUP;

        return [down, up];
    }
}