/**
 * Post-Exploitation Service
 * High-level service layer that wraps the post-exploitation engine
 * for consumption by API routes and frontend components.
 */

import { prisma } from '@/lib/db';
import logger from '@/lib/logger';
import { lateralMovementEngine } from './engine';
import { credentialVault } from './credential-vault';
import { pathfinder } from './pathfinder';
import { opsecScorer } from './opsec-scorer';
import type {
  CompromisedHost,
  Credential,
  AttackPath,
  PrivilegeLevel,
  LateralMovementRequest,
  LateralMovementResult,
  CredentialHarvestRequest,
  CredentialHarvestResult,
  OPSECAssessmentRequest,
} from './types';

const log = logger.child({ module: 'post-exploitation-service' });

// ---------------------------------------------------------------------------
// Compromised Hosts
// ---------------------------------------------------------------------------

export async function listCompromisedHosts(opts?: {
  skip?: number;
  take?: number;
  domain?: string;
  privileges?: PrivilegeLevel;
  search?: string;
}): Promise<CompromisedHost[]> {
  const where: any = {};
  if (opts?.domain) where.domain = opts.domain;
  if (opts?.privileges) where.privileges = opts.privileges;
  if (opts?.search) {
    where.OR = [
      { hostname: { contains: opts.search, mode: 'insensitive' } },
      { ipAddress: { contains: opts.search, mode: 'insensitive' } },
    ];
  }

  const rows = await prisma.compromisedHost.findMany({
    where,
    include: { credentials: true },
    orderBy: { lastSeen: 'desc' },
    skip: opts?.skip,
    take: opts?.take,
  });

  return rows.map((host) => ({
    id: host.id,
    hostname: host.hostname,
    ipAddress: host.ipAddress,
    os: host.os ?? undefined,
    domain: host.domain ?? undefined,
    privileges: host.privileges as PrivilegeLevel,
    implantId: host.implantId ?? undefined,
    firstCompromised: host.firstCompromised,
    lastSeen: host.lastSeen,
    credentials: host.credentials.map((c) => ({
      id: c.id,
      type: c.type as Credential['type'],
      username: c.username,
      password: c.password ?? undefined,
      hash: c.hash ?? undefined,
      domain: c.domain ?? undefined,
      sourceHostId: c.sourceHostId ?? undefined,
      createdAt: c.createdAt,
    })),
  }));
}

export async function countCompromisedHosts(opts?: {
  domain?: string;
  privileges?: PrivilegeLevel;
  search?: string;
}): Promise<number> {
  const where: any = {};
  if (opts?.domain) where.domain = opts.domain;
  if (opts?.privileges) where.privileges = opts.privileges;
  if (opts?.search) {
    where.OR = [
      { hostname: { contains: opts.search, mode: 'insensitive' } },
      { ipAddress: { contains: opts.search, mode: 'insensitive' } },
    ];
  }
  return prisma.compromisedHost.count({ where });
}

export async function getCompromisedHostById(id: string): Promise<CompromisedHost | null> {
  const host = await prisma.compromisedHost.findUnique({
    where: { id },
    include: { credentials: true },
  });
  if (!host) return null;

  return {
    id: host.id,
    hostname: host.hostname,
    ipAddress: host.ipAddress,
    os: host.os ?? undefined,
    domain: host.domain ?? undefined,
    privileges: host.privileges as PrivilegeLevel,
    implantId: host.implantId ?? undefined,
    firstCompromised: host.firstCompromised,
    lastSeen: host.lastSeen,
    credentials: host.credentials.map((c) => ({
      id: c.id,
      type: c.type as Credential['type'],
      username: c.username,
      password: c.password ?? undefined,
      hash: c.hash ?? undefined,
      domain: c.domain ?? undefined,
      sourceHostId: c.sourceHostId ?? undefined,
      createdAt: c.createdAt,
    })),
  };
}

export async function createCompromisedHost(
  data: Omit<CompromisedHost, 'id' | 'firstCompromised' | 'lastSeen' | 'credentials'>
): Promise<CompromisedHost> {
  const created = await prisma.compromisedHost.create({
    data: {
      hostname: data.hostname,
      ipAddress: data.ipAddress,
      os: data.os,
      domain: data.domain,
      privileges: data.privileges,
      implantId: data.implantId,
    },
    include: { credentials: true },
  });

  log.info({ hostId: created.id, hostname: created.hostname }, 'Created compromised host');

  return {
    id: created.id,
    hostname: created.hostname,
    ipAddress: created.ipAddress,
    os: created.os ?? undefined,
    domain: created.domain ?? undefined,
    privileges: created.privileges as PrivilegeLevel,
    implantId: created.implantId ?? undefined,
    firstCompromised: created.firstCompromised,
    lastSeen: created.lastSeen,
    credentials: [],
  };
}

