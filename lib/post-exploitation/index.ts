// Post-Exploitation Module — Barrel Exports
// Central export point for all post-exploitation capabilities

export { LateralMovementEngine, lateralMovementEngine, type EngineConfig, type SessionOptions } from './engine';
export { CredentialVault, credentialVault } from './credential-vault';
export { Pathfinder, pathfinder } from './pathfinder';
export { OPSECScorer, opsecScorer, type OPSECScore, type OPSECAssessmentRequest, type OPSECAssessmentResult } from './opsec-scorer';
export { PostExploitationSwarmIntegration, initializePostExploitationSwarmIntegration } from './swarm-integration';

export { LateralMovementAgent } from './agents/lateral-movement-agent';
export { CredentialHarvesterAgent } from './agents/credential-harvester-agent';
export { PrivilegeEscalationAgent } from './agents/privilege-escalation-agent';
export { ADReconnaissanceAgent } from './agents/ad-reconnaissance-agent';

export * from './types';

// Techniques
export { smbExecution, SMBExecution } from './techniques/smb';
export { winrmExecution, WinRMExecution } from './techniques/winrm';
export { passTheHashExecution, PassTheHashExecution } from './techniques/pass-the-hash';
export { kerberoastingExecution, KerberoastingExecution } from './techniques/kerberoasting';
export { asrepRoastingExecution, ASREPRoastingExecution } from './techniques/as-rep-roasting';
export { KerberosUtils } from './techniques/kerberos-utils';
export { wmiTechnique, WMITechnique } from './techniques/wmi';
export { dcomTechnique, DCOMTechnique } from './techniques/dcom';

// BloodHound
export { BloodhoundAnalyzer } from './bloodhound/analyzer';
export { BloodhoundExporter } from './bloodhound/exporter';
export { BloodhoundImporter } from './bloodhound/importer';
export { BloodhoundStorage } from './bloodhound/storage';
