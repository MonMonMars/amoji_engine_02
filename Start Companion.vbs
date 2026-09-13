' Double-click this if start-companion.cmd flashes and closes.
' Opens a visible CMD window that stays open.
Option Explicit
Dim sh, repo, cmd
repo = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
cmd = "cmd /k ""cd /d """ & repo & """ && start-companion.cmd"""
Set sh = CreateObject("WScript.Shell")
sh.Run cmd, 1, False
