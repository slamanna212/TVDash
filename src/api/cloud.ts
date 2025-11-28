import type { Env } from '../types';
import { collectAWSStatus } from '../collectors/cloud/aws';
import { collectAzureStatus } from '../collectors/cloud/azure';
import { collectGCPStatus } from '../collectors/cloud/gcp';

export async function getCloudStatus(env: Env): Promise<Response> {
  try {
    // Fetch status from all three cloud providers in parallel
    const [aws, azure, gcp] = await Promise.all([
      collectAWSStatus(env),
      collectAzureStatus(env),
      collectGCPStatus(env),
    ]);

    return new Response(JSON.stringify({
      providers: [aws, azure, gcp],
      lastUpdated: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching cloud status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch cloud status',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
