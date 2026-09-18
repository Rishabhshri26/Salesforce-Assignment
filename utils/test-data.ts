import { randomUUID } from 'node:crypto';

export function uniqueValue(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function uniqueEmail(prefix = 'playwright'): string {
  return `${uniqueValue(prefix)}@example.test`;
}

export function createLeadTestData() {
  const runId = randomUUID();

  return {
    firstName: 'PW',
    lastName: `Lead-${runId}`,
    company: `PW-Company-${runId}`,
    email: `pw-lead-${runId}@example.test`,
  };
}