import ModerationAction from "../../models/moderationAction.js"
import Notice from "../../models/notice.js"
import { logger } from "../../libraries/logger.js"
import type { AuthUser } from "../../middleware/userAuth.js"
import type { ModerationActionId, ModerationTargetKind } from "../../constant/app.js"
import type { Types } from "mongoose"

export interface ModerationRecord {
  action: ModerationActionId
  targetKind: ModerationTargetKind
  targetId: Types.ObjectId
  targetLabel: string
  reason: string
  recipientId: Types.ObjectId
}

/**
 * Records a moderation decision and the notice that explains it.
 *
 * A standalone MongoDB has no multi-document transaction, so this is
 * compensating rather than atomic. The action is written first because it is
 * the accountability record; the notice is then retried once. If the notice
 * still fails, the action id is logged so the notification can be replayed by
 * hand. Losing the audit row would be worse than a notice that has to be
 * re-sent, which is why the order is not reversed.
 */
export async function recordAndNotify(entry: ModerationRecord, actor: AuthUser): Promise<void> {
  const action = await ModerationAction.create({
    action: entry.action,
    targetKind: entry.targetKind,
    targetId: entry.targetId,
    targetLabel: entry.targetLabel,
    reason: entry.reason,
    actorId: actor.id,
    actorSlug: actor.slug,
  })

  const notice = {
    userId: entry.recipientId,
    actionId: action._id,
    action: entry.action,
    targetKind: entry.targetKind,
    targetId: entry.targetId,
    targetLabel: entry.targetLabel,
    reason: entry.reason,
    actorId: actor.id,
    readAt: null,
    appeal: null,
  }

  try {
    await Notice.create(notice)
  } catch {
    try {
      await Notice.create(notice)
    } catch (err) {
      logger.error(
        { actionId: action._id.toString(), targetId: entry.targetId.toString(), err },
        "moderation notice could not be written",
      )
    }
  }
}
