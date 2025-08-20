/* ==================== CostElementRow — Material Sales (refined) ==================== */
/* Visual parity with Batch Production "Additional Cost Elements" table.
   Safe for interactivity: no pointer-events blocking, no overlay on checkbox. */

/* ---- Theme tokens (align with your app palette) ---- */
:root {
  --bp-accent: #2f855a;          /* green accent used in Batch Production */
  --bp-accent-ink: #276749;
  --bp-accent-soft: rgba(47,133,90,.08);

  --bp-blue: #2196F3;
  --bp-warn: #ffc107;

  --g-50:  #fafafa;
  --g-75:  #f8fafc;
  --g-100: #f7fafc;
  --g-200: #edf2f7;
  --g-300: #e2e8f0;
  --g-400: #cbd5e0;
  --g-500: #a0aec0;
  --g-600: #718096;
  --ink:   #2d3748;

  --radius: 10px;
}

/* ---- Table container (the whole Additional Costs block) ---- */
.cost-elements-table {
  background: #fff;
  border: 1px solid var(--g-200);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  margin: 12px 0 18px;
}

/* ---- Optional table header row (use with your own header nodes) ---- */
.cost-table-header {
  display: grid;
  grid-template-columns: 44px 1fr 140px 140px 120px 140px;
  gap: 0;
  background: var(--g-100);
  border-bottom: 2px solid var(--g-300);
  color: var(--ink);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
}
.cost-table-header > * {
  padding: 10px 12px;
  text-align: right;
}
.cost-table-header > *:first-child,
.cost-table-header > *:nth-child(2) { text-align: left; }

/* ---- Row shell ---- */
.cost-element-row {
  display: grid;
  grid-template-rows: auto 1fr; /* header + body */
  border-bottom: 1px solid var(--g-200);
  background: #fff;
  transition: background-color .15s ease;
}
.cost-element-row:hover { background: var(--g-50); }

/* Gentle, non-blocking disabled styling */
.cost-element-row.disabled {
  background: #fff;            /* keep white so numbers stay legible */
  opacity: .85;                /* light hint only */
  /* NO pointer-events none; keep inputs editable if JS allows */
}

/* ---- Header (checkbox + title area) ---- */
.cost-element-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px;
  min-height: 44px;
}

/* Checkbox group — ensure it does NOT overlay the row */
.element-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 0;                  /* never sits above other fields */
}

.cost-element-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--g-400);
  border-radius: 4px;
  background: #fff;
  display: inline-block;
  vertical-align: middle;
  cursor: pointer;
  transition: border-color .15s, background-color .15s, box-shadow .15s;
}
.cost-element-checkbox:focus { outline: none; box-shadow: 0 0 0 3px var(--bp-accent-soft); }
.cost-element-checkbox:checked {
  background: var(--bp-accent);
  border-color: var(--bp-accent);
}
.cost-element-checkbox:checked::after {
  content: "";
  position: relative;
  display: block;
  width: 4px; height: 8px;
  border: solid #fff; border-width: 0 2px 2px 0;
  transform: translate(5px, 2px) rotate(45deg);
}

/* Icon + name */
.element-icon { font-size: 16px; line-height: 1; }
.element-name  { font-weight: 600; color: var(--ink); }
.unit-type     { color: var(--g-600); font-size: 12px; margin-left: 6px; }

/* Optional help badge */
.help-text {
  margin-left: auto;
  color: var(--g-600);
  font-size: 13px;
  cursor: help;
}

/* ---- Body (values grid) ---- */
.cost-element-body {
  padding: 10px 12px 14px 44px;    /* indent to visually align with checkbox column */
  background: #fff;
}
.cost-element-row:hover .cost-element-body { background: var(--g-75); }

.cost-element-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;   /* Master | Override | Qty | Total */
  gap: 14px;
}

.grid-item {
  background: #fff;
  border: 1px solid var(--g-200);
  border-radius: 8px;
  padding: 10px 12px;
  display: grid;
  grid-template-rows: auto 1fr;
}
.grid-item.highlight {
  background: var(--bp-accent-soft);
  border-color: var(--bp-accent);
}

/* Field label/value */
.field-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .3px;
  color: var(--g-600);
  text-transform: uppercase;
  margin-bottom: 6px;
}
.field-value { display: flex; align-items: center; justify-content: space-between; }

/* Numbers & units */
.master-rate-display {
  width: 100%;
  text-align: right;
  color: var(--g-600);
  font-size: 14px;
}
.quantity-display {
  width: 100%;
  text-align: right;
  color: var(--ink);
  font-size: 14px;
}
.total-cost-display {
  width: 100%;
  text-align: right;
  font-weight: 700;
  color: var(--bp-accent-ink);
  font-size: 16px;
}

/* Inputs */
.override-input {
  width: 100%;
  text-align: right;
  font-size: 14px;
  padding: 8px 10px;
  border: 1px solid var(--g-300);
  border-radius: 8px;
  background: #fff;
  transition: border-color .15s, box-shadow .15s, background-color .15s;
}
.override-input:focus {
  outline: none;
  border-color: var(--bp-accent);
  box-shadow: 0 0 0 3px var(--bp-accent-soft);
}
.override-input:disabled {
  background: var(--g-100);
  color: var(--g-600);
}
.override-input.has-override {
  background: #fffbf0;
  border-color: var(--bp-warn);
}

/* Small warning chip for big deviations */
.override-warning { margin-left: 8px; font-size: 14px; }

/* Override info line */
.override-info {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--g-100);
  color: var(--g-600);
  font-size: 12px;
}

/* ---- Category colored left bars (optional) ---- */
.cost-element-row.category-labor       { border-left: 3px solid #28a745; }
.cost-element-row.category-utilities   { border-left: 3px solid var(--bp-blue); }
.cost-element-row.category-consumables { border-left: 3px solid var(--bp-warn); }
.cost-element-row.category-transport   { border-left: 3px solid #9c27b0; }
.cost-element-row.category-quality     { border-left: 3px solid #00bcd4; }
.cost-element-row.category-maintenance { border-left: 3px solid #dc3545; }

/* ---- Section header (if you group rows) ---- */
.cost-section-header {
  background: var(--g-100);
  padding: 10px 14px;
  font-weight: 700;
  color: var(--ink);
  border-left: 4px solid var(--bp-accent);
  text-transform: uppercase;
  letter-spacing: .4px;
}

/* ---- Responsive ---- */
@media (max-width: 992px) {
  .cost-table-header {
    display: none;
  }
  .cost-element-body { padding-left: 12px; }
  .cost-element-grid {
    grid-template-columns: 1fr 1fr;   /* stack into 2 columns on tablets */
  }
}
@media (max-width: 640px) {
  .cost-element-header { padding: 10px 10px; }
  .cost-element-grid   { grid-template-columns: 1fr; }  /* single column on phones */
  .grid-item           { padding: 8px 10px; }
  .total-cost-display  { font-size: 15px; }
}
