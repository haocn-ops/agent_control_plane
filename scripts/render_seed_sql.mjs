import { renderDefaultSeedSql } from "./lib/seed_bundle_data.mjs";

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

const tenantId = readArg("--tenant-id");
if (!tenantId) {
  console.error("Missing required argument: --tenant-id");
  process.exit(1);
}

const createdAt = readArg("--created-at") ?? new Date().toISOString();
process.stdout.write(renderDefaultSeedSql(tenantId, createdAt));
