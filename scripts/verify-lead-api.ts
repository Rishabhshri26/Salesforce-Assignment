import { getSalesforceOrgAuth } from '../utils/salesforce-cli';
import { SalesforceClient } from '../api/salesforce-client';
import { createLead, getLead } from '../api/lead-api';
import { createLeadTestData } from '../utils/test-data';

async function main(): Promise<void> {
  const auth = await getSalesforceOrgAuth();
  const client = await SalesforceClient.create(auth);

  const data = createLeadTestData();

  try {
    const createdLead = await createLead(client, data);

    console.log('Lead created successfully');
    console.log(`Lead ID available: ${Boolean(createdLead.id)}`);

    const lead = await getLead(client, createdLead.id);

    console.log(`Lead retrieved successfully: ${lead.Id === createdLead.id}`);
    console.log(`Company matches: ${lead.Company === data.company}`);
    console.log(`Email matches: ${lead.Email === data.email}`);

    await client.delete('Lead', createdLead.id);

    console.log('Lead cleanup successful');
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Unknown error'
  );
  process.exitCode = 1;
});