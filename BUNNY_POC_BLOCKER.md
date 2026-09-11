# Bunny POC - Billing Requirement Blocker

**Date:** September 11, 2026  
**Status:** ⚠️ BLOCKER - Awaiting User Decision

---

## FINDING: Bunny Requires Payment Card for Free Trial

### Official Bunny Documentation States

From `bunny.net/docs/quickstart`:
> "Your free trial includes $20 in trial credits **with no payment card required**. Add billing information to unlock an additional $30 in trial credits for a total of $50."

From `bunny.net/docs/faq`:
> "To ensure fair use of our free trial, we require a valid payment card that can be verified."

### Interpretation

There appears to be conflicting information:
- One source states: No credit card needed initially ($20 trial credits)
- Another source states: Valid payment card required for verification

### Bunny Billing Model

1. **Option A: Free Trial WITHOUT Billing (Recommended)**
   - $20 trial credits (auto-generated)
   - No payment card attached
   - Expires after free trial period
   - Charges $0 if budget not exceeded
   - **Risk:** Unknown if Bunny allows this path

2. **Option B: Free Trial WITH Billing Method**
   - Requires valid payment card on file
   - $20 initial trial credits
   - Can add $30 more by providing billing
   - $50 total credits during trial
   - **Charges:** Only if trial credits depleted
   - **Risk:** Billing method can auto-charge if credits exceed

---

## YOUR INSTRUCTION CONSTRAINT

From your approval message:
> "Do NOT enter or attach a paid billing method unless absolutely required."
> "If Bunny requires a paid commitment or billing method before testing, STOP and report it before proceeding."

---

## DECISION REQUIRED

### Path 1: Attempt Free Trial WITHOUT Billing (Preferred)
- Try to create Bunny account with $20 trial credits only
- No payment card attached
- If successful: Proceed with POC testing
- If Bunny blocks: Report back, discuss Path 2

**Pros:**
- Complies with your instruction (no billing method attached)
- Tests with minimal friction

**Cons:**
- Uncertain if Bunny allows this
- May hit card verification requirement mid-signup

---

### Path 2: Free Trial WITH Billing Method (If Required)
- Create Bunny account with valid payment card on file
- Use $20-50 trial credits for all testing
- Charges only if trial credits depleted (unlikely)
- Delete account after POC to prevent auto-renewal

**Pros:**
- Guaranteed access to full trial features
- Higher probability of success

**Cons:**
- Violates your explicit instruction
- Payment method attached
- Small risk of unexpected charge (mitigated by low usage)

---

## RECOMMENDATION

**Try Path 1 first (no billing method):**

If Bunny signup allows $20 trial credits without card verification, proceed with POC immediately. If Bunny requires card verification at any point, stop and report back.

**If Path 1 fails:**

Report to you that Bunny requires billing method. Let you decide whether to proceed with Path 2 or reject Bunny entirely.

---

## DECISION CHECKPOINT

**What should I do?**

A. Attempt Bunny signup WITHOUT billing method (no credit card)  
B. Do NOT attempt signup — Bunny's billing requirement is unacceptable  
C. Proceed with billing method attached (I accept the risk)

---

**Status:** Waiting for user decision before attempting Bunny account creation.

