import { SalesforceClient } from './salesforce-client';

export interface AccountRecord {
  Id: string;
  Name: string;
}

export interface ContactRecord {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  AccountId: string;
}

export interface OpportunityRecord {
  Id: string;
  Name: string;
  Amount: number | null;
  StageName: string;
  CloseDate: string;
  AccountId: string;
}

export async function getAccount(
  client: SalesforceClient,
  accountId: string
): Promise<AccountRecord> {
  const result = await client.query<AccountRecord>(
    `SELECT Id, Name FROM Account WHERE Id = '${accountId}' LIMIT 1`
  );

  const record = result.records[0];

  if (!record) {
    throw new Error(`Account "${accountId}" was not found.`);
  }

  return record;
}

export async function getContact(
  client: SalesforceClient,
  contactId: string
): Promise<ContactRecord> {
  const result = await client.query<ContactRecord>(
    `SELECT Id, FirstName, LastName, Email, AccountId
     FROM Contact
     WHERE Id = '${contactId}'
     LIMIT 1`
  );

  const record = result.records[0];

  if (!record) {
    throw new Error(`Contact "${contactId}" was not found.`);
  }

  return record;
}

export async function getOpportunity(
  client: SalesforceClient,
  opportunityId: string
): Promise<OpportunityRecord> {
  const result = await client.query<OpportunityRecord>(
    `SELECT Id, Name, Amount, StageName, CloseDate, AccountId
     FROM Opportunity
     WHERE Id = '${opportunityId}'
     LIMIT 1`
  );

  const record = result.records[0];

  if (!record) {
    throw new Error(`Opportunity "${opportunityId}" was not found.`);
  }

  return record;
}

export async function createAccount(
  client: SalesforceClient,
  name: string
): Promise<AccountRecord> {
  const id = await client.create('Account', {
    Name: name,
  });

  return {
    Id: id,
    Name: name,
  };
}

export async function findAccountsByName(
  client: SalesforceClient,
  name: string
): Promise<AccountRecord[]> {
  const response = await client.query<AccountRecord>(
    `SELECT Id, Name FROM Account WHERE Name = '${name}'`
  );

  return response.records;
}

export async function findOpportunitiesByName(
  client: SalesforceClient,
  name: string
): Promise<OpportunityRecord[]> {
  const response = await client.query<OpportunityRecord>(
    `SELECT Id, Name, Amount, StageName, CloseDate, AccountId
     FROM Opportunity
     WHERE Name = '${name}'`
  );

  return response.records;
}