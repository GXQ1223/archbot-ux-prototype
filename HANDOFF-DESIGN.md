# CoS → Design handoff (prototype notes)

**File:** `cos-handoff.html` · Title: *Archbot — CoS → Design handoff*  
**Audience:** Miles Guo — walk the clickable flow before implementation.

## Flow

1. **CoS home is chat-primary.** Compact pulse strip (Lobby hero + Kitchen secondary) sits above chat; Continue still works but does not replace conversation.
2. User asks to **review Riverside Lobby SD** (chip or type) → CoS drafts a **confirmable handoff packet card** (not auto-open).
3. User may **Edit goal**, **Cancel**, or **Open in Design**.
4. Design opens with sidebar highlight, Architecture phase rail (**SD** active), **handoff banner** (goal + pack/phase + “from Chief of Staff”, Expand → full packet), and a first-move proposal (advisory review / Redline).
5. **Back to CoS** keeps story; CoS shows system note *Routed to Design — Riverside Lobby*.

## Packet fields shown

| Field | Example / notes |
|--------|------------------|
| `project` | Riverside Lobby |
| `profession_pack` | `architecture` |
| `phase` | `SD` |
| `goal` | Editable stub — review egress, axis, materials before DD |
| `constraints_summary` | Stub from Project Brain |
| `open_run_ids` | `[]` or one id if a run is active |
| `source` | `cos_route` |
| `decision_flags` | Optional, e.g. `needs_pm_signoff_on_egress` |

CoS never generates images; Design owns visual craft + canvas themes (Night / Trace / Redline / Blueprint).

## Open product questions

1. **Confirm vs auto-open** — Does the packet card feel right, or should Continue / strong intents jump Design immediately?
2. **Field density** — Too many fields on the card? Hide `decision_flags` / `open_run_ids` until Expand?
3. **Chat-primary + strip vs pulse-hero** — Is the strip enough glance, or do we miss the old large hero?
4. **Edit surface** — Inline “Edit goal” only, or full packet editor before Open?
5. **Return path** — Is a one-line system note enough context when coming Back to CoS?

*Prototype only — nothing persisted.*
