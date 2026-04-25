# 02 — API Spec

> Full canonical contract: [`/docs/api-contracts.md`](../../../docs/api-contracts.md) § 6.
> OpenAPI live: `/exam/v1/docs`

## Endpoint summary

### Student (JWT cookie)
| Method | Path | Notes |
|---|---|---|
| GET | `/v1/exams/blueprints` | List available exams |
| POST | `/v1/attempts` | Body: `{blueprint_id, locale?}` |
| GET | `/v1/attempts/{id}` | Attempt state |
| GET | `/v1/attempts/{id}/next-item` | Adaptive next |
| POST | `/v1/attempts/{id}/responses` | Body varies by item type |
| POST | `/v1/attempts/{id}/sections/{n}/finish` | Mark section complete |
| POST | `/v1/attempts/{id}/finish` | Finalize, trigger final scoring |
| GET | `/v1/attempts/{id}/results` | Per-section + overall |
| GET | `/v1/attempts/{id}/scoring/events` | SSE for async scoring |
| GET | `/v1/attempts/{id}/certificate` | Signed PDF URL |
| GET | `/v1/uploads/audio/presign` | Presigned PUT for audio |
| GET | `/v1/me/history` | Past attempts |

### Examiner (role=examiner)
| Method | Path |
|---|---|
| GET | `/v1/review-queue` |
| POST | `/v1/review-queue/{id}/decide` |

## Implementation pointers
- Routers: `src/exam_platform/api/v1/{attempts,uploads,results,review,history}.py`
- Auth dep: `src/exam_platform/api/deps.py` — `current_user`, `attempt_owner`
- Data-engine client: `src/exam_platform/adapters/data_engine/client.py` — `DataEngineClient.get_next_item(theta, skill, exclude_ids)`
