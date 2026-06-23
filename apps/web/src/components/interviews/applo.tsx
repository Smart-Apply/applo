/* ============================================================
   Applo — interview-coach alias for the canonical mascot.
   The full rig (state machine + SVG layers) now lives once in
   components/ui/applo-rig.tsx with its styles in globals.css, so
   the whole app shares ONE Applo design. This file keeps the
   `Applo` / `ApploState` names the interview call sites import.
   ============================================================ */

export { ApploRig as Applo } from '@/components/ui/applo-rig';
export type { ApploState } from '@/components/ui/applo-rig';
