' Lumind - Creates desktop shortcut silently

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
DesktopPath = WshShell.SpecialFolders("Desktop")
BatPath = ScriptDir & "\启动知光创序.bat"
LnkPath = DesktopPath & "\知光创序.lnk"
IconPath = ScriptDir & "\lumind-icon.ico"

If FSO.FileExists(LnkPath) Then
    FSO.DeleteFile LnkPath, True
End If

Set Shortcut = WshShell.CreateShortcut(LnkPath)
Shortcut.TargetPath = BatPath
Shortcut.WorkingDirectory = ScriptDir
If FSO.FileExists(IconPath) Then
    Shortcut.IconLocation = IconPath & ",0"
End If
Shortcut.WindowStyle = 7
Shortcut.Save