import { SalesforceClient } from './salesforce-client';

export interface LeadTestData {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
}

export interface LeadRecord extends LeadTestData {
  id: string;
}

export interface SalesforceLead {
  Id: string;
  FirstName: string;
  LastName: string;
  Company: string;
  Email: string;
  Status: string;
  IsConverted: boolean;
  ConvertedAccountId: string | null;
  ConvertedContactId: string | null;
  ConvertedOpportunityId: string | null;
}

export async function createLead(
  client: SalesforceClient,
  data: LeadTestData
): Promise<LeadRecord> {
  /*
   * Resolve a valid non-converted Lead status from the target org instead
   * of hard-coding a status value that may differ between Salesforce orgs.
   */
  const statusResult = await client.query<{
    MasterLabel: string;
    IsConverted: boolean;
  }>(
    `
      SELECT MasterLabel, IsConverted
      FROM LeadStatus
      WHERE IsConverted = false
      ORDER BY SortOrder
      LIMIT 1
    `
  );

  const status = statusResult.records[0]?.MasterLabel;

  if (!status) {
    throw new Error(
      'No non-converted Lead status is available in the target Salesforce org.'
    );
  }

  const id = await client.create('Lead', {
    FirstName: data.firstName,
    LastName: data.lastName,
    Company: data.company,
    Email: data.email,
    Status: status,
  });

  return {
    id,
    ...data,
  };
}

export async function getLead(
  client: SalesforceClient,
  leadId: string
): Promise<SalesforceLead> {
  if (!/^[a-zA-Z0-9]{15,18}$/.test(leadId)) {
    throw new Error(`Invalid Salesforce Lead ID: "${leadId}"`);
  }

  const result = await client.query<SalesforceLead>(
    `
      SELECT
        Id,
        FirstName,
        LastName,
        Company,
        Email,
        Status,
        IsConverted,
        ConvertedAccountId,
        ConvertedContactId,
        ConvertedOpportunityId
      FROM Lead
      WHERE Id = '${leadId}'
      LIMIT 1
    `
  );

  const lead = result.records[0];

  if (!lead) {
    throw new Error(`Lead "${leadId}" was not found.`);
  }

  return lead;
}