# Salesforce Playwright Test Automation

Playwright + TypeScript automation for the Top Employers Institute Salesforce QA Automation Engineer assessment.

## Stack

- Playwright Test
- TypeScript
- Salesforce CLI
- Salesforce REST API
- Page Object Model
- Playwright fixtures
- Salesforce metadata as code

## Architecture

Salesforce CLI authentication
→ Playwright setup project
→ programmatic Salesforce session
→ reusable storageState
→ UI + Salesforce API tests

A worker-scoped Salesforce API client is shared within each Playwright worker. Test-created Salesforce records are tracked by a fixture and cleaned during teardown.

## Scenarios

**3.1 Lead → NEW Account**

Creates a unique Lead through the API, converts it through the Salesforce UI, then verifies the converted Lead and generated Account, Contact and Opportunity through the API.

**3.2 Lead → EXISTING Account**

Pre-creates a unique Account through the API, converts a Lead through the UI into that Account, and verifies that no duplicate Account is created.

**3.3 Opportunity**

Creates an Opportunity from an Account through the UI, advances it through multiple Salesforce stages, and verifies the final Amount, Stage and Close Date through the API.

**3.4 Expected failure**

A Salesforce validation rule blocks creation of an Opportunity whose name begins with `PW-FAIL-`. The test verifies the visible Salesforce validation error and proves through the API that no Opportunity was persisted.

## Local execution

Prerequisites:

- Node.js 24+
- Salesforce CLI
- Authenticated Salesforce org

Set the target org in Windows CMD:

```text
set SF_TARGET_ORG=qa-salesforce-dev