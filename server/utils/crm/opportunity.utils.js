import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { Opportunity } from "../../models/crm/opportunity.model.js";

const fileName = "Opportunity Utils";

async function _createOpportunity(
    { opportunityData, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    // Add initial stage to stage history
    const initialStage = opportunityData.stage || "lead";
    const stageHistory = [
        {
            stage: initialStage,
            changed_on: new Date(),
        },
    ];

    const opportunity = new Opportunity({
        ...opportunityData,
        account: accountId,
        stage_history: stageHistory,
    });

    const savedOpportunity = await opportunity.save();

    logg.info(`ended`);
    return [savedOpportunity, null];
}

export const createOpportunity = functionWrapper(
    fileName,
    "createOpportunity",
    _createOpportunity
);

async function _getOpportunities(
    { accountId, filters = {}, pagination = {} },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const query = { account: accountId, is_deleted: { $ne: true } };

    // Apply filters
    if (filters.startDate && filters.endDate) {
        query.created_on = {
            $gte: new Date(filters.startDate),
            $lte: new Date(filters.endDate),
        };
    }

    if (filters.stages && filters.stages.length > 0) {
        if (filters.stages.includes("all")) {
            // do nothing
        } else {
            query.stage = { $in: filters.stages };
        }
    }

    if (filters.company) {
        query.company = filters.company;
    }

    if (filters.contact) {
        query.contact = filters.contact;
    }

    if (filters.reseller) {
        query.reseller = filters.reseller;
    }

    if (filters.minAmount !== undefined) {
        query.amount = { ...(query.amount || {}), $gte: filters.minAmount };
    }

    if (filters.maxAmount !== undefined) {
        query.amount = { ...(query.amount || {}), $lte: filters.maxAmount };
    }

    if (filters.minProbability !== undefined) {
        query.probability = {
            ...(query.probability || {}),
            $gte: filters.minProbability,
        };
    }

    if (filters.priority) {
        query.priority = filters.priority;
    }

    if (filters.search) {
        query.$or = [
            { name: { $regex: filters.search, $options: "i" } },
            { description: { $regex: filters.search, $options: "i" } },
            { source: { $regex: filters.search, $options: "i" } },
        ];
    }

    // Set up pagination
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    logg.info(`query: ${JSON.stringify(query)}`);
    // Execute query
    const totalCount = await Opportunity.countDocuments(query);
    const opportunities = await Opportunity.find(query)
        .populate("company", "name website")
        .populate("contact", "first_name last_name email")
        .populate("reseller", "first_name last_name")
        .sort({ created_on: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    logg.info(`Opportunity count: ${totalCount}`);
    if (totalCount < 5) {
        logg.info(`opportunities: ${JSON.stringify(opportunities)}`);
    }

    const result = {
        opportunities,
        pagination: {
            total: totalCount,
            page,
            limit,
            pages: Math.ceil(totalCount / limit),
        },
    };

    logg.info(`ended`);
    return [result, null];
}

export const getOpportunities = functionWrapper(
    fileName,
    "getOpportunities",
    _getOpportunities
);

async function _deleteOpportunity(
    { opportunityId, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const opportunity = await Opportunity.findOne({
        _id: opportunityId,
        account: accountId,
        is_deleted: { $ne: true },
    }).lean();

    if (!opportunity) {
        throw `Opportunity not found with id: ${opportunityId}`;
    }

    const deletedOpportunity = await Opportunity.findOneAndUpdate(
        {
            _id: opportunityId,
            account: accountId,
            is_deleted: { $ne: true },
        },
        { is_deleted: true },
        { new: true }
    ).lean();

    logg.info(`ended`);
    return [deletedOpportunity, null];
}

export const deleteOpportunity = functionWrapper(
    fileName,
    "deleteOpportunity",
    _deleteOpportunity
);

async function _getOpportunityById(
    { opportunityId, accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    const opportunity = await Opportunity.findOne({
        _id: opportunityId,
        account: accountId,
    })
        .populate("company", "name")
        .populate("contact", "first_name last_name email")
        .populate("reseller", "first_name last_name")
        .lean();

    if (!opportunity) {
        throw `Opportunity not found with id: ${opportunityId}`;
    }

    logg.info(`ended`);
    return [opportunity, null];
}

export const getOpportunityById = functionWrapper(
    fileName,
    "getOpportunityById",
    _getOpportunityById
);

async function _getOpportunityPipelineTimeline(
    { accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    // Get all opportunities for the account
    const opportunities = await Opportunity.find({ account: accountId })
        .select("name stage stage_history created_on amount probability")
        .sort({ created_on: -1 })
        .lean();

    // Calculate average time spent in each stage
    const stageTimelines = {};
    const stages = [
        "lead",
        "qualification",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
    ];

    stages.forEach((stage) => {
        stageTimelines[stage] = {
            count: 0,
            totalTimeInDays: 0,
            averageTimeInDays: 0,
            opportunities: [],
        };
    });

    opportunities.forEach((opp) => {
        // Process stage history
        const history = opp.stage_history || [];

        for (let i = 0; i < history.length - 1; i++) {
            const currentStage = history[i];
            const nextStage = history[i + 1];
            const stageName = currentStage.stage;

            if (stages.includes(stageName)) {
                const startDate = new Date(currentStage.changed_on);
                const endDate = new Date(nextStage.changed_on);
                const daysInStage =
                    (endDate - startDate) / (1000 * 60 * 60 * 24);

                stageTimelines[stageName].count++;
                stageTimelines[stageName].totalTimeInDays += daysInStage;
                stageTimelines[stageName].opportunities.push({
                    opportunity_id: opp._id,
                    name: opp.name,
                    daysInStage: daysInStage.toFixed(1),
                    amount: opp.amount,
                });
            }
        }

        // Handle current stage
        if (history.length > 0) {
            const lastStage = history[history.length - 1];
            const stageName = lastStage.stage;

            if (stages.includes(stageName) && stageName === opp.stage) {
                const startDate = new Date(lastStage.changed_on);
                const endDate = new Date();
                const daysInStage =
                    (endDate - startDate) / (1000 * 60 * 60 * 24);

                stageTimelines[stageName].count++;
                stageTimelines[stageName].totalTimeInDays += daysInStage;
                stageTimelines[stageName].opportunities.push({
                    opportunity_id: opp._id,
                    name: opp.name,
                    daysInStage: daysInStage.toFixed(1),
                    amount: opp.amount,
                });
            }
        }
    });

    // Calculate averages
    Object.keys(stageTimelines).forEach((stage) => {
        const data = stageTimelines[stage];
        data.averageTimeInDays =
            data.count > 0 ? (data.totalTimeInDays / data.count).toFixed(1) : 0;
    });

    logg.info(`ended`);
    return [stageTimelines, null];
}

export const getOpportunityPipelineTimeline = functionWrapper(
    fileName,
    "getOpportunityPipelineTimeline",
    _getOpportunityPipelineTimeline
);

async function _getOpportunityAiAnalysis(
    { accountId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    // For now, return static mock data
    const aiAnalysis = {
        winProbability: {
            overall: 65,
            byStage: {
                lead: 20,
                qualification: 40,
                proposal: 60,
                negotiation: 80,
                closed_won: 100,
                closed_lost: 0,
            },
        },
        insights: [
            "Opportunities with faster qualification stages have a 30% higher close rate",
            "Deals with multiple stakeholders have a 45% higher average value",
            "Resellers with certification close deals 2.3x faster than non-certified ones",
            "Follow-ups within 24 hours increase win probability by 35%",
        ],
        recommendations: [
            "Focus on the 5 deals in negotiation stage that have been inactive for over 2 weeks",
            "Assign certified resellers to high-value opportunities in qualification stage",
            "Schedule follow-up for deals that haven't had contact in the last 7 days",
            "Review closed-lost deals to identify common objection patterns",
        ],
        forecastAccuracy: 82,
    };

    logg.info(`ended`);
    return [aiAnalysis, null];
}

export const getOpportunityAiAnalysis = functionWrapper(
    fileName,
    "getOpportunityAiAnalysis",
    _getOpportunityAiAnalysis
);
