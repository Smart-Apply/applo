---
name: eight-golden-rules
description: Shneiderman's Eight Golden Rules of Interface Design — a checklist for designing, building, critiquing, or auditing any user interface. Use when creating or reviewing UI/UX (screens, forms, flows, navigation, feedback, error handling, undo), when a design decision needs a usability rationale, or when asked about HCI/human-computer-interaction principles, interface consistency, informative feedback, error prevention, reversibility, user control, memory load, or "the 8 golden rules".
---

# Eight Golden Rules of Interface Design

Ben Shneiderman & Catherine Plaisant's Eight Golden Rules (from *Designing the User
Interface*) are a compact, battle-tested framework for HCI. Use them two ways:

- **When building UI** — treat each rule as a design constraint to satisfy.
- **When reviewing UI** — walk the eight rules as an audit checklist and report which
  are violated, where, and how to fix them (like a lightweight heuristic evaluation).

They complement, not replace, Nielsen's 10 heuristics and Norman's principles — reach for
those when the task calls for a broader usability audit; use these eight when you want a
fast, memorable spine for interaction decisions.

## The rules

### 1. Strive for consistency
Same actions in same situations; consistent terminology, layout, color, and interaction
patterns across the whole product.
- **Apply:** reuse shared components/tokens instead of one-off styling; keep verbs and
  labels identical for identical actions ("Delete" everywhere, not "Delete"/"Remove"/"Trash").
- **Check:** does this new screen introduce a pattern that already exists elsewhere in a
  different form?

### 2. Seek universal usability
Serve the full range of users — novices to experts, and diverse abilities. Offer
onboarding/explanations for novices **and** shortcuts/accelerators for experts.
- **Apply:** progressive disclosure, sensible defaults, keyboard shortcuts, and
  accessibility (semantic HTML, ARIA, contrast, focus order, reduced-motion).
- **Check:** can a first-timer complete the core task, and can a power user do it fast?

### 3. Offer informative feedback
Every action gets a visible, proportionate system response — modest for frequent minor
actions, more substantial for major ones.
- **Apply:** loading/pending states, success/error toasts, inline validation, progress
  indicators; never leave a click looking like nothing happened.
- **Check:** after each user action, is the system's response obvious within ~100ms?

### 4. Design dialogs to yield closure
Group actions into sequences with a clear beginning, middle, and end; give a confirmation
of completion so users know they can move on.
- **Apply:** multi-step flows with a final "done" state/summary (e.g. a checkout or wizard
  ending in an explicit confirmation).
- **Check:** does the user get a definitive "this is finished" signal at the end of a flow?

### 5. Prevent errors
Design so serious errors are hard to make; when they occur, offer simple, specific,
constructive recovery.
- **Apply:** constrain inputs (pickers over free text), disable invalid actions, confirm
  destructive ones, validate before submit, and write error messages that say what to do next.
- **Check:** what's the worst mistake this UI lets a user make by accident — and is it blocked?

### 6. Permit easy reversal of actions
Make actions reversible (undo). This relieves anxiety and encourages exploration.
- **Apply:** Undo/Cancel, soft-delete with restore, "back" that truly restores prior state,
  editable submissions.
- **Check:** can the user take back the last action without penalty?

### 7. Keep users in control (internal locus of control)
Users should feel they initiate and command the system, not respond to it. Avoid surprising
UI, forced flows, and unexplained changes.
- **Apply:** no unexpected navigation/auto-actions, no hijacked scroll/focus, clear ways to
  exit any state; the user drives.
- **Check:** does anything happen that the user didn't ask for or can't stop?

### 8. Reduce short-term memory load
Don't force users to remember information across screens; recognition over recall.
(Rule of thumb: keep concurrent demands small — the classic "7 ± 2".)
- **Apply:** show what's needed in context, carry data forward, use pickers/autocomplete,
  keep instructions on-screen, summarize prior steps.
- **Check:** is the user asked to remember anything the interface could simply show them?

## Quick review checklist

When auditing a screen or flow, score each and cite concrete spots:

1. Consistency — patterns/terms match the rest of the app?
2. Universal usability — novice path + expert shortcuts + a11y?
3. Feedback — visible response to every action?
4. Closure — clear "done" at the end of sequences?
5. Error prevention — hard to make serious mistakes; helpful recovery?
6. Reversibility — undo/cancel/back available?
7. User control — no surprises; user drives?
8. Memory load — recognition over recall; nothing to memorize?

Report as: rule → where it's violated → concrete fix.

## Source
Shneiderman, Plaisant, Cohen, Jacobs, Elmqvist — *Designing the User Interface: Strategies
for Effective Human-Computer Interaction*. The eight rules are a widely taught HCI framework.
