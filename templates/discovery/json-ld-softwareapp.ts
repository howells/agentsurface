/*
 * json-ld-softwareapp.ts - TypeScript JSON-LD schema generators for SoftwareApplication + related types.
 *
 * What: Strongly-typed JSON-LD generators for agent discovery via schema.org.
 * Render them in <script type="application/ld+json"> elements in a Next.js page or layout
 * (generateMetadata() does not emit arbitrary JSON-LD).
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
 * - Next.js JSON-LD guide: https://nextjs.org/docs/app/guides/json-ld
 *
 * Validation: Use Zod to validate output shape at build time (see bottom of file).
 */

import { z } from "zod";

/**
 * Base schema.org context + @type shape.
 */
const BaseSchemaShape = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.string(),
});

/**
 * SoftwareApplication schema for project identity.
 * https://schema.org/SoftwareApplication
 */
const SoftwareApplicationSchema = BaseSchemaShape.extend({
  "@type": z.literal("SoftwareApplication"),
  applicationCategory: z.enum(["DeveloperApplication", "WebApplication", "Utility"]),
  author: z.object({
    "@type": z.literal("Organization"),
    name: z.string(),
    url: z.string().url().optional(),
  }),
  description: z.string().describe("One-sentence description"),
  downloadUrl: z.string().url().optional().describe("npm package URL"),
  license: z
    .string()
    .url()
    .optional()
    .describe("License URL, e.g. https://opensource.org/licenses/MIT"),
  name: z.string().describe("Project name"),
  offers: z
    .object({
      "@type": z.literal("AggregateOffer"),
      priceCurrency: z.string().optional(),
      lowPrice: z.string(),
      highPrice: z.string().optional(),
    })
    .optional(),
  operatingSystem: z.string().optional().describe('e.g., "Any", "Linux", "macOS"'),
  // codeRepository belongs to SoftwareSourceCode, not SoftwareApplication, so the
  // repository is linked through sameAs.
  sameAs: z.array(z.string().url()).optional().describe("Repository and profile URLs"),
  screenshot: z
    .array(
      z.object({
        "@type": z.literal("ImageObject"),
        url: z.string().url(),
      }),
    )
    .optional(),
  url: z.string().url().describe("Homepage URL"),
  version: z.string().optional().describe("Current version"),
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
  npmPackageUrl,
  version,
  licenseUrl,
}: {
  name: string;
  description: string;
  url: string;
  organizationName: string;
  organizationUrl?: string;
  repositoryUrl?: string;
  npmPackageUrl?: string;
  version?: string;
  /** A URL, e.g. https://opensource.org/licenses/MIT - not a bare name like "MIT". */
  licenseUrl?: string;
}): SoftwareApplication {
  const schema: SoftwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    applicationCategory: "DeveloperApplication",
    author: {
      "@type": "Organization",
      name: organizationName,
      url: organizationUrl,
    },
    description,
    name,
    operatingSystem: "Any",
    url,
  };

  if (repositoryUrl) {
    schema.sameAs = [repositoryUrl];
  }
  if (npmPackageUrl) {
    schema.downloadUrl = npmPackageUrl;
  }
  if (version) {
    schema.version = version;
  }
  if (licenseUrl) {
    schema.license = licenseUrl;
  }

  // Validate before returning
  return SoftwareApplicationSchema.parse(schema);
}

/**
 * WebAPI schema for REST/MCP API discovery.
 * https://schema.org/WebAPI
 */
const WebAPISchema = BaseSchemaShape.extend({
  "@type": z.literal("WebAPI"),
  description: z.string(),
  documentation: z.string().url().optional(),
  name: z.string(),
  url: z.string().url(),
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
}: {
  name: string;
  description: string;
  url: string;
  documentationUrl?: string;
}): WebAPI {
  const schema: WebAPI = {
    "@context": "https://schema.org",
    "@type": "WebAPI",
    description,
    name,
    url,
  };

  if (documentationUrl) {
    schema.documentation = documentationUrl;
  }

  return WebAPISchema.parse(schema);
}

