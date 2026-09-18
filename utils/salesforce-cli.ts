import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface SalesforceCliJson<T> {
  status: number;
  result?: T;
  warnings?: string[];
  message?: string;
}

interface OrgDisplayResult {
  instanceUrl?: string;
  username?: string;
  alias?: string;
}

interface AccessTokenResult {
  accessToken?: string;
}

export interface SalesforceOrgAuth {
  alias: string;
  username: string;
  instanceUrl: string;
  accessToken: string;
}

export interface SalesforceOrgDetails {
  alias: string;
  username: string;
  instanceUrl: string;
}

function getTargetOrg(): string {
  const targetOrg = process.env.SF_TARGET_ORG;

  if (!targetOrg) {
    throw new Error(
      'SF_TARGET_ORG is not set. Example: set SF_TARGET_ORG=qa-salesforce-dev'
    );
  }

  /*
   * SF_TARGET_ORG becomes part of a shell command on Windows.
   * Restrict it to a Salesforce CLI alias format.
   */
  if (!/^[a-zA-Z0-9._-]+$/.test(targetOrg)) {
    throw new Error(
      `Invalid SF_TARGET_ORG value: "${targetOrg}".`
    );
  }

  return targetOrg;
}

async function runSalesforceCli(
  args: string[]
): Promise<string> {
  const command = [
    'npx',
    '--no-install',
    'sf',
    ...args.map((arg) => `"${arg.replace(/"/g, '\\"')}"`),
  ].join(' ');

  const { stdout } = await execAsync(command, {
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });

  return stdout;
}

function parseCliJson<T>(
  stdout: string,
  commandDescription: string
): SalesforceCliJson<T> {
  const normalized = stdout
    .replace(/^\uFEFF/, '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .trim();

  const jsonStart = normalized.indexOf('{');
  const jsonEnd = normalized.lastIndexOf('}');

  if (
    jsonStart === -1 ||
    jsonEnd === -1 ||
    jsonEnd < jsonStart
  ) {
    throw new Error(
      `Salesforce CLI did not return JSON for ${commandDescription}.`
    );
  }

  const jsonText = normalized.slice(
    jsonStart,
    jsonEnd + 1
  );

  try {
    return JSON.parse(jsonText) as SalesforceCliJson<T>;
  } catch {
    throw new Error(
      `Salesforce CLI returned invalid JSON for ${commandDescription}.`
    );
  }
}

export async function getSalesforceOrgDetails(): Promise<SalesforceOrgDetails> {
  const targetOrg = getTargetOrg();

  const stdout = await runSalesforceCli([
    'org',
    'display',
    '--target-org',
    targetOrg,
    '--json',
  ]);

  const response =
    parseCliJson<OrgDisplayResult>(
      stdout,
      'sf org display'
    );

  if (
    response.status !== 0 ||
    !response.result?.instanceUrl
  ) {
    throw new Error(
      `Unable to retrieve Salesforce org information for "${targetOrg}".`
    );
  }

  return {
    alias: response.result.alias ?? targetOrg,
    username: response.result.username ?? '',
    instanceUrl: response.result.instanceUrl,
  };
}

export async function getSalesforceOrgAuth(): Promise<SalesforceOrgAuth> {
  const targetOrg = getTargetOrg();

  const orgDetails = await getSalesforceOrgDetails();

  const tokenStdout = await runSalesforceCli([
    'org',
    'auth',
    'show-access-token',
    '--target-org',
    targetOrg,
    '--json',
  ]);

  const tokenResponse =
    parseCliJson<AccessTokenResult>(
      tokenStdout,
      'sf org auth show-access-token'
    );

  if (
    tokenResponse.status !== 0 ||
    !tokenResponse.result?.accessToken
  ) {
    throw new Error(
      `Unable to retrieve Salesforce access token for "${targetOrg}".`
    );
  }

  return {
    alias: orgDetails.alias,
    username: orgDetails.username,
    instanceUrl: orgDetails.instanceUrl,
    accessToken: tokenResponse.result.accessToken,
  };
}