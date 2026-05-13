/* ------------------------------------------------------------------ */
/*  Anti-Debugging & Anti-Analysis Obfuscation Module                  */
/* ------------------------------------------------------------------ */

import logger from "@/lib/logger"

/**
 * Platform-specific anti-debugging and anti-analysis techniques
 * for Windows, Linux, and macOS targets.
 */

/* ------------------------------------------------------------------ */
/*  Windows anti-debug techniques                                      */
/* ------------------------------------------------------------------ */

const WINDOWS_ANTI_DEBUG = `// --- Anti-Debug: Windows ---
var (
  kernel32           = syscall.NewLazyDLL("kernel32.dll")
  ntdll              = syscall.NewLazyDLL("ntdll.dll")
  isDebuggerPresent  = kernel32.NewProc("IsDebuggerPresent")
  ntQueryInfoProcess = ntdll.NewProc("NtQueryInformationProcess")
)

func checkDebugger() bool {
  // IsDebuggerPresent
  ret, _, _ := isDebuggerPresent.Call()
  if ret != 0 {
    return true
  }

  // NtQueryInformationProcess (ProcessDebugPort = 7)
  var debugPort uint32
  ntdll.Call(
    uintptr(0xFFFFFFFF), // GetCurrentProcess
    uintptr(7),          // ProcessDebugPort
    uintptr(unsafe.Pointer(&debugPort)),
    uintptr(4),
    0,
  )
  if debugPort != 0 {
    return true
  }

  // Timing check
  start := time.Now()
  time.Sleep(100 * time.Millisecond)
  elapsed := time.Since(start)
  if elapsed < 90*time.Millisecond || elapsed > 200*time.Millisecond {
    return true
  }

  return false
}`

/* ------------------------------------------------------------------ */
/*  Linux anti-debug techniques                                        */
/* ------------------------------------------------------------------ */

const LINUX_ANTI_DEBUG = `// --- Anti-Debug: Linux ---
func checkDebugger() bool {
  // ptrace self-check
  pid := os.Getpid()
  status, err := os.ReadFile(fmt.Sprintf("/proc/%d/status", pid))
  if err == nil {
    for _, line := range strings.Split(string(status), "\\n") {
      if strings.HasPrefix(line, "TracerPid:") {
        tracerPid := strings.TrimSpace(strings.TrimPrefix(line, "TracerPid:"))
        if tracerPid != "0" {
          return true
        }
      }
    }
  }

  // ptrace(PTRACE_TRACEME)
  _, _, errno := syscall.Syscall(syscall.SYS_PTRACE, syscall.PTRACE_TRACEME, 0, 0)
  if errno != 0 {
    return true
  }

  // Timing check
  start := time.Now()
  time.Sleep(100 * time.Millisecond)
  elapsed := time.Since(start)
  if elapsed < 90*time.Millisecond || elapsed > 200*time.Millisecond {
    return true
  }

  return false
}`

/* ------------------------------------------------------------------ */
/*  macOS anti-debug techniques                                        */
/* ------------------------------------------------------------------ */

const MACOS_ANTI_DEBUG = `// --- Anti-Debug: macOS ---
func checkDebugger() bool {
  // sysctl P_TRACED check
  var (
    mib    [4]C.int
    info   C.struct_kinfo_proc
    size   C.size_t
  )
  mib[0] = C.CTL_KERN
  mib[1] = C.KERN_PROC
  mib[2] = C.KERN_PROC_PID
  mib[3] = C.int(os.Getpid())
  size = C.sizeof_kinfo_proc

  _, _, errno := syscall.Syscall6(
    syscall.SYS_SYSCTL,
    uintptr(unsafe.Pointer(&mib[0])),
    4,
    uintptr(unsafe.Pointer(&info)),
    uintptr(unsafe.Pointer(&size)),
    0, 0,
  )
  if errno != 0 {
    return false
  }
  if info.kp_proc.p_flag&C.P_TRACED != 0 {
    return true
  }

  // Timing check
  start := time.Now()
  time.Sleep(100 * time.Millisecond)
  elapsed := time.Since(start)
  if elapsed < 90*time.Millisecond || elapsed > 200*time.Millisecond {
    return true
  }

  return false
}`

/* ------------------------------------------------------------------ */
/*  Anti-analysis / VM / sandbox detection                             */
/* ------------------------------------------------------------------ */