/**
 * FAQPage schema for documentation with common questions.
 * https://schema.org/FAQPage
 */
const FAQPageSchema = BaseSchemaShape.extend({
  "@type": z.literal("FAQPage"),
  mainEntity: z.array(
    z.object({
      "@type": z.literal("Question"),
      name: z.string(),
      acceptedAnswer: z.object({
        "@type": z.literal("Answer"),
        text: z.string(),
      }),
    }),
  ),
  name: z.string().optional(),
});

export type FAQPage = z.infer<typeof FAQPageSchema>;

/**
 * Generator for FAQPage schema.
 */
export function createFAQPage(
  faqs: { question: string; answer: string }[],
  pageName?: string,
): FAQPage {
  const schema: FAQPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(pageName && { name: pageName }),
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question" as const,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: answer,
      },
      name: question,
    })),
  };

  return FAQPageSchema.parse(schema);
}

/**
 * HowTo schema for step-by-step guides.
 * https://schema.org/HowTo
 */
const HowToSchema = BaseSchemaShape.extend({
  "@type": z.literal("HowTo"),
  description: z.string().optional(),
  totalTime: z.string().optional().describe("ISO 8601 duration (e.g., PT30M)"),
  image: z.string().url().optional(),
  name: z.string(),
  step: z.array(
    z.object({
      "@type": z.literal("HowToStep"),
      position: z.number(),
      name: z.string(),
      text: z.string(),
      image: z.string().url().optional(),
    }),
  ),
  tool: z.array(z.string()).optional(),
});

export type HowTo = z.infer<typeof HowToSchema>;

/**
 * Generator for HowTo schema.
 */
export function createHowTo({
  name,
  description,
  steps,
  totalTime,
  tools,
  imageUrl,
}: {
  name: string;
  description?: string;
  steps: { name: string; text: string; imageUrl?: string }[];
  totalTime?: string;
  tools?: string[];
  imageUrl?: string;
}): HowTo {
  const schema: HowTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    ...(description && { description }),
    ...(imageUrl && { image: imageUrl }),
    ...(totalTime && { totalTime }),
    ...(tools && { tool: tools }),
    step: steps.map((step, i) => ({
      "@type": "HowToStep" as const,
      name: step.name,
      position: i + 1,
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
  "@type": z.literal("Organization"),
  contactPoint: z
    .object({
      "@type": z.literal("ContactPoint"),
      contactType: z.string(),
      email: z.string().email(),
    })
    .optional(),
  logo: z.string().url().optional(),
  name: z.string(),
  sameAs: z.array(z.string().url()).optional().describe("Social media + GitHub URLs"),
  url: z.string().url(),
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
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
  };

  if (logoUrl) {
    schema.logo = logoUrl;
  }
  if (socialMediaUrls && socialMediaUrls.length > 0) {
    schema.sameAs = socialMediaUrls;
  }
  if (contactEmail) {
    schema.contactPoint = {
      "@type": "ContactPoint",
      contactType: "Support",
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
 * // Escape "<" so structured data can never close the script element early.
 * const toJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
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
 *     licenseUrl: 'https://opensource.org/licenses/MIT',
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
 *           dangerouslySetInnerHTML={{ __html: toJsonLd(appSchema) }}
 *         />
 *         <script
 *           type="application/ld+json"
 *           dangerouslySetInnerHTML={{ __html: toJsonLd(orgSchema) }}
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
  // Each generator parses its own output and throws on a schema mismatch.
  createSoftwareApplication({
    description: "Example app",
    name: "Example",
    organizationName: "Example Inc.",
    url: "https://example.com",
  });

  createOrganization({
    name: "Example Inc.",
    url: "https://example.com",
  });

  createFAQPage([{ answer: "Run npm install", question: "How do I install?" }]);

  createHowTo({
    name: "Getting Started",
    steps: [{ name: "Install", text: "Run npm install" }],
  });

  console.log("✓ JSON-LD schemas validate at build time");
}

// Uncomment to run validation at build (add to next.config.ts):
// import { validateAllSchemas } from '@/lib/json-ld';
// validateAllSchemas();
