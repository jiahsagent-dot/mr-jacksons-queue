# Mr Jackson's — Operational Cost Per Transaction
*Structured for Research & Analysis · Last updated: March 2026*

---

## 1. Services Used & Pricing

### 1.1 Stripe (Payments)
- **Plan:** Pay-as-you-go
- **AU domestic card fee:** 1.7% + $0.30 AUD per successful charge
- **International card fee:** 3.5% + $0.30 AUD per successful charge
- **Refunds:** Stripe does NOT refund the processing fee
- **Payout:** T+2 business days to bank account
- **No monthly fee**
- **Source:** stripe.com/au/pricing

### 1.2 ClickSend (SMS)
- **Plan:** Pay-as-you-go
- **AU SMS rate:** ~$0.0306 AUD per SMS (standard rate, ~1 credit per SMS)
- **No monthly fee**
- **Source:** clicksend.com/pricing

### 1.3 Supabase (Database + Auth)
- **Plan:** Free tier (current)
- **Free tier limits:**
  - 500MB database storage
  - 2GB bandwidth
  - 50,000 monthly active users
  - 500MB file storage
- **Pro plan (if needed):** $25 USD/month (~$38 AUD/month)
- **Cost per transaction:** $0 (absorbed into flat plan)
- **Source:** supabase.com/pricing

### 1.4 Vercel (Hosting + Serverless)
- **Plan:** Hobby (free) / Pro ($20 USD/month if needed)
- **Serverless function invocations:** 100GB-hours free, then $0.40/GB-hour
- **Bandwidth:** 100GB free, then $0.15/GB
- **Cost per transaction:** ~$0 at current scale
- **Source:** vercel.com/pricing

---

## 2. SMS Triggers Per Customer Journey

### Booking Flow
| Trigger | SMS Count | Cost |
|---------|-----------|------|
| Booking confirmation | 1 SMS | $0.031 |
| 24hr reminder (bookings/remind) | 1 SMS | $0.031 |
| Cancellation confirmation | 1 SMS | $0.031 |
| No-show / auto-release | 1 SMS | $0.031 |
| **Total (full booking lifecycle)** | **up to 4 SMS** | **~$0.12** |
| **Typical (confirm + reminder)** | **2 SMS** | **~$0.06** |

### Queue Flow
| Trigger | SMS Count | Cost |
|---------|-----------|------|
| Table ready notification | 1 SMS | $0.031 |
| No-show expired (apology SMS) | 1 SMS | $0.031 |
| Order preparing (if queue + table) | 1 SMS | $0.031 |
| **Total (typical queue lifecycle)** | **1–2 SMS** | **~$0.03–$0.06** |

### Order Flow (Paid Online)
| Trigger | SMS Count | Cost |
|---------|-----------|------|
| Payment confirmed (Stripe webhook) | 1 SMS | $0.031 |
| Order cancelled by staff | 1 SMS (conditional) | $0.031 |
| **Typical** | **1 SMS** | **~$0.031** |

---

## 3. Cost Per Transaction — Modelled Scenarios

### Average order value assumptions:
- **Low:** $18 AUD
- **Mid:** $28 AUD (assumed average)
- **High:** $45 AUD

### Domestic card (1.7% + $0.30):

| Order Value | Stripe Fee | SMS (1x) | Total Op Cost | % of Order |
|-------------|-----------|----------|---------------|------------|
| $18.00 | $0.606 | $0.031 | **$0.637** | **3.54%** |
| $28.00 | $0.776 | $0.031 | **$0.807** | **2.88%** |
| $45.00 | $1.065 | $0.031 | **$1.096** | **2.44%** |

### International card (3.5% + $0.30):

| Order Value | Stripe Fee | SMS (1x) | Total Op Cost | % of Order |
|-------------|-----------|----------|---------------|------------|
| $18.00 | $0.930 | $0.031 | **$0.961** | **5.34%** |
| $28.00 | $1.280 | $0.031 | **$1.311** | **4.68%** |
| $45.00 | $1.875 | $0.031 | **$1.906** | **4.24%** |