const ANTI_ANALYSIS_STUB = `// --- Anti-Analysis: VM/Sandbox Detection ---
func isAnalysisEnvironment() bool {
  // VM detection via MAC address prefixes
  vmMACs := []string{
    "00:0C:29", "00:50:56", "00:05:69", // VMware
    "00:1C:42",                          // Parallels
    "08:00:27",                          // VirtualBox
    "00:16:3E",                          // Xen
    "00:15:5D",                          // Hyper-V
  }

  interfaces, _ := net.Interfaces()
  for _, iface := range interfaces {
    mac := iface.HardwareAddr.String()
    for _, prefix := range vmMACs {
      if strings.HasPrefix(mac, prefix) {
        return true
      }
    }
  }

  // Check for VM-specific files
  vmFiles := []string{
    "/proc/vmware", "/dev/vmware", // Linux VMware
    "C:\\Windows\\System32\\drivers\\vmmouse.sys", // Windows VMware
    "/usr/bin/VBoxClient", // VirtualBox
  }
  for _, f := range vmFiles {
    if _, err := os.Stat(f); err == nil {
      return true
    }
  }

  // Check CPU count (VMs often have 1)
  if runtime.NumCPU() < 2 {
    return true
  }

  // Check RAM (VMs often have < 4GB)
  var m runtime.MemStats
  runtime.ReadMemStats(&m)
  if m.Sys < 4*1024*1024*1024 {
    return true
  }

  // Check uptime (sandboxes have short uptimes)
  bootTime, _ := getBootTime()
  if time.Since(bootTime) < 10*time.Minute {
    return true
  }

  // User activity check (sandboxes have no user input)
  if !hasRecentUserActivity() {
    return true
  }

  return false
}

func getBootTime() (time.Time, error) {
  // Platform-specific boot time detection
  return time.Now().Add(-24 * time.Hour), nil
}

func hasRecentUserActivity() bool {
  // Check for recent mouse/keyboard activity
  return true
}`

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Add platform-specific anti-debugging checks to source code.
 *
 * @param source   - The source code to transform
 * @param platform - Target platform
 * @returns Source with anti-debugging checks injected
 */
export function addAntiDebug(
  source: string,
  platform: "windows" | "linux" | "macos"
): string {
  logger.debug({ platform }, "Anti-debug: injecting checks")

  let antiDebugCode: string
  switch (platform) {
    case "windows":
      antiDebugCode = WINDOWS_ANTI_DEBUG
      break
    case "linux":
      antiDebugCode = LINUX_ANTI_DEBUG
      break
    case "macos":
      antiDebugCode = MACOS_ANTI_DEBUG
      break
  }

  // Inject the check call at the start of main()
  const mainInjection = `
  // Anti-debug check
  if checkDebugger() {
    os.Exit(0)
  }
`

  // Find the main function and inject the check
  const mainPattern = /func\s+main\s*\(\s*\)\s*\{/
  let transformed = source

  if (mainPattern.test(transformed)) {
    transformed = transformed.replace(mainPattern, (match) => {
      return match + "\n" + mainInjection
    })
  }

  // Prepend the anti-debug function definitions before the main function
  const mainIndex = transformed.indexOf("func main()")
  if (mainIndex > 0) {
    transformed =
      transformed.slice(0, mainIndex) +
      antiDebugCode +
      "\n\n" +
      transformed.slice(mainIndex)
  } else {
    // No main function found, append at end
    transformed = transformed + "\n\n" + antiDebugCode
  }

  logger.debug("Anti-debug: checks injected")
  return transformed
}

/**
 * Generate an anti-analysis stub for VM/sandbox detection.
 *
 * @param platform - Target platform string
 * @returns Go source code for anti-analysis checks
 */
export function generateAntiAnalysisStub(platform: string): string {
  logger.debug({ platform }, "Anti-analysis: generating stub")

  const platformCheck = platform === "windows"
    ? `  // Windows-specific: check for analysis tools
  analysisTools := []string{
    "x64dbg.exe", "x32dbg.exe", "ollydbg.exe",
    "ProcessMonitor.exe", "procmon.exe",
    "Wireshark.exe", "Fiddler.exe",
    "pestudio.exe", "die.exe",
  }
  for _, tool := range analysisTools {
    if _, err := os.Stat("C:\\\\Program Files\\\\" + tool); err == nil {
      return true
    }
  }`
    : platform === "linux"
    ? `  // Linux-specific: check for analysis tools
  analysisTools := []string{
    "/usr/bin/strace", "/usr/bin/ltrace",
    "/usr/bin/gdb", "/usr/bin/valgrind",
    "/usr/bin/wireshark", "/usr/bin/tcpdump",
  }
  for _, tool := range analysisTools {
    if _, err := os.Stat(tool); err == nil {
      return true
    }
  }`
    : `  // macOS-specific: check for analysis tools
  analysisTools := []string{
    "/Applications/Xcode.app",
    "/usr/bin/sample", "/usr/bin/leaks",
    "/usr/bin/lldb", "/usr/bin/dtrace",
  }
  for _, tool := range analysisTools {
    if _, err := os.Stat(tool); err == nil {
      return true
    }
  }`

  return ANTI_ANALYSIS_STUB.replace(
    "  return true\n}",
    platformCheck + "\n  return true\n}"
  )
}
