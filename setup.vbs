' Lumind Setup Script - Creates desktop shortcut
' Double-click this file after cloning the project

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
DesktopPath = WshShell.SpecialFolders("Desktop")
BatPath = ScriptDir & "\启动知光创序.bat"
LnkPath = DesktopPath & "\知光创序.lnk"
IconPath = ScriptDir & "\lumind-icon.ico"

' Create shortcut
Set Shortcut = WshShell.CreateShortcut(LnkPath)
Shortcut.TargetPath = BatPath
Shortcut.WorkingDirectory = ScriptDir
If FSO.FileExists(IconPath) Then
    Shortcut.IconLocation = IconPath & ",0"
End If
Shortcut.WindowStyle = 7
Shortcut.Save

MsgBox "桌面快捷方式已创建！双击桌面的【知光创序】即可启动。", 64, "Lumind Setup"