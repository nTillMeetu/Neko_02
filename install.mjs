#!/usr/bin/env node
/**
 * Install / uninstall this panel in a DeepSeek Harness desktop profile.
 *
 *   node install.mjs                 # install into ~/.dsh/profiles/desktop
 *   node install.mjs --profile <dir> # ... another profile
 *   node install.mjs --dry-run       # show what would change
 *   node install.mjs --uninstall     # remove it again
 *
 * It edits the profile's package.json (a `link:` dependency plus one entry in
 * `dsh.profile.bundles`), then runs the profile's own pnpm install. Files are
 * backed up before they change, and the script is safe to run twice.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "dsh-usage-overview";
const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);

const help = argv.includes("--help") || argv.includes("-h");
const uninstall = argv.includes("--uninstall");
const dryRun = argv.includes("--dry-run");
const profileIndex = argv.indexOf("--profile");
const profileArg = profileIndex >= 0 ? argv[profileIndex + 1] : "";

function info(message) { console.log(`• ${message}`); }
function warn(message) { console.log(`! ${message}`); }
function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (help) {
  console.log(`Usage: node install.mjs [--profile <dir>] [--uninstall] [--dry-run]

  --profile <dir>   DeepSeek Harness profile directory
                    (default: ${join(homedir(), ".dsh", "profiles", "desktop")})
  --uninstall       Remove the panel from the profile
  --dry-run         Print the planned changes, change nothing
  DSH_PNPM          Optional path to a pnpm.cjs used to install`);
  process.exit(0);
}
if (profileIndex >= 0 && (profileArg === "" || profileArg.startsWith("--"))) {
  fail("--profile needs a directory");
}

function expandHome(value) {
  if (!value.startsWith("~")) return value;
  return join(homedir(), value.slice(1));
}

const profileDir = resolve(expandHome(profileArg || join(homedir(), ".dsh", "profiles", "desktop")));
const packageFile = join(profileDir, "package.json");
const lockFile = join(profileDir, "pnpm-lock.yaml");

if (!existsSync(packageFile)) {
  fail(`Profile not found: ${packageFile}
  Point --profile at your DSH desktop profile (usually %USERPROFILE%\\.dsh\\profiles\\desktop).`);
}

let pkg;
try {
  pkg = JSON.parse(readFileSync(packageFile, "utf8"));
} catch (error) {
  fail(`package.json is not valid JSON: ${error.message}`);
}

if (pkg.dsh?.profile === undefined) {
  warn("This package.json has no dsh.profile section — it may not be a DSH profile. Continuing.");
}

pkg.dependencies = pkg.dependencies ?? {};
pkg.dsh = pkg.dsh ?? {};
pkg.dsh.profile = pkg.dsh.profile ?? {};
const bundles = Array.isArray(pkg.dsh.profile.bundles) ? pkg.dsh.profile.bundles : [];

const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
function backup(file) {
  if (!existsSync(file)) return;
  const target = `${file}.bak-${stamp}-usage-overview`;
  copyFileSync(file, target);
  info(`backup ${target}`);
}
function writePackage() {
  writeFileSync(packageFile, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

if (uninstall) {
  let changed = false;
  if (pkg.dependencies[PACKAGE_NAME] !== undefined) {
    delete pkg.dependencies[PACKAGE_NAME];
    changed = true;
  }
  const nextBundles = bundles.filter((name) => name !== PACKAGE_NAME);
  if (nextBundles.length !== bundles.length) {
    pkg.dsh.profile.bundles = nextBundles;
    changed = true;
  }
  if (!changed) {
    info("Nothing to uninstall.");
    process.exit(0);
  }
  if (dryRun) {
    info(`Would remove ${PACKAGE_NAME} from ${packageFile}`);
    process.exit(0);
  }
  backup(packageFile);
  writePackage();
  info("Removed the panel from the profile.");
} else {
  const linkTarget = REPO_ROOT.replace(/\\/g, "/");
  const dependency = `link:${linkTarget}`;
  const installed = pkg.dependencies[PACKAGE_NAME] === dependency && bundles.includes(PACKAGE_NAME);
  if (installed) {
    info(`Already installed (${dependency}).`);
  } else {
    pkg.dependencies[PACKAGE_NAME] = dependency;
    if (!bundles.includes(PACKAGE_NAME)) bundles.push(PACKAGE_NAME);
    pkg.dsh.profile.bundles = bundles;
    if (dryRun) {
      info(`Would add "${PACKAGE_NAME}": "${dependency}"`);
      info(`Would add "${PACKAGE_NAME}" to dsh.profile.bundles`);
      process.exit(0);
    }
    backup(packageFile);
    backup(lockFile);
    writePackage();
    info(`Linked ${PACKAGE_NAME} -> ${linkTarget}`);
  }
}

function findPnpm() {
  if (process.env.DSH_PNPM && existsSync(process.env.DSH_PNPM)) {
    return { command: process.execPath, prefix: [process.env.DSH_PNPM], shell: false, label: "DSH_PNPM" };
  }
  const runtimes = join(homedir(), ".dsh", "dsh-runtimes");
  if (existsSync(runtimes)) {
    for (const name of readdirSync(runtimes)) {
      const candidate = join(runtimes, name, "dependencies", "pnpm", "bin", "pnpm.cjs");
      if (existsSync(candidate)) {
        return { command: process.execPath, prefix: [candidate], shell: false, label: "the DSH runtime pnpm" };
      }
    }
  }
  const shell = process.platform === "win32";
  if (spawnSync("pnpm", ["--version"], { stdio: "ignore", shell }).status === 0) {
    return { command: "pnpm", prefix: [], shell, label: "pnpm" };
  }
  if (spawnSync("npx", ["--version"], { stdio: "ignore", shell }).status === 0) {
    return { command: "npx", prefix: ["--yes", "pnpm@11"], shell, label: "npx pnpm@11" };
  }
  return null;
}

const pnpm = findPnpm();
if (pnpm === null) {
  warn("Could not find pnpm. Finish the install from the profile directory:");
  console.log(`\n  cd "${profileDir}"\n  pnpm install\n  # then restart DeepSeek Harness\n`);
  process.exit(0);
}

info(`Running pnpm install with ${pnpm.label} ...`);
const result = spawnSync(
  pnpm.command,
  [...pnpm.prefix, "install", "--reporter", "append-only"],
  { cwd: profileDir, stdio: "inherit", shell: pnpm.shell, env: process.env }
);
if (result.status !== 0) {
  warn("pnpm install failed. Run it manually:");
  console.log(`\n  cd "${profileDir}"\n  pnpm install\n`);
  process.exit(result.status ?? 1);
}

console.log("");
info("Done. Restart DeepSeek Harness, then open: 设置 → 账号与余额 → 查询用量");
info("Uninstall later with: node install.mjs --uninstall");
