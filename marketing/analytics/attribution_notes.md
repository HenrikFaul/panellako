# Attribution Notes

## Purpose
Practical attribution guidance for a founder-stage B2B SaaS without a dedicated marketing analytics team. Focuses on what actually helps decision-making at this stage, not what would be ideal.

---

## Why perfect attribution doesn't exist at this stage

Multi-touch attribution requires: sufficient volume, proper UTM discipline across all channels, a CRM integrated with ad platforms, and consistent tagging over months. At the early stage, none of these conditions are reliably met.

**What to do instead:** Use first-touch attribution (what was the first thing that brought this person to us?) combined with self-reported attribution (how did YOU hear about us?). Together these give 70–80% directional accuracy for channel investment decisions.

---

## First-touch UTM convention

Always tag links with UTMs. Use this convention:

```
utm_source = channel (linkedin / google / email / referral)
utm_medium = format (organic / paid / newsletter / post)
utm_campaign = campaign name (slug, no spaces, e.g. coverage-rules-lp)
utm_content = creative variant (optional, e.g. founder-post-v1 / headline-a)
```

**Rule:** Every link from a controlled source (post, ad, email, bio) must have UTMs. Untagged traffic becomes "direct" — which is useless for attribution.

---

## Self-reported attribution ("How did you hear about us?")

Add this field to the trial signup form. Keep it simple:

- LinkedIn (organic content or ads)
- Google search
- Referred by someone
- Blog or article
- Other (free text)

Review this data monthly. It's qualitative and imperfect, but it tells you which channels buyers remember — which often correlates with brand building even if UTM data shows something different.

---

## When to invest in proper attribution tooling

Invest in a proper attribution system (e.g. HubSpot with ad integrations, or dedicated analytics like Dreamdata) when:
- Monthly trial signups exceed 100
- You are running > 2 paid channels simultaneously
- CAC calculation requires multi-channel precision
- You need to defend channel budgets to investors

Until then, manual UTM tracking + self-reported + spreadsheet is sufficient.

---

## Common attribution mistakes to avoid

1. **Attributing everything to the last click** — undervalues awareness content and LinkedIn
2. **Treating "direct" traffic as a channel** — it's usually untagged email or social
3. **Measuring ads in isolation from organic** — paid and organic often reinforce each other; measuring separately misleads
4. **Over-indexing on in-platform metrics** — LinkedIn "impressions" don't equal website intent; always measure downstream
5. **Ignoring dark social** — many B2B referrals happen through private channels (DMs, Slack, email forwarding) that never appear in analytics
