# 07 — Payments & Billing

> **TL;DR.** Four plans: Free, Starter, Pro, Team. Two billing periods: monthly, yearly (yearly = ~17% off). Three payment providers: **Click** + **Payme** for Uzbek users (UZS), **Stripe** for international (USD). Subscription state lives in `billing.subscriptions`; entitlement lookup is centralised in `check_entitlement()`. Webhooks are the source of truth for state changes — never trust the client redirect. **Phase 4 feature** (not in MVP).

---

## 1. Plans

| Plan | UZS / month | UZS / year | USD / month | USD / year | Highlights |
|---|---|---|---|---|---|
| **Free** | 0 | 0 | 0 | 0 | 1 attempt/month · Reading + Listening only · summary feedback · no certificate |
| **Starter** | 49 000 | 490 000 | $4.99 | $49 | 5 attempts/month · all 4 skills · detailed feedback · no certificate |
| **Pro** | 119 000 | 1 190 000 | $11.99 | $119 | unlimited attempts · all 4 skills · detailed UZ/EN feedback · PDF certificate · history dashboard · priority support |
| **Team** | from 1 200 000/month | from 12 000 000/year | from $120/month | from $1 200/year | seats (10+) · admin dashboard · CSV export · branded certificates · SSO (Phase 5) |

Yearly = ~10 × monthly (≈17% saving).

> Prices are illustrative MVP defaults. Adjust in `billing.plans` seed; never hard-code in code.

### Trial
- Pro: **7-day free trial**, no credit card required. After trial → auto-downgrade to Free unless paid.
- Starter: no trial (price low enough).
- Team: 14-day pilot via sales contact.

### Promo codes (Phase 4.1)
Stored as `entitlement_overrides` rows. e.g. `STUDENT50` → 50% off first 3 months.

---

## 2. Entitlements (canonical keys)

| Key | Type | Free | Starter | Pro | Team |
|---|---|---|---|---|---|
| `attempts.monthly_quota` | int \| `"unlimited"` | 1 | 5 | unlimited | unlimited (per seat) |
| `skills.allowed` | string[] | `[reading, listening]` | all 4 | all 4 | all 4 |
| `feedback.detail` | enum | `summary` | `detailed` | `detailed` | `detailed` |
| `certificate.pdf` | bool | false | false | true | true (branded) |
| `history.full` | bool | last 3 attempts | last 12 | unlimited | unlimited |
| `human_review.access` | bool | false | false | true | true |
| `team.seats` | int | 0 | 0 | 1 | 10+ |
| `support.priority` | bool | false | false | true | true |
| `api.access` | bool | false | false | false | true |
| `branded_certs` | bool | false | false | false | true |

Stored as JSONB in `billing.plans.entitlements`. Looked up via `check_entitlement(user_id, key)` (see [`05-auth-and-rbac.md`](05-auth-and-rbac.md) §6).

---

## 3. Subscription lifecycle

```
                    ┌────────────────────┐
                    │   no subscription  │ ← treated as Free plan
                    └──────────┬─────────┘
              user picks Pro   │
                               ▼
                    ┌────────────────────┐
                    │      trialing      │ 7 days, payment captured at end
                    └──────────┬─────────┘
            successful charge  │  failure / chargeback
                               ▼              ▼
                    ┌────────────────────┐  ┌──────────────┐
                    │       active       │  │   past_due    │
                    └──────────┬─────────┘  └──────┬───────┘
              user cancels     │                   │ retries fail (Stripe Smart Retries)
                               ▼                   ▼
                    ┌────────────────────┐  ┌──────────────┐
                    │     canceled       │  │   expired    │
                    │  (at period end)   │  │              │
                    └────────────────────┘  └──────────────┘
```

State transitions only happen via **webhook** events from the provider, never on redirect.

---

## 4. Provider integration

### 4.1 Stripe (international, USD/EUR)

Setup:
- Create products + prices in Stripe Dashboard. `price_id` stored in `billing.plans.metadata.stripe_price_id_monthly` etc.
- Webhook endpoint: `POST https://api.aiexam.uz/exam/v1/webhooks/stripe`. Signing secret in `STRIPE_WEBHOOK_SECRET`.

