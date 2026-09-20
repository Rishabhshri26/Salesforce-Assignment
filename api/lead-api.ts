import type { SalesforceClient } from './salesforce-client';

export interface LeadTestData {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
}

export interface LeadRecord {
  id: string;
}

export interface SalesforceLead {
  Id: string;
  FirstName: string | null;
  LastName: string;
  Company: string;
  Email: string | null;
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
  const statusResponse = await client.query<{ MasterLabel: string }>(
    `SELECT MasterLabel
     FROM LeadStatus
     WHERE IsConverted = false
     ORDER BY SortOrder
     LIMIT 1`
  );

  const status = statusResponse.records[0]?.MasterLabel;

  if (!status) {
    throw new Error('No valid unconverted Lead status was found.');
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
  };
}

export async function getLead(
  client: SalesforceClient,
  leadId: string
): Promise<SalesforceLead> {
  if (!/^[a-zA-Z0-9]{15,18}$/.test(leadId)) {
    throw new Error(`Invalid Salesforce Lead ID: ${leadId}`);
  }

  const response = await client.query<SalesforceLead>(
    `SELECT
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
     LIMIT 1`
  );

  const lead = response.records[0];

  if (!lead) {
    throw new Error(`Lead ${leadId} was not found.`);
  }

  return lead;
}