import { getSalesforceOrgAuth } from '../utils/salesforce-cli';
import { SalesforceClient } from '../api/salesforce-client';

async function main(): Promise<void> {
  const auth = await getSalesforceOrgAuth();

  const client = await SalesforceClient.create(auth);

  try {
    const result = await client.query<{
      Id: string;
      Name: string;
    }>(
      'SELECT Id, Name FROM Organization LIMIT 1'
    );

    console.log('Salesforce API connection successful');
    console.log(`Records returned: ${result.totalSize}`);
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