Flow:
1. User clicks "Upgrade to Pro" → `POST /v1/checkout/sessions {plan_id: "pro", period: "monthly", currency: "usd", provider: "stripe"}`.
2. Server: create `payment_intents` row (status `created`); call `stripe.checkout.Session.create(line_items=[{price_id, quantity:1}], mode=subscription, customer_email=user.email, success_url=…, cancel_url=…, client_reference_id=payment_intent_id, metadata={...})`.
3. Server returns `{redirect_url}`.
4. User pays at Stripe-hosted page.
5. Stripe → webhook `checkout.session.completed` → handler creates/updates `billing.subscriptions` row, marks `payment_intents` `succeeded`.
6. Subsequent renewals → webhook `invoice.payment_succeeded` → write `invoices` row, extend `current_period_end`.

Events we handle:
- `checkout.session.completed`
- `customer.subscription.created` / `.updated` / `.deleted`
- `invoice.payment_succeeded` / `.payment_failed`
- `invoice.upcoming` (3 days before renewal — opportunity to email user)

### 4.2 Click (Uzbekistan, UZS)

Click is a Uzbek payment aggregator. Two integration modes — we use **Click-Up** (hosted checkout).

Setup: register at `merchant.click.uz`, get `MERCHANT_ID`, `SERVICE_ID`, `MERCHANT_USER_ID`, `SECRET_KEY`. Webhook URL: `POST https://api.aiexam.uz/exam/v1/webhooks/click`.

Flow:
1. User clicks "To'lash (Click)" → `POST /v1/checkout/sessions {plan_id: "pro", period: "monthly", currency: "uzs", provider: "click"}`.
2. Server: create `payment_intents` row, generate Click form fields (signed with MD5 of `secret_key + merchant_trans_id + amount + …`).
3. Frontend redirects to Click checkout with the signed form.
4. User pays via Click app or card.
5. Click webhook calls our handler twice: `action=0` (Prepare) and `action=1` (Complete). We respond with `{error, error_note, click_trans_id, merchant_trans_id, merchant_prepare_id}`.
6. On `action=1` success → mark `payment_intents` succeeded, **create or extend** `billing.subscriptions` for one period (Click does not natively support recurring subs; we treat each payment as one-period). Email user 7 days before renewal with a renewal link.

### 4.3 Payme (Uzbekistan, UZS)

Payme uses a JSON-RPC merchant API. We integrate the **standard merchant flow**.

Setup: `PAYME_MERCHANT_ID`, `PAYME_API_KEY` for production. Webhook (Payme calls it "Merchant API"): `POST https://api.aiexam.uz/exam/v1/webhooks/payme` (Basic auth: `Paycom:<api_key>`).

Flow:
1. User clicks "To'lash (Payme)" → server creates `payment_intents` row, returns a Payme checkout URL `https://checkout.paycom.uz/<base64({m: MERCHANT_ID, ac.payment_intent_id: PI_ID, a: amount_in_tiyin})>`.
2. User pays at Payme checkout.
3. Payme calls our merchant API methods in sequence:
   - `CheckPerformTransaction` — we verify the `account.payment_intent_id` exists, amount matches, status is `created`.
   - `CreateTransaction` — we link Payme tx id to our `payment_intents.provider_session_id`, status `redirected`.
   - `PerformTransaction` — we mark `succeeded`, create/extend subscription.
   - `CancelTransaction` (rare) — refund flow.
4. We respond with JSON-RPC results following Payme's error-code table.

> Implement Payme handlers exactly as their docs require — error codes are strict.

### 4.4 Manual provider (admin)

`provider = 'manual'` lets superadmin create a subscription with no payment record (e.g. partnerships, comp accounts). UI in `/admin/users/{id}/billing`.

---

## 5. Webhook handler skeleton

```python
@router.post("/v1/webhooks/stripe", status_code=204)
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_session)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise UnauthorizedError("Bad signature")

    # Idempotency: insert (provider, provider_event_id) — UNIQUE constraint
    try:
        await db.execute(insert(WebhookEvent).values(
            provider="stripe",
            provider_event_id=event.id,
            event_type=event.type,
            payload=event.to_dict(),
        ))
        await db.commit()
    except IntegrityError:
        return Response(status_code=204)  # already processed

    # Dispatch
    handler = STRIPE_HANDLERS.get(event.type)
    if handler:
        await handler(db, event)
        await db.commit()
    return Response(status_code=204)
```

**Always respond fast** (≤ 5s). Heavy work goes into arq. Stripe retries on non-2xx.

---

## 6. Idempotency

