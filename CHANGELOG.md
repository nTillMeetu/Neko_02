# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.1] - 2026-11-01

### Fixed

- Concurrent summary requests could add the same 31-day history windows more
  than once, inflating the month table and lifetime totals (2x-3x the real
  values). History accumulation is now single-flight, so overlapping requests
  share one backfill.
- Added `test/aggregation-race.test.mjs`: a mocked Platform API regression test
  that fires three concurrent summaries and checks the totals exactly once.

## [1.0.0] - 2026-11-01

### Added

- In-app usage panel for DeepSeek Harness that replaces the embedded
  `platform.deepseek.com/usage` page behind **设置 → 账号与余额 → 查询用量**.
- Account strip: balance, lifetime spend, lifetime tokens, lifetime requests,
  with a quiet sub-line for scope and averages.
- Daily view: one-month calendar heat map where every day shows its spend **and**
  tokens; intensity is relative to the most expensive day; today gets a ring;
  click a day for a detail popover (spend, tokens, API requests).
- Month picker (year navigation + 12-month grid) backed by a Host `?month=YYYY-MM`
  query, so any month from the account's first key to today can be viewed.
- Monthly grid: one cell per month with spend and tokens, coloured by spend;
  clicking a month cell jumps the calendar to that month.
- API-key filter and CSV export for the selected month.
- Host route `/usage-overview/summary`: aggregated usage from the Platform API,
  using the account grant already held by DSH. The token never leaves the Host.
- Cross-platform installer (`install.mjs`) with `--profile`, `--dry-run` and
  `--uninstall`; it links the package into a DSH desktop profile and runs the
  profile's own pnpm install.
- Dark and light screenshots (synthetic data) in `docs/`.
- GitHub Actions syntax check for the plugin sources and installer.