### Blended estimate (assume 90% domestic, 10% international, avg $28 order):
- Weighted Stripe fee: (0.9 × $0.776) + (0.1 × $1.280) = **$0.826**
- SMS: **$0.031**
- **Blended cost per order: ~$0.857 AUD (~3.06% of $28)**

---

## 4. Cost Per Booking (No Payment)

| Scenario | SMS Count | Cost |
|----------|-----------|------|
| Book + show up | 2 SMS (confirm + reminder) | $0.062 |
| Book + no-show | 3 SMS (confirm + reminder + no-show) | $0.093 |
| Book + cancel | 2 SMS (confirm + cancel) | $0.062 |
| **Typical** | **2 SMS** | **~$0.062** |

*No Stripe fee — bookings don't take payment.*

---

## 5. Cost Per Queue Entry (No Payment)

| Scenario | SMS Count | Cost |
|----------|-----------|------|
| Join + get seated | 1 SMS (table ready) | $0.031 |
| Join + no-show | 2 SMS (table ready + apology) | $0.062 |
| Join + order online | 1 SMS (table ready) + order cost | $0.031 + order cost |
| **Typical** | **1 SMS** | **~$0.031** |

---

## 6. Daily & Monthly Cost Projections

### Scenario: 50 orders/day, 20 bookings/day, 30 queue entries/day

| Line Item | Daily | Monthly (30d) |
|-----------|-------|---------------|
| Stripe fees (50 × $0.826) | $41.30 | $1,239 |
| SMS – orders (50 × $0.031) | $1.55 | $46.50 |
| SMS – bookings (20 × $0.062) | $1.24 | $37.20 |
| SMS – queue (30 × $0.031) | $0.93 | $27.90 |
| Supabase / Vercel | $0 | ~$0 (free tier) |
| **Total** | **$45.02** | **$1,350.60** |

### Scenario: 100 orders/day (scaling)

| Line Item | Daily | Monthly (30d) |
|-----------|-------|---------------|
| Stripe fees (100 × $0.826) | $82.60 | $2,478 |
| SMS – orders (100 × $0.031) | $3.10 | $93 |
| SMS – bookings (40 × $0.062) | $2.48 | $74.40 |
| SMS – queue (50 × $0.031) | $1.55 | $46.50 |
| Supabase Pro (if needed) | ~$1.27/day | ~$38 |
| Vercel Pro (if needed) | ~$0.97/day | ~$29 |
| **Total** | **~$91.97** | **~$2,759** |

---

## 7. Revenue Context

At $28 avg order × 50 orders/day:
- **Gross daily revenue:** $1,400
- **Daily op cost:** $45.02
- **Op cost as % of gross:** **3.2%**

At $28 avg order × 100 orders/day:
- **Gross daily revenue:** $2,800
- **Daily op cost:** $91.97
- **Op cost as % of gross:** **3.3%**

*Stripe alone accounts for ~91% of all operational tech costs.*

---

## 8. Key Observations for Analysis

1. **Stripe is the dominant cost** — 96%+ of tech spend per paid transaction
2. **SMS costs are negligible** — under $0.10 per customer across full lifecycle
3. **Infrastructure is near-zero** at current scale (Supabase + Vercel free tiers)
4. **Bookings cost nothing in fees** — pure SMS only (~$0.06 each)
5. **International cards nearly double the Stripe fee** — worth monitoring mix
6. **Scale doesn't significantly change the cost %** — Stripe scales linearly with revenue
7. **Biggest lever:** Stripe volume pricing kicks in above ~$500k/yr processed — contact Stripe for custom rate

---

## 9. Potential Cost Optimisations

| Option | Saving | Notes |
|--------|--------|-------|
| Stripe volume pricing | ~0.2–0.4% reduction | Available >$500k AUD/yr |
| Pass Stripe fee to customer (+1.7%) | 100% offset | Common in AU hospitality |
| ClickSend bulk credits | Minor | Slight per-SMS discount on prepaid bundles |
| Supabase free tier | $0 vs $38/mo | Sufficient for current scale |

---

*Data sources: stripe.com/au/pricing · clicksend.com/pricing · supabase.com/pricing · vercel.com/pricing*
*Codebase audit: mr-jacksons/src — March 2026*
