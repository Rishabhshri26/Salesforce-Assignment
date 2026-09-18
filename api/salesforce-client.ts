import {
  request,
  type APIRequestContext,
} from '@playwright/test';

import type { SalesforceOrgAuth } from '../utils/salesforce-cli';

interface SalesforceCreateResponse {
  id: string;
  success: boolean;
  errors: string[];
}

interface SalesforceQueryResponse<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

export class SalesforceClient {
  private readonly api: APIRequestContext;

  private constructor(
    private readonly auth: SalesforceOrgAuth,
    api: APIRequestContext
  ) {
    this.api = api;
  }

  static async create(auth: SalesforceOrgAuth): Promise<SalesforceClient> {
    const api = await request.newContext({
      baseURL: auth.instanceUrl,
      extraHTTPHeaders: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    return new SalesforceClient(auth, api);
  }

  private get apiBase(): string {
    return `/services/data/v${this.auth.apiVersion}`;
  }

  async query<T>(soql: string): Promise<SalesforceQueryResponse<T>> {
    const response = await this.api.get(
      `${this.apiBase}/query`,
      {
        params: {
          q: soql,
        },
      }
    );

    if (!response.ok()) {
      throw new Error(
        `Salesforce query failed: HTTP ${response.status()}`
      );
    }

    return response.json() as Promise<SalesforceQueryResponse<T>>;
  }

  async create(
    objectName: string,
    fields: Record<string, unknown>
  ): Promise<string> {
    const response = await this.api.post(
      `${this.apiBase}/sobjects/${objectName}/`,
      {
        data: fields,
      }
    );

    if (!response.ok()) {
      throw new Error(
        `Salesforce create ${objectName} failed: HTTP ${response.status()}`
      );
    }

    const result =
      (await response.json()) as SalesforceCreateResponse;

    if (!result.success || !result.id) {
      throw new Error(
        `Salesforce create ${objectName} did not return a successful record ID.`
      );
    }

    return result.id;
  }

  async update(
    objectName: string,
    recordId: string,
    fields: Record<string, unknown>
  ): Promise<void> {
    const response = await this.api.patch(
      `${this.apiBase}/sobjects/${objectName}/${recordId}`,
      {
        data: fields,
      }
    );

    if (!response.ok()) {
      throw new Error(
        `Salesforce update ${objectName}/${recordId} failed: HTTP ${response.status()}`
      );
    }
  }

  async delete(
  objectName: string,
  recordId: string
): Promise<void> {
  const response = await this.api.delete(
    `${this.apiBase}/sobjects/${objectName}/${recordId}`
  );

  if (response.status() !== 204) {
      throw new Error(
        `Salesforce delete ${objectName}/${recordId} failed: HTTP ${response.status()}`
      );
    }
  }

  async close(): Promise<void> {
    await this.api.dispose();
  }
}