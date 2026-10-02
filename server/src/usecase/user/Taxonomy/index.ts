import {
  BUSINESS_MODELS,
  EXPERIENCE_BANDS,
  ROLES,
  ROLE_STATUS,
  TOPICS,
  TOPIC_KIND,
  TOPIC_QUOTA,
} from "../../../constant/app.js"
import { LANGUAGES } from "../../../utils/languages.js"

export const TaxonomyUsecase = {
  async Get() {
    return {
      roles: ROLES.map((id) => ({ id, status: ROLE_STATUS[id] })),
      topics: TOPICS.map((id) => ({ id, kind: TOPIC_KIND[id] })),
      models: BUSINESS_MODELS,
      experience: EXPERIENCE_BANDS,
      languages: LANGUAGES,
      topicQuota: TOPIC_QUOTA,
    }
  },
}
