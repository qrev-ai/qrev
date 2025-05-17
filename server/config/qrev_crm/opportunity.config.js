export const DEFAULT_PIPELINE_NAME = "Sales Pipeline";

export const DEFAULT_PIPELINE_STAGES = [
    {
        name: "Lead",
        display_order: 0,
        probability: 10,
    },
    {
        name: "Qualification",
        display_order: 1,
        probability: 30,
    },
    {
        name: "Proposal",
        display_order: 2,
        probability: 50,
    },
    {
        name: "Negotiation",
        display_order: 3,
        probability: 70,
    },
    {
        name: "Installation",
        display_order: 4,
        probability: 90,
    },
    {
        name: "Closed Won",
        display_order: 5,
        probability: 100,
    },
    {
        name: "Closed Lost",
        display_order: 6,
        probability: 0,
    },
];