| Table | Idempotency mechanism |
|---|---|
| `webhook_events` | `(provider, provider_event_id) UNIQUE` |
| `payment_intents` | `(provider, provider_session_id) UNIQUE` |
| `invoices` | `(provider, provider_invoice_id) UNIQUE` |
| `subscriptions` | partial unique index `(user_id) WHERE status IN (...)` |

Replay a webhook → second insert fails with `UNIQUE` violation → handler returns 204 without re-processing. **Test this** before going live.

---

## 7. Currencies & amounts

- UZS amounts stored as `BIGINT tiyin` (1 UZS = 100 tiyin). 49 000 UZS = `4_900_000` tiyin.
- USD amounts stored as `INT cents`. $4.99 = `499`.
- Always include `currency` column. Never compare amounts across currencies in queries.

Display:
- UZ users: format with `Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS' })` → "49 000 so'm".
- EN users: format with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` → "$4.99".
- Pricing page shows BOTH (auto-detect locale + provider availability).

---

## 8. Refunds

| Plan | Refund policy |
|---|---|
| Starter / Pro monthly | No refund after first attempt is taken in the period. Otherwise, full refund within 7 days. |
| Yearly | Pro-rata refund within 14 days, none after. |
| Team | Custom contract. |

Implement via provider dashboards manually for v1. Refund creates webhook → we mark subscription `canceled`, `current_period_end = now()`.

---

## 9. Free tier abuse prevention

- 1 attempt per **calendar month per user_id**. Resets on UTC month start.
- 1 attempt per **email + IP combination per month** to prevent multi-account farming (Phase 2).
- Captcha on signup (hCaptcha) when signup velocity from one IP > 5/hour.

---

## 10. Tax & invoicing

- We're billing as a UZ entity to start. UZ VAT (12%) is included in displayed prices ("Narxlar QQS bilan").
- Stripe automatically handles US/EU VAT/GST. Display "+ tax may apply" on Stripe checkout.
- Invoices: PDF generated by provider; we email the user via Resend after `invoice.payment_succeeded`.
- For Team plans, generate our own branded invoices with sequential `invoice_number`. Phase 4.5.

---

## 11. UI requirements (see [`09-screens-and-flows.md`](09-screens-and-flows.md))

- `/pricing` — comparison table, currency switcher (auto-detected, manual override), CTA buttons per plan.
- `/checkout/start?plan=pro&period=monthly` — provider picker (Click | Payme | Stripe), billing summary, "To'lash" button.
- `/me/billing` — current plan, next renewal date, recent invoices, "Cancel" button.
- Paywall modals — when a user hits an entitlement (e.g. tries to take Speaking on Free plan), modal shows what they're missing + "Upgrade" CTA.
- All modals & pages support light/dark + UZ/EN per [`08-design-system.md`](08-design-system.md).

---

## 12. Security

- **Never** trust the redirect URL parameters. Always verify via webhook + DB lookup.
- **Never** store card details. All providers handle this.
- Webhook endpoints are NOT rate-limited the same way (Stripe retries with exponential backoff). Allowlist provider IPs at Caddy if abuse appears.
- Log every webhook event before processing.
- Audit trail: every `subscription` state change writes to `analytics.events` with `type='subscription_changed'`.

---

## 13. Legal

- ToS at `aiexam.uz/terms` (UZ + EN).
- Privacy Policy at `aiexam.uz/privacy`.
- Refund Policy at `aiexam.uz/refunds`.
- Public offer (UZ legal requirement) at `aiexam.uz/offer`.
- All four pages must exist before pilot.
- Click + Payme require a registered legal entity (LLC) in UZ. Account in CEO's name initially; transition to LLC by Phase 5.

---

## 14. Acceptance

- [ ] Three providers (Stripe, Click, Payme) tested in sandbox: a successful checkout creates an `active` subscription.
- [ ] Replaying a webhook does **not** double-charge or double-create a subscription.
- [ ] Failed payment moves subscription to `past_due`; retry success → back to `active`; final fail → `expired`.
- [ ] User cancelling at period end keeps Pro features until period_end, then auto-downgrades to Free.
- [ ] Free user trying to take a 4-skill exam gets the upgrade modal, not a 500 error.
- [ ] Currency formatting matches locale: UZ user sees "49 000 so'm", EN user sees "$4.99".
- [ ] Invoice email arrives within 60s of `invoice.payment_succeeded`.
- [ ] DB has a unique partial index ensuring no user has two simultaneously-active subscriptions.
- [ ] Stripe webhook signature mismatch returns 401 and the `webhook_events` row is **not** written.
