# 04 — Next takes you to what's missing

**What to build:** in the order builder, pressing Next (or Start building on the consent screen) with something missing scrolls to the first missing field, outlines it in red, shows its message beside it and focuses it. The top notice stays. Fixing it clears the mark.

**Blocked by:** None — can start immediately.

**Autonomy:** afk

- [x] Draft problems carry a field key for consent, squad, edition, games, world, vehicles, phone, story and keepsakes (tests)
- [x] Every step view tags the matching control
- [x] Consent screen: unticked photo box and unanswered 18+ question are each jumped to
- [x] Fallback when a field can't be found: panel top + notice (no crash)
- [x] Verified live on at least consent, squad and one section step
