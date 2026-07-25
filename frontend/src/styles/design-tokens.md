# ERP Nexus Design Tokens & Visual Rationale

## Design Direction & Rationale
We are replacing the previous ad-hoc visual treatment (inconsistent badge colors, varied button styles, and scattered visual accents) with a cohesive, industrial-grade design system tailored for ERP Nexus. 
The updated visual identity features:
1. **Unified Color Hierarchy**: A disciplined slate & industrial blue core palette (`blue-600` primary accent, `slate-900`/`slate-950` dark backgrounds, `white`/`slate-50` light surfaces). Semantic status colors are strictly functional: Green (`green-500`/`green-600`) for verified/active/completed state, Amber (`amber-500`/`amber-600`) for pending/warning state, Red (`red-500`/`red-600`) for critical alerts/danger actions, and Indigo (`indigo-500`/`indigo-600`) for secondary informational tags.
2. **Precision Typography & Layout Structure**: Clean hierarchy with high contrast, tabular figure alignment for financial and quantity metrics, subtle border framing (`border-slate-200` in light mode, `border-slate-800` in dark mode), and uniform card radii (`rounded-2xl` for containers, `rounded-xl` for interactive elements).
3. **Restrained Instrument Aesthetics**: Replaced noisy multicolored icon circles with refined, monochromatic icon containers and crisp micro-interactions (`hover:border-slate-300 dark:hover:border-slate-700`, subtle focus rings `focus:ring-2 focus:ring-blue-500/20`).

---

## Token Reference Table

| Category | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| **Page Background** | `bg-slate-50` / `bg-white` | `bg-slate-950` / `bg-slate-900` | Application root and main canvas |
| **Card Surface** | `bg-white` | `bg-slate-900` | Section containers, stat cards, tables |
| **Subtle Surface** | `bg-slate-50` | `bg-slate-950/60` | Table headers, secondary cards, filter bars |
| **Borders** | `border-slate-200` / `border-slate-100` | `border-slate-800` / `border-slate-800/80` | Card borders, dividers, inputs |
| **Primary Accent** | `bg-blue-600` (`hover:bg-blue-500`) | `bg-blue-600` (`hover:bg-blue-500`) | Primary action buttons, active tab indicators |
| **Text Primary** | `text-slate-900` | `text-white` | Page titles, table headers, key values |
| **Text Secondary** | `text-slate-500` / `text-slate-600` | `text-slate-400` / `text-slate-300` | Subtitles, metadata labels, column headers |
| **Status Good** | `bg-green-500/10 text-green-700 border-green-200` | `bg-green-950/30 text-green-400 border-green-800` | Active, Approved, Paid, Verified status |
| **Status Warning** | `bg-amber-500/10 text-amber-700 border-amber-200` | `bg-amber-950/30 text-amber-400 border-amber-800` | Pending, Low Stock, Inspection Required |
| **Status Critical** | `bg-red-500/10 text-red-700 border-red-200` | `bg-red-950/30 text-red-400 border-red-800` | Rejected, Out of Stock, Overdue, Cancelled |
