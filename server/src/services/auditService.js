import AuditLog from '../models/AuditLog.js';

export async function logAction({ actor, actorRole = 'system', action, targetType = '', targetId = '', details = {} }) {
  try {
    await AuditLog.create({ actor: actor || null, actorRole, action, targetType, targetId: String(targetId || ''), details });
  } catch (err) {
    console.error('[audit] failed to write audit log:', err.message);
  }
}
