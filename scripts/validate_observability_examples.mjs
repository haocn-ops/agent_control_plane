import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function printUsage() {
  console.log(`validate_observability_examples.mjs

Validates that observability example files stay internally consistent:
- docs/observability_integration_manifest.example.json
- docs/monitoring_dashboard_template.example.json
- docs/incident_response_checklist_zh.md

Usage:
  node scripts/validate_observability_examples.mjs
`);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : null;
}

function uniqueStrings(values) {
  const seen = new Set();
  const dups = new Set();
  for (const value of values) {
    if (seen.has(value)) dups.add(value);
    seen.add(value);
  }
  return { seen, dups: Array.from(dups) };
}

function ensureIncludesAll({ container, required }) {
  const set = new Set(container);
  return required.filter((item) => !set.has(item));
}

async function main() {
  if (process.argv.includes("--help")) {
    printUsage();
    return;
  }

  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const manifestPath = resolve(root, "docs/observability_integration_manifest.example.json");
  const dashboardPath = resolve(root, "docs/monitoring_dashboard_template.example.json");
  const incidentChecklistPath = resolve(root, "docs/incident_response_checklist_zh.md");

  const errors = [];
  const warn = [];

  const manifestText = await readFile(manifestPath, "utf8");
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch (error) {
    errors.push(`manifest: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    manifest = null;
  }

  const dashboardText = await readFile(dashboardPath, "utf8");
  let dashboard;
  try {
    dashboard = JSON.parse(dashboardText);
  } catch (error) {
    errors.push(`dashboard: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    dashboard = null;
  }

  const incidentText = await readFile(incidentChecklistPath, "utf8");

  if (manifest) {
    if (manifest.kind !== "observability_integration_manifest") {
      errors.push(`manifest.kind must be "observability_integration_manifest" (got ${JSON.stringify(manifest.kind)})`);
    }
    if (typeof manifest.schema_version !== "number") {
      errors.push(`manifest.schema_version must be a number (got ${JSON.stringify(manifest.schema_version)})`);
    }
    if (!isNonEmptyString(manifest.service)) {
      errors.push(`manifest.service must be a non-empty string`);
    }

    const checks = asArray(manifest.synthetic_checks);
    if (!checks) {
      errors.push(`manifest.synthetic_checks must be an array`);
    }

    const alertRules = asArray(manifest.alert_rules);
    if (!alertRules) {
      errors.push(`manifest.alert_rules must be an array`);
    }

    const alertRoutes = asArray(manifest.alert_routes);
    if (!alertRoutes) {
      errors.push(`manifest.alert_routes must be an array`);
    }

    const evidence = manifest.evidence_contract ?? null;
    if (!evidence || typeof evidence !== "object") {
      errors.push(`manifest.evidence_contract must be an object`);
    }

    const checkIds = checks ? checks.map((check) => check?.id).filter(isNonEmptyString) : [];
    const { dups: checkDups } = uniqueStrings(checkIds);
    if (checkDups.length) {
      errors.push(`manifest.synthetic_checks has duplicate ids: ${checkDups.join(", ")}`);
    }

    const ruleIds = alertRules ? alertRules.map((rule) => rule?.id).filter(isNonEmptyString) : [];
    const { dups: ruleDups } = uniqueStrings(ruleIds);
    if (ruleDups.length) {
      errors.push(`manifest.alert_rules has duplicate ids: ${ruleDups.join(", ")}`);
    }

    const routeIds = alertRoutes ? alertRoutes.map((route) => route?.id).filter(isNonEmptyString) : [];
    const { dups: routeDups } = uniqueStrings(routeIds);
    if (routeDups.length) {
      errors.push(`manifest.alert_routes has duplicate ids: ${routeDups.join(", ")}`);
    }

    // Validate refs from synthetic checks -> alert rules.
    if (checks) {
      for (const check of checks) {
        if (!check || typeof check !== "object") continue;
        if (!isNonEmptyString(check.id)) {
          errors.push(`manifest.synthetic_checks entry missing string id`);
          continue;
        }
        const refs = asArray(check.alert_rule_refs) ?? [];
        for (const ref of refs) {
          if (!ruleIds.includes(ref)) {
            errors.push(`synthetic_check ${check.id} references missing alert_rule_ref: ${ref}`);
          }
        }
      }
    }

    // Validate refs from alert rules -> routes, and runbook path existence when it looks local.
    if (alertRules) {
      for (const rule of alertRules) {
        if (!rule || typeof rule !== "object") continue;
        if (!isNonEmptyString(rule.id)) {
          errors.push(`alert_rule missing string id`);
          continue;
        }
        if (isNonEmptyString(rule.route_ref) && !routeIds.includes(rule.route_ref)) {
          errors.push(`alert_rule ${rule.id} references missing route_ref: ${rule.route_ref}`);
        }
        if (isNonEmptyString(rule.runbook_path) && rule.runbook_path.startsWith("docs/")) {
          const runbookFsPath = resolve(root, rule.runbook_path);
          if (!existsSync(runbookFsPath)) {
            errors.push(`alert_rule ${rule.id} runbook_path does not exist: ${rule.runbook_path}`);
          }
        }
      }
    }

    // Evidence contract checks.
    if (evidence && typeof evidence === "object") {
      const shared = asArray(evidence.shared_required_fields) ?? [];
      const synth = asArray(evidence.synthetic_summary_required_fields) ?? [];
      const verify = asArray(evidence.verify_summary_required_fields) ?? [];
      const incident = asArray(evidence.incident_required_fields) ?? [];

      if (!shared.length) errors.push(`evidence_contract.shared_required_fields must be a non-empty array`);
      if (!synth.length) errors.push(`evidence_contract.synthetic_summary_required_fields must be a non-empty array`);
      if (!verify.length) errors.push(`evidence_contract.verify_summary_required_fields must be a non-empty array`);
      if (!incident.length) errors.push(`evidence_contract.incident_required_fields must be a non-empty array`);

      // Ensure incident checklist contains the required evidence field names.
      for (const field of incident.filter(isNonEmptyString)) {
        if (!incidentText.includes("`" + field + "`")) {
          errors.push(`incident checklist missing required evidence field: ${field}`);
        }
      }

      // Ensure each synthetic check's evidence_summary.required_fields includes the shared + synth requirements,
      // and production_readonly_verify includes verify requirements.
      if (checks) {
        for (const check of checks) {
          if (!check || typeof check !== "object") continue;
          const evidenceSummary = check.evidence_summary ?? null;
          const requiredFields = asArray(evidenceSummary?.required_fields) ?? null;
          if (!requiredFields) {
            warn.push(`synthetic_check ${check.id} is missing evidence_summary.required_fields`);
            continue;
          }
          const baseMissing = ensureIncludesAll({ container: requiredFields, required: shared });
          if (baseMissing.length) {
            errors.push(`synthetic_check ${check.id} evidence_summary.required_fields missing shared: ${baseMissing.join(", ")}`);
          }
          const requiredCore =
            check.id === "production_readonly_verify" ? verify : synth;
          const coreMissing = ensureIncludesAll({ container: requiredFields, required: requiredCore });
          if (coreMissing.length) {
            errors.push(`synthetic_check ${check.id} evidence_summary.required_fields missing core: ${coreMissing.join(", ")}`);
          }
        }
      }
    }

    // Cross-check dashboard refs against manifest IDs.
    if (dashboard) {
      const sections = asArray(dashboard.sections) ?? [];
      for (const section of sections) {
        const panels = asArray(section?.panels) ?? [];
        for (const panel of panels) {
          if (!panel || typeof panel !== "object") continue;
          if (isNonEmptyString(panel.synthetic_check_ref) && !checkIds.includes(panel.synthetic_check_ref)) {
            errors.push(`dashboard panel ${panel.panel_id ?? panel.name ?? "<unknown>"} references missing synthetic_check_ref: ${panel.synthetic_check_ref}`);
          }
          if (isNonEmptyString(panel.alert_rule_ref) && !ruleIds.includes(panel.alert_rule_ref)) {
            errors.push(`dashboard panel ${panel.panel_id ?? panel.name ?? "<unknown>"} references missing alert_rule_ref: ${panel.alert_rule_ref}`);
          }
        }
      }
    }
  }

  if (dashboard) {
    if (!isNonEmptyString(dashboard.dashboard_id)) {
      errors.push(`dashboard.dashboard_id must be a non-empty string`);
    }
    if (!isNonEmptyString(dashboard.service)) {
      errors.push(`dashboard.service must be a non-empty string`);
    }
  }

  if (warn.length) {
    for (const message of warn) console.warn(`[warn] ${message}`);
  }
  if (errors.length) {
    for (const message of errors) console.error(`[error] ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log("Observability examples validation passed.");
}

await main();
