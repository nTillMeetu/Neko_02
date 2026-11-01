# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.x | yes |

## Reporting a vulnerability

Please **do not open a public issue for a vulnerability**. Use GitHub's
private vulnerability reporting on this repository
(**Security → Report a vulnerability**), or contact the maintainer through the
address on their GitHub profile. Include the affected version/commit, the DSH
version, and reproduction steps. Do not include account tokens or personal data
in the report.

## How credentials are handled

- The panel never asks for, stores or transmits an API key, account token or
  password.
- The Host half (`lib/index.js`) runs in the DeepSeek Harness process and uses
  the account grant that DSH already holds. It calls the Platform usage API and
  returns **aggregated numbers only** to the client.
- The Client half (`lib/client.js`) contains no network calls other than the
  local `/usage-overview/summary` route; it never contacts
  `platform.deepseek.com` directly.
- The plugin has no runtime dependencies of its own and no telemetry. React and
  the DSH UI primitives are provided by the host application.

## Personal data

Screenshots committed to this repository use synthetic data. If you open an
issue, redact balance amounts, account names, phone numbers, API key identifiers
and any other account information from screenshots and logs before posting.
