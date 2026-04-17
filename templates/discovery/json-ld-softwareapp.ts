/*
 * json-ld-softwareapp.ts — TypeScript JSON-LD schema generators for SoftwareApplication + related types.
 *
 * What: Strongly-typed JSON-LD generators for agent discovery via schema.org.
 * Use these in Next.js App Router generateMetadata() or in <script type="application/ld+json"> tags.
 *
 * When: Embed structured data in HTML HEAD to help agents understand your project.
 *
 * What to customize:
 * 1. Replace example.com with your domain
 * 2. Update organizationName, applicationName, description
 * 3. Add real GitHub/npm URLs
 * 4. Extend schemas (Organization, FAQPage, HowTo) to match your content
 * 5. Export from app/layout.tsx or a shared metadata module
 *
 * Specs:
 * - schema.org SoftwareApplication: https://schema.org/SoftwareApplication
 * - schema.org WebAPI: https://schema.org/WebAPI
 * - JSON-LD format: https://json-ld.org
 * - Next.js generateMetadata: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
 *
 * Validation: Use Zod to validate output shape at build time (see bottom of file).
 */

import { z } from 'zod';

/**
 * Base schema.org context + @type shape.
 */
const BaseSchemaShape = z.object({
  '@context': z.literal('https://schema.org'),
  '@type': z.string(),
});

/**
 * SoftwareApplication schema for project identity.
 * https://schema.org/SoftwareApplication
 */
const SoftwareApplicationSchema = BaseSchemaShape.extend({
  '@type': z.literal('SoftwareApplication'),
  name: z.string().describe('Project name'),
  description: z.string().describe('One-sentence description'),
  url: z.string().url().describe('Homepage URL'),
  author: z.object({
    '@type': z.literal('Organization'),
    name: z.string(),
    url: z.string().url().optional(),
  }),
  applicationCategory: z.enum(['DeveloperApplication', 'WebApplication', 'Utility']),
  codeRepository: z.string().url().optional().describe('GitHub repo URL'),
  issueTracker: z.string().url().optional().describe('GitHub issues URL'),
  downloadUrl: z.string().url().optional().describe('npm package URL'),
  version: z.string().optional().describe('Current version'),
  operatingSystem: z.string().optional().describe('e.g., "Any", "Linux", "macOS"'),
  license: z.string().url().optional().describe('License URL (MIT, Apache 2.0, etc.)'),
  offers: z
    .object({
      '@type': z.literal('AggregateOffer'),
      priceCurrency: z.string().optional(),
      lowPrice: z.string(),
      highPrice: z.string().optional(),
    })
    .optional(),
  screenshots: z
    .array(
      z.object({
        '@type': z.literal('ImageObject'),
        url: z.string().url(),
      }),
    )
    .optional(),
});

export type SoftwareApplication = z.infer<typeof SoftwareApplicationSchema>;

/**
 * Generator for SoftwareApplication schema.
 */
export function createSoftwareApplication({
  name,
  description,
  url,
  organizationName,
  organizationUrl,
  repositoryUrl,
  issueTrackerUrl,
  npmPackageUrl,
  version,
  license = 'MIT',
}: {
  name: string;
  description: string;
  url: string;
  organizationName: string;
  organizationUrl?: string;
  repositoryUrl?: string;
  issueTrackerUrl?: string;
  npmPackageUrl?: string;
  version?: string;
  license?: string;
}): SoftwareApplication {
  const schema: SoftwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    author: {
      '@type': 'Organization',
      name: organizationName,
      url: organizationUrl,
    },
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
  };

  if (repositoryUrl) schema.codeRepository = repositoryUrl;
  if (issueTrackerUrl) schema.issueTracker = issueTrackerUrl;
  if (npmPackageUrl) schema.downloadUrl = npmPackageUrl;
  if (version) schema.version = version;
  if (license) schema.license = license;

  // Validate before returning
  return SoftwareApplicationSchema.parse(schema);
}

/**
 * WebAPI schema for REST/MCP API discovery.
 * https://schema.org/WebAPI
 */
const WebAPISchema = BaseSchemaShape.extend({
  '@type': z.literal('WebAPI'),
  name: z.string(),
  description: z.string(),
  url: z.string().url(),
  documentation: z.string().url().optional(),
  contact: z
    .object({
      '@type': z.literal('ContactPoint'),
      contactType: z.string(),
      email: z.string().email().optional(),
    })
    .optional(),
});

export type WebAPI = z.infer<typeof WebAPISchema>;

/**
 * Generator for WebAPI schema.
 */
export function createWebAPI({
  name,
  description,
  url,
  documentationUrl,
  contactEmail,
}: {
  name: string;
  description: string;
  url: string;
  documentationUrl?: string;
  contactEmail?: string;
}): WebAPI {
  const schema: WebAPI = {
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    name,
    description,
    url,
  };

  if (documentationUrl) schema.documentation = documentationUrl;
  if (contactEmail) {
    schema.contact = {
      '@type': 'ContactPoint',
      contactType: 'Support',
      email: contactEmail,
    };
  }

  return WebAPISchema.parse(schema);
}

/**
 * FAQPage schema for documentation with common questions.
 * https://schema.org/FAQPage
 */
const FAQPageSchema = BaseSchemaShape.extend({
  '@type': z.literal('FAQPage'),
  name: z.string().optional(),
  mainEntity: z.array(
    z.object({
      '@type': z.literal('Question'),
      name: z.string(),
      acceptedAnswer: z.object({
        '@type': z.literal('Answer'),
        text: z.string(),
      }),
    }),
  ),
});

