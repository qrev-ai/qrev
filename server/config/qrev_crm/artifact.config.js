const CONTACT_PROPERTIES = {
    // Basic Info
    first_name: { type: "string", required: true },
    last_name: { type: "string", required: true },
    email: { type: "string", format: "email" },
    phone: { type: "string" },
    mobile: { type: "string" },

    // Professional Info
    job_title: { type: "string" },
    department: { type: "string" },

    // Social Media
    linkedin_url: { type: "string", format: "url" },
    twitter_url: { type: "string", format: "url" },

    // Address
    street_address: { type: "string" },
    city: { type: "string" },
    state: { type: "string" },
    postal_code: { type: "string" },
    country: { type: "string" },

    // Other
    lead_source: { type: "string" },
    lead_status: {
        type: "string",
        enum: ["new", "contacted", "qualified", "unqualified"],
    },
    lifecycle_stage: {
        type: "string",
        enum: ["subscriber", "lead", "opportunity", "customer"],
    },
};

const COMPANY_PROPERTIES = {
    // Basic Info
    company_name: { type: "string", required: true },
    website: { type: "string", format: "url" },
    industry: { type: "string" },

    // Contact Info
    phone: { type: "string" },
    email: { type: "string", format: "email" },

    // Business Details
    annual_revenue: { type: "number" },
    employee_count: { type: "number" },
    founded_year: { type: "number" },

    // Address
    street_address: { type: "string" },
    city: { type: "string" },
    state: { type: "string" },
    postal_code: { type: "string" },
    country: { type: "string" },

    // Social Media
    linkedin_url: { type: "string", format: "url" },
    twitter_url: { type: "string", format: "url" },

    // Classification
    company_type: {
        type: "string",
        enum: ["prospect", "customer", "partner", "vendor"],
    },
    tier: {
        type: "string",
        enum: ["enterprise", "mid-market", "small-business"],
    },
};

const LIST_PROPERTIES = {
    // Basic Info
    name: { type: "string", required: true },
    description: { type: "string" },

    // List Properties
    content_type: { type: "string", enum: ["contact", "company", "mixed"] },

    // Metadata
    last_updated: { type: "date" },

    // Access Control
    owner: { type: "string" },
};

export const SUPPORTED_ARTIFACT_TYPES = {
    contact: CONTACT_PROPERTIES,
    company: COMPANY_PROPERTIES,
    list: LIST_PROPERTIES,
};

export const SUPPORTED_ARTIFACT_TYPES_ARRAY = Object.keys(
    SUPPORTED_ARTIFACT_TYPES
);
