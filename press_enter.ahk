#Requires AutoHotkey v2.0
#SingleInstance Force

Sleep 2000

if WinExist("WhatsApp")
{
    WinActivate
    WinWaitActive "WhatsApp"
}

Sleep 200

Send "{Enter}"