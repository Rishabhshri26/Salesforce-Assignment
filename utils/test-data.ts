import { randomUUID } from 'node:crypto';

export function uniqueValue(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function uniqueEmail(prefix = 'playwright'): string {
  return `${uniqueValue(prefix)}@example.test`;
}