export async function updateCompromisedHost(
  id: string,
  data: Partial<Omit<CompromisedHost, 'id' | 'firstCompromised' | 'lastSeen' | 'credentials'>>
): Promise<CompromisedHost | null> {
  const updated = await prisma.compromisedHost.update({
    where: { id },
    data: {
      hostname: data.hostname,
      ipAddress: data.ipAddress,
      os: data.os,
      domain: data.domain,
      privileges: data.privileges,
      implantId: data.implantId,
    },
    include: { credentials: true },
  }).catch(() => null);

  if (!updated) return null;

  return {
    id: updated.id,
    hostname: updated.hostname,
    ipAddress: updated.ipAddress,
    os: updated.os ?? undefined,
    domain: updated.domain ?? undefined,
    privileges: updated.privileges as PrivilegeLevel,
    implantId: updated.implantId ?? undefined,
    firstCompromised: updated.firstCompromised,
    lastSeen: updated.lastSeen,
    credentials: updated.credentials.map((c) => ({
      id: c.id,
      type: c.type as Credential['type'],
      username: c.username,
      password: c.password ?? undefined,
      hash: c.hash ?? undefined,
      domain: c.domain ?? undefined,
      sourceHostId: c.sourceHostId ?? undefined,
      createdAt: c.createdAt,
    })),
  };
}

export async function deleteCompromisedHost(id: string): Promise<boolean> {
  try {
    await prisma.compromisedHost.delete({ where: { id } });
    log.info({ hostId: id }, 'Deleted compromised host');
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Credentials (Vault Integration)
// ---------------------------------------------------------------------------

export async function storeCredentialInVault(
  credential: Omit<Credential, 'id' | 'createdAt'>
): Promise<Credential> {
  await credentialVault.initialize();
  return credentialVault.storeCredential(credential);
}

export async function getCredentialFromVault(id: string): Promise<Credential | null> {
  await credentialVault.initialize();
  return credentialVault.getCredential(id);
}

export async function harvestCredentialsViaVault(
  request: CredentialHarvestRequest
): Promise<CredentialHarvestResult> {
  await credentialVault.initialize();
  return credentialVault.harvestCredentials(request);
}

export async function getVaultStatistics(): Promise<{
  totalCredentials: number;
  byType: Record<string, number>;
  byDomain: Record<string, number>;
}> {
  await credentialVault.initialize();
  return credentialVault.getVaultStats();
}

// ---------------------------------------------------------------------------
// Attack Paths
// ---------------------------------------------------------------------------

export async function discoverAttackPaths(
  startHostId: string,
  targetPrivilege: PrivilegeLevel = 'domain_admin'
): Promise<AttackPath[]> {
  return pathfinder.discoverAttackPaths(startHostId, targetPrivilege);
}

export async function getRecommendedAttackPath(
  startHostId: string,
  targetPrivilege: PrivilegeLevel = 'domain_admin'
): Promise<AttackPath | null> {
  return pathfinder.getRecommendedPath(startHostId, targetPrivilege);
}

export async function getAttackGraphVisualization(): Promise<{
  nodes: Array<{ id: string; label: string; group: string }>;
  edges: Array<{ from: string; to: string; label: string; confidence: number }>;
}> {
  return pathfinder.visualizeGraph();
}

// ---------------------------------------------------------------------------
// OPSEC Assessment
// ---------------------------------------------------------------------------

export async function assessTechniqueOPSEC(
  request: OPSECAssessmentRequest
): Promise<ReturnType<typeof opsecScorer.assessOPSEC>> {
  return opsecScorer.assessOPSEC(request);
}

export function getAvailableOPSECTechniques(): string[] {
  return opsecScorer.getAvailableTechniques();
}

export function getOPSECTechniqueProfile(technique: string) {
  return opsecScorer.getTechniqueProfile(technique);
}

// ---------------------------------------------------------------------------
// Lateral Movement Engine Operations
// ---------------------------------------------------------------------------

export async function initializeEngine(): Promise<void> {
  await lateralMovementEngine.initialize();
  log.info('Post-exploitation engine initialized');
}

export async function startMovementSession(
  workflowSessionId?: string,
  options?: { targetDomain?: string; targetPrivilege?: PrivilegeLevel; autoHarvest?: boolean; autoPivot?: boolean }
) {
  await lateralMovementEngine.initialize();
  return lateralMovementEngine.startSession(workflowSessionId, options);
}

export async function stopMovementSession(sessionId: string): Promise<void> {
  return lateralMovementEngine.stopSession(sessionId);
}

export async function executeLateralMovement(request: LateralMovementRequest): Promise<LateralMovementResult> {
  await lateralMovementEngine.initialize();
  return lateralMovementEngine.executeMovement(request);
}

export async function autoPivotFromHost(
  sourceHostId: string,
  targetPrivilege: PrivilegeLevel = 'domain_admin',
  sessionId?: string
) {
  await lateralMovementEngine.initialize();
  return lateralMovementEngine.autoPivot(sourceHostId, targetPrivilege, sessionId);
}

export async function getMovementSessionStats(sessionId: string) {
  return lateralMovementEngine.getSessionStats(sessionId);
}

export async function getPostExploitationStats() {
  const [hostCount, credentialCount, sessionCount, vaultStats] = await Promise.all([
    prisma.compromisedHost.count(),
    prisma.credential.count(),
    prisma.lateralMovementSession.count(),
    credentialVault.getVaultStats().catch(() => ({ totalCredentials: 0, byType: {}, byDomain: {} })),
  ]);

  return {
    compromisedHosts: hostCount,
    credentials: credentialCount,
    lateralMovementSessions: sessionCount,
    vault: vaultStats,
  };
}
