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
        order: 5,
    },
    email: {
        label: "Email",
        type: "string",
        format: "email",
        order: 6,
    },

    // Business Details
    annual_revenue: {
        label: "Annual Revenue",
        type: "number",
        order: 7,
    },
    employee_count: {
        label: "Employee Count",
        type: "number",
        order: 8,
    },
    google_info: {
        label: "Google Ratings",
        type: "object",
        properties: {
            rating: {
                type: "number",
            },
            rating_count: {
                type: "number",
            },
            cid: {
                type: "string",
                hidden: true,
            },
            fid: {
                type: "string",
                hidden: true,
            },
            placeId: {
                type: "string",
                hidden: true,
            },
        },
        order: 9,
    },
    founded_year: {
        label: "Founded Year",
        type: "number",
        order: 10,
    },

    // Address
    street_address: {
        label: "Street Address",
        type: "string",
        order: 11,
    },
    city: {
        label: "City",
        type: "string",
        order: 12,
    },
    state: {
        label: "State",
        type: "string",
        order: 13,
    },
    postal_code: {
        label: "Postal Code",
        type: "string",
        order: 14,
    },
    country: {
        label: "Country",
        type: "string",
        order: 15,
    },

    // Social Media
    linkedin_url: {
        label: "LinkedIn URL",
        type: "string",
        format: "url",
        order: 16,
    },
    twitter_url: {
        label: "Twitter URL",
        type: "string",
        format: "url",
        order: 17,
    },

    // Classification
    company_type: {
        label: "Company Type",
        type: "chip",
        order: 18,
    },
    tier: {
        label: "Tier",
        type: "chip",
        values: ["enterprise", "mid-market", "small-business"],
        order: 19,
    },

    coordinates: {
        label: "Map",
        type: "object",
        properties: {
            latitude: {
                type: "number",
            },
            longitude: {
                type: "number",
            },
        },
        order: 20,
    },

    description: {
        label: "Description",
        type: "text",
        order: 21,
    },

    thumbnailUrl: {
        label: "Thumbnail URL",
        type: "string",
        format: "url",
        hidden: true,
        order: 22,
    },

    bookingLinks: {
        label: "Booking Links",
        type: "array",
        items: {
            type: "string",
            format: "url",
        },
        order: 23,
    },

    openingHours: {
        label: "Opening Hours",
        type: "object",
        hidden: true,
        properties: {
            Monday: {
                type: "string",
            },
            Tuesday: {
                type: "string",
            },
            Wednesday: {
                type: "string",
            },
            Thursday: {
                type: "string",
            },
            Friday: {
                type: "string",
            },
            Saturday: {
                type: "string",
            },
            Sunday: {
                type: "string",
            },
        },
        order: 24,
    },

    types: {
        label: "Types",
        type: "array_chip",
        items: {
            type: "string",
        },
        order: 25,
    },

    webpages: {
        label: "Web Pages",
        type: "array",
        hidden: true,
        items: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                },
                url: {
                    type: "string",
                    format: "url",
                },
                name: {
                    type: "string",
                },
            },
        },
        order: 26,
    },
};

export const SUPPORTED_ARTIFACT_TYPES = {
    contact: CONTACT_PROPERTIES,
    company: COMPANY_PROPERTIES,
};

export const SUPPORTED_ARTIFACT_TYPES_ARRAY = Object.keys(
    SUPPORTED_ARTIFACT_TYPES
);