export type FAQPage = z.infer<typeof FAQPageSchema>;

/**
 * Generator for FAQPage schema.
 */
export function createFAQPage(
  faqs: Array<{ question: string; answer: string }>,
  pageName?: string,
): FAQPage {
  const schema: FAQPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    ...(pageName && { name: pageName }),
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question' as const,
      name: question,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: answer,
      },
    })),
  };

  return FAQPageSchema.parse(schema);
}

/**
 * HowTo schema for step-by-step guides.
 * https://schema.org/HowTo
 */
const HowToSchema = BaseSchemaShape.extend({
  '@type': z.literal('HowTo'),
  name: z.string(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  estimatedTime: z.string().optional().describe('ISO 8601 duration (e.g., PT30M)'),
  tool: z.array(z.string()).optional(),
  step: z.array(
    z.object({
      '@type': z.literal('HowToStep'),
      position: z.number(),
      name: z.string(),
      text: z.string(),
      image: z.string().url().optional(),
    }),
  ),
});

export type HowTo = z.infer<typeof HowToSchema>;

/**
 * Generator for HowTo schema.
 */
export function createHowTo({
  name,
  description,
  steps,
  estimatedTime,
  tools,
  imageUrl,
}: {
  name: string;
  description?: string;
  steps: Array<{ name: string; text: string; imageUrl?: string }>;
  estimatedTime?: string;
  tools?: string[];
  imageUrl?: string;
}): HowTo {
  const schema: HowTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    ...(description && { description }),
    ...(imageUrl && { image: imageUrl }),
    ...(estimatedTime && { estimatedTime }),
    ...(tools && { tool: tools }),
    step: steps.map((step, i) => ({
      '@type': 'HowToStep' as const,
      position: i + 1,
      name: step.name,
      text: step.text,
      ...(step.imageUrl && { image: step.imageUrl }),
    })),
  };

  return HowToSchema.parse(schema);
}

/**
 * Organization schema (for website footer / global metadata).
 * https://schema.org/Organization
 */
const OrganizationSchema = BaseSchemaShape.extend({
  '@type': z.literal('Organization'),
  name: z.string(),
  url: z.string().url(),
  logo: z.string().url().optional(),
  sameAs: z.array(z.string().url()).optional().describe('Social media + GitHub URLs'),
  contact: z
    .object({
      '@type': z.literal('ContactPoint'),
      contactType: z.string(),
      email: z.string().email(),
    })
    .optional(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

/**
 * Generator for Organization schema.
 */
export function createOrganization({
  name,
  url,
  logoUrl,
  contactEmail,
  socialMediaUrls,
}: {
  name: string;
  url: string;
  logoUrl?: string;
  contactEmail?: string;
  socialMediaUrls?: string[];
}): Organization {
  const schema: Organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
  };

  if (logoUrl) schema.logo = logoUrl;
  if (socialMediaUrls && socialMediaUrls.length > 0) {
    schema.sameAs = socialMediaUrls;
  }
  if (contactEmail) {
    schema.contact = {
      '@type': 'ContactPoint',
      contactType: 'Support',
      email: contactEmail,
    };
  }

  return OrganizationSchema.parse(schema);
}

/**
 * Next.js App Router integration example.
 *
 * Usage in app/layout.tsx:
 *
 * ```typescript
 * import { createSoftwareApplication, createOrganization } from '@/lib/json-ld';
 *
 * export const generateMetadata = (): Metadata => ({
 *   title: 'Acme Agent Tools',
 *   description: 'TypeScript SDK for agent-consumable services',
 * });
 *
 * export default function RootLayout({ children }) {
 *   const appSchema = createSoftwareApplication({
 *     name: 'Acme Agent Tools',
 *     description: 'TypeScript SDK for agent-consumable services',
 *     url: 'https://example.com',
 *     organizationName: 'Acme Inc.',
 *     repositoryUrl: 'https://github.com/acme/agent-tools',
 *     npmPackageUrl: 'https://www.npmjs.com/package/@acme/sdk',
 *     version: '1.0.0',
 *   });
 *
 *   const orgSchema = createOrganization({
 *     name: 'Acme Inc.',
 *     url: 'https://example.com',
 *     contactEmail: 'support@example.com',
 *     socialMediaUrls: ['https://github.com/acme', 'https://twitter.com/acme'],
 *   });
 *
 *   return (
 *     <html lang="en">
 *       <head>
 *         <script
 *           type="application/ld+json"
 *           dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
 *         />
 *         <script
 *           type="application/ld+json"
 *           dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
 *         />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 */

/**
 * Build-time validation function.
 * Call during build to ensure all schemas conform.
 */
export function validateAllSchemas(): void {
  // Example: validate a complete set
  const app = createSoftwareApplication({
    name: 'Example',
    description: 'Example app',
    url: 'https://example.com',
    organizationName: 'Example Inc.',
  });

  const org = createOrganization({
    name: 'Example Inc.',
    url: 'https://example.com',
  });

  const faq = createFAQPage([
    { question: 'How do I install?', answer: 'Run npm install' },
  ]);

  const howto = createHowTo({
    name: 'Getting Started',
    steps: [{ name: 'Install', text: 'Run npm install' }],
  });

  console.log('✓ JSON-LD schemas validate at build time');
}

// Uncomment to run validation at build (add to next.config.ts):
// import { validateAllSchemas } from '@/lib/json-ld';
// validateAllSchemas();
