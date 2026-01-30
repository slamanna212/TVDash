import type { Env, CloudProvider, CloudIncident } from '../../types';
import { parseRSSFeed, hasActiveIncidents } from '../rss-parser';
import { fetchWithCache } from '../../utils/cache';
import { extractAWSRegion } from '../../utils/cloud-regions';

// Key AWS services to monitor
const AWS_RSS_FEEDS = {
  'EC2 US-East-1': 'https://status.aws.amazon.com/rss/ec2-us-east-1.rss',
  'EC2 US-West-2': 'https://status.aws.amazon.com/rss/ec2-us-west-2.rss',
  'S3': 'https://status.aws.amazon.com/rss/s3-us-standard.rss',
  'Lambda US-East-1': 'https://status.aws.amazon.com/rss/lambda-us-east-1.rss',
  'RDS US-East-1': 'https://status.aws.amazon.com/rss/rds-us-east-1.rss',
  'CloudFront': 'https://status.aws.amazon.com/rss/cloudfront.rss',
};

export async function collectAWSStatus(env: Env): Promise<CloudProvider> {
  try {
    return await fetchWithCache(
      env,
      'aws-status',
      'aws',
      async () => {
        const incidents: CloudIncident[] = [];
        let hasAnyIncidents = false;

        // Check each key service
        for (const [serviceName, feedUrl] of Object.entries(AWS_RSS_FEEDS)) {
          try {
            const feed = await parseRSSFeed(feedUrl);
            // Pass all items to hasActiveIncidents - it handles time filtering internally
            const recentItems = feed.items;

            if (hasActiveIncidents(recentItems, 48)) { // Check last 48 hours
              hasAnyIncidents = true;

              // Extract region from service name
              const region = extractAWSRegion(serviceName);
              const regions = region ? [region] : undefined;

              // Add the most recent incident
              const latestIncident = recentItems[0];
              incidents.push({
                title: `${serviceName}: ${latestIncident.title}`,
                severity: determineAWSSeverity(latestIncident.description),
                services: [serviceName],
                regions,
                startTime: new Date(latestIncident.pubDate).toISOString(),
                message: latestIncident.description,
              });
            }
          } catch (error) {
            console.error(`Error checking AWS service ${serviceName}:`, error);
          }
        }

        const status = hasAnyIncidents ? 'degraded' : 'operational';

        return {
          name: 'AWS',
          status,
          incidents,
          lastUpdated: new Date().toISOString(),
        };
      },
      300 // Cache for 5 minutes
    );
  } catch (error) {
    console.error('Error collecting AWS status:', error);
    return {
      name: 'AWS',
      status: 'unknown',
      incidents: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

function determineAWSSeverity(description: string): string {
  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('critical') || lowerDesc.includes('outage')) {
    return 'critical';
  }

  if (lowerDesc.includes('major') || lowerDesc.includes('significant')) {
    return 'major';
  }

  if (lowerDesc.includes('degraded') || lowerDesc.includes('elevated error rates')) {
    return 'minor';
  }

  return 'info';
}
