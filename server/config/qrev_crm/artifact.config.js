const CONTACT_PROPERTIES = {
    // Basic Info
    first_name: {
        label: "First Name",
        type: "string",
        required: true,
        order: 1,
    },
    last_name: {
        label: "Last Name",
        type: "string",
        required: true,
        order: 2,
    },
    email: {
        label: "Email",
        type: "string",
        format: "email",
        order: 3,
    },
    phone: {
        label: "Phone",
        type: "string",
        order: 4,
    },
    mobile: {
        label: "Mobile",
        type: "string",
        order: 5,
    },

    // Professional Info
    job_title: {
        label: "Job Title",
        type: "string",
        order: 6,
    },
    department: {
        label: "Department",
        type: "string",
        order: 7,
    },

    // Social Media
    linkedin_url: {
        label: "LinkedIn URL",
        type: "string",
        format: "url",
        order: 8,
    },
    twitter_url: {
        label: "Twitter URL",
        type: "string",
        format: "url",
        order: 9,
    },

    // Address
    street_address: {
        label: "Street Address",
        type: "string",
        order: 10,
    },
    city: {
        label: "City",
        type: "string",
        order: 11,
    },
    state: {
        label: "State",
        type: "string",
        order: 12,
    },
    postal_code: {
        label: "Postal Code",
        type: "string",
        order: 13,
    },
    country: {
        label: "Country",
        type: "string",
        order: 14,
    },

    // Other
    lead_source: {
        label: "Lead Source",
        type: "string",
        order: 15,
    },
    lead_status: {
        label: "Lead Status",
        type: "chip",
        values: ["new", "contacted", "qualified", "unqualified"],
        order: 16,
    },
    lifecycle_stage: {
        label: "Lifecycle Stage",
        type: "chip",
        values: ["subscriber", "lead", "opportunity", "customer"],
        order: 17,
    },
};

const COMPANY_PROPERTIES = {
    // Basic Info
    name: {
        label: "Company Name",
        type: "string",
        required: true,
        order: 1,
    },
    homepage_url: {
        label: "Website",
        type: "string",
        format: "url",
        order: 2,
    },
    primary_industry: {
        label: "Industry",
        type: "string",
        order: 3,
    },

    // Contact Info
    phone: {
        label: "Phone",
        type: "string",
        order: 4,
    },
    email: {
        label: "Email",
        type: "string",
        format: "email",
        order: 5,
    },

    // Business Details
    annual_revenue: {
        label: "Annual Revenue",
        type: "number",
        order: 6,
    },
    employee_count: {
        label: "Employee Count",
        type: "number",
        order: 7,
    },
    founded_year: {
        label: "Founded Year",
        type: "number",
        order: 8,
    },

    // Address
    street_address: {
        label: "Street Address",
        type: "string",
        order: 9,
    },
    city: {
        label: "City",
        type: "string",
        order: 10,
    },
    state: {
        label: "State",
        type: "string",
        order: 11,
    },
    postal_code: {
        label: "Postal Code",
        type: "string",
        order: 12,
    },
    country: {
        label: "Country",
        type: "string",
        order: 13,
    },

    // Social Media
    linkedin_url: {
        label: "LinkedIn URL",
        type: "string",
        format: "url",
        order: 14,
    },
    twitter_url: {
        label: "Twitter URL",
        type: "string",
        format: "url",
        order: 15,
    },

    // Classification
    company_type: {
        label: "Company Type",
        type: "chip",
        values: ["prospect", "customer", "partner", "vendor"],
        order: 16,
    },
    tier: {
        label: "Tier",
        type: "chip",
        values: ["enterprise", "mid-market", "small-business"],
        order: 17,
    },
};

export const SUPPORTED_ARTIFACT_TYPES = {
    contact: CONTACT_PROPERTIES,
    company: COMPANY_PROPERTIES,
};

export const SUPPORTED_ARTIFACT_TYPES_ARRAY = Object.keys(
    SUPPORTED_ARTIFACT_TYPES
);
