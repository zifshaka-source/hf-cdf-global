import crypto from 'crypto';
import { getSqlDb, persistDbToDisk } from './os-fabric';
import { RbacRole } from '../src/core/multi-tenant-types';

export interface AuthSessionPayload {
  sub: string;
  displayName: string;
  role: RbacRole;
  assignedTenantId?: string;
  issuedAt: number;
  expiresAt: number;
  jti: string;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const EPHEMERAL_SIGNING_SECRET =
  process.env.HFCDF_SESSION_SECRET && process.env.HFCDF_SESSION_SECRET.length >= 16
    ? process.env.HFCDF_SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const revokedTokens = new Set<string>();

function ensureAuthTables() {
  try {
    const db = getSqlDb();
    db.run(`
      CREATE TABLE IF NOT EXISTS auth_credentials (
        username TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    persistDbToDisk();
  } catch {
    // ignore if SQLite unavailable during unit import
  }
}

export function hashPasswordScrypt(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

export function verifyPasswordScrypt(password: string, storedHash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

export function signSessionToken(payload: AuthSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', EPHEMERAL_SIGNING_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): AuthSessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', EPHEMERAL_SIGNING_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AuthSessionPayload;
    if (revokedTokens.has(parsed.jti)) return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function revokeSessionToken(token: string) {
  const parsed = verifySessionToken(token);
  if (parsed?.jti) {
    revokedTokens.add(parsed.jti);
  }
}

function getStoredAdminRecord(): {
  username: string;
  displayName: string;
  role: RbacRole;
  passwordHash: string;
  salt: string;
} | null {
  try {
    ensureAuthTables();
    const db = getSqlDb();
    const res = db.exec(
      `SELECT username, display_name, role, password_hash, salt FROM auth_credentials LIMIT 1`
    );
    if (res.length > 0 && res[0].values.length > 0) {
      const [username, displayName, role, passwordHash, salt] = res[0].values[0];
      return {
        username: String(username),
        displayName: String(displayName),
        role: String(role) as RbacRole,
        passwordHash: String(passwordHash),
        salt: String(salt),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function initAuthHub() {
  ensureAuthTables();
}

export function getAuthStatus(): {
  envPasscodeConfigured: boolean;
  adminClaimed: boolean;
  needsBootstrap: boolean;
} {
  const envPasscode = (process.env.HFCDF_ADMIN_PASSCODE || '').trim();
  const stored = getStoredAdminRecord();
  const envPasscodeConfigured = envPasscode.length > 0;
  const adminClaimed = stored !== null;
  return {
    envPasscodeConfigured,
    adminClaimed,
    needsBootstrap: !envPasscodeConfigured && !adminClaimed,
  };
}

export function bootstrapFirstAdmin(params: {
  username: string;
  password: string;
  displayName?: string;
}): { ok: boolean; error?: string; token?: string; session?: AuthSessionPayload } {
  const status = getAuthStatus();
  if (!status.needsBootstrap) {
    return { ok: false, error: 'ALREADY_CONFIGURED: Sovereign admin is already claimed or env-configured.' };
  }

  const username = params.username.trim();
  const password = params.password;
  if (username.length < 3) {
    return { ok: false, error: 'Commander ID / email must be at least 3 characters.' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Passphrase must be at least 8 characters.' };
  }

  const { hash, salt } = hashPasswordScrypt(password);
  const displayName = (params.displayName || username).trim();
  ensureAuthTables();
  const db = getSqlDb();
  db.run(
    `INSERT INTO auth_credentials (username, display_name, role, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [username, displayName, 'global_operator', hash, salt, new Date().toISOString()]
  );
  persistDbToDisk();

  const session: AuthSessionPayload = {
    sub: username,
    displayName,
    role: 'global_operator',
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    jti: crypto.randomUUID(),
  };

  return {
    ok: true,
    token: signSessionToken(session),
    session,
  };
}

export function authenticateOperator(params: {
  username: string;
  password: string;
  requestedRole?: RbacRole;
  requestedTenantId?: string;
}): { ok: boolean; error?: string; token?: string; session?: AuthSessionPayload } {
  const envPasscode = (process.env.HFCDF_ADMIN_PASSCODE || '').trim();
  const stored = getStoredAdminRecord();

  let verified = false;
  let displayName = params.username.trim() || 'Authorized Commander';

  if (envPasscode.length > 0) {
    const providedBuf = Buffer.from(params.password);
    const envBuf = Buffer.from(envPasscode);
    if (providedBuf.length === envBuf.length && crypto.timingSafeEqual(providedBuf, envBuf)) {
      verified = true;
    }
  } else if (stored) {
    if (
      params.username.trim().toLowerCase() === stored.username.toLowerCase() &&
      verifyPasswordScrypt(params.password, stored.passwordHash, stored.salt)
    ) {
      verified = true;
      displayName = stored.displayName;
    }
  } else {
    return { ok: false, error: 'BOOTSTRAP_REQUIRED: Claim the initial sovereign admin account first.' };
  }

  if (!verified) {
    return { ok: false, error: 'INVALID_CREDENTIALS: Verification failed.' };
  }

  const role: RbacRole = params.requestedRole || 'global_operator';
  const session: AuthSessionPayload = {
    sub: params.username.trim(),
    displayName,
    role,
    assignedTenantId:
      role === 'customer_admin' ||
      role === 'customer_analyst' ||
      role === 'auditor' ||
      role === 'billing_admin'
        ? params.requestedTenantId
        : undefined,
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    jti: crypto.randomUUID(),
  };

  return {
    ok: true,
    token: signSessionToken(session),
    session,
  };
}

export function switchAuthenticatedRoleContext(
  currentSession: AuthSessionPayload,
  nextRole: RbacRole,
  assignedTenantId?: string
): { token: string; session: AuthSessionPayload } {
  const session: AuthSessionPayload = {
    sub: currentSession.sub,
    displayName: currentSession.displayName,
    role: nextRole,
    assignedTenantId:
      nextRole === 'customer_admin' ||
      nextRole === 'customer_analyst' ||
      nextRole === 'auditor' ||
      nextRole === 'billing_admin'
        ? assignedTenantId
        : undefined,
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    jti: crypto.randomUUID(),
  };
  return {
    token: signSessionToken(session),
    session,
  };
}
