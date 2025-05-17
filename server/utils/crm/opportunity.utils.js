import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";
import { logger } from "../../logger.js";
import { Opportunity } from "../../models/crm/opportunity/opportunity.model.js";
import { Pipeline } from "../../models/crm/opportunity/pipeline.model.js";
import { PipelineStage } from "../../models/crm/opportunity/pipeline.stage.model.js";
import {
    DEFAULT_PIPELINE_NAME,
    DEFAULT_PIPELINE_STAGES,
} from "../../config/qrev_crm/opportunity.config.js";

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
    { accountId, filters = {}, pagination = {}, pipelineId },
    { logg, txid, funcName }
) {
    logg.info(`started`);
    if (!pipelineId) {
        throw `Missing pipeline_id`;
    }
    if (!accountId) {
        throw `Missing account_id`;
    }

    const query = {
        account: accountId,
        is_deleted: { $ne: true },
        pipeline: pipelineId,
    };

    if (filters.stages && filters.stages.length > 0) {
        if (filters.stages.includes("all")) {
            // do nothing
        } else {
            query.pipeline_stage = { $in: filters.stages };
        }
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
        .populate("owner", "profile_first_name profile_last_name email")
        .populate("pipeline_stage", "name probability")
        .populate("created_by", "profile_first_name profile_last_name email")
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

async function _getOrSetupPipeline(
    { accountId, userId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    let pipelineQuery = { account: accountId, is_deleted: { $ne: true } };
    let pipelines = await Pipeline.find(pipelineQuery).lean();
    let defaultPipeline = pipelines.find(
        (pipeline) => pipeline.is_default_pipeline
    );

    if (!defaultPipeline) {
        let pipelineDoc = {
            name: DEFAULT_PIPELINE_NAME,
            account: accountId,
            display_order: 0,
            is_default_pipeline: true,
            created_by: userId,
        };
        let insertResps = await Pipeline.insertMany([pipelineDoc]);
        defaultPipeline = insertResps[0];
    } else {
        logg.info(`default pipeline: ${JSON.stringify(defaultPipeline)}`);
    }

    let defPipelineId = defaultPipeline._id;

    let defPipelineStages = await PipelineStage.find({
        ...pipelineQuery,
        pipeline: defPipelineId,
    }).lean();

    if (defPipelineStages.length === 0) {
        let defPipelineStageDocs = DEFAULT_PIPELINE_STAGES.map((stage) => {
            return {
                ...stage,
                account: accountId,
                pipeline: defPipelineId,
            };
        });
        let insertResps = await PipelineStage.insertMany(defPipelineStageDocs);
        defPipelineStages = insertResps;
    }

    let result = {
        pipeline: {
            name: defaultPipeline.name,
            _id: defaultPipeline._id,
        },
        pipeline_stages: defPipelineStages.map((stage) => {
            return {
                _id: stage._id,
                name: stage.name,
                display_order: stage.display_order,
                probability: stage.probability,
            };
        }),
    };

    logg.info(`ended`);
    return [result, null];
}

export const getOrSetupPipeline = functionWrapper(
    fileName,
    "getOrSetupPipeline",
    _getOrSetupPipeline
);

async function _getPipelineSettingInfo(
    { accountId, pipelineId },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    let pipelineDoc = await Pipeline.findOne({
        _id: pipelineId,
        account: accountId,
        is_deleted: { $ne: true },
    }).lean();

    if (!pipelineDoc) {
        throw `Pipeline not found with id: ${pipelineId}`;
    }

    let pipelineStages = await PipelineStage.find({
        pipeline: pipelineId,
        is_deleted: { $ne: true },
    })
        .sort({ display_order: 1 })
        .lean();

    // get count of opportunities in each stage
    let opportunities = await Opportunity.find({
        pipeline: pipelineId,
        is_deleted: { $ne: true },
    })
        .select("pipeline_stage")
        .lean();

    // result: [{stage_id, stage_name, used_in_count, probability, display_order }]
    let result = pipelineStages.map((stage) => {
        return {
            stage_id: stage._id.toString(),
            stage_name: stage.name,
            used_in_count: opportunities.filter(
                (opp) => opp.pipeline_stage.toString() === stage._id.toString()
            ).length,
            probability: stage.probability || 0,
            display_order: stage.display_order,
        };
    });

    logg.info(`result: ${JSON.stringify(result)}`);
    logg.info(`ended`);
    return [result, null];
}

export const getPipelineSettingInfo = functionWrapper(
    fileName,
    "getPipelineSettingInfo",
    _getPipelineSettingInfo
);

async function _updatePipelineSettingInfo(
    {
        accountId,
        pipelineId,
        stagesToBeDeleted = [],
        stagesToBeAdded = [],
        stagesToBeUpdated = [],
    },
    { logg, txid, funcName }
) {
    logg.info(`started`);

    // Validate input
    if (
        !Array.isArray(stagesToBeDeleted) ||
        !Array.isArray(stagesToBeAdded) ||
        !Array.isArray(stagesToBeUpdated)
    ) {
        throw new CustomError(
            "Invalid pipeline setting info format",
            fileName,
            funcName,
            400,
            true
        );
    }

    // Get current pipeline stages
    const existingStages = await PipelineStage.find({
        pipeline: pipelineId,
        account: accountId,
        is_deleted: { $ne: true },
    }).lean();

    // Get count of opportunities in each stage
    const opportunities = await Opportunity.find({
        pipeline: pipelineId,
        is_deleted: { $ne: true },
    })
        .select("pipeline_stage")
        .lean();

    // Count opportunities per stage
    const opportunitiesPerStage = {};
    opportunities.forEach((opp) => {
        const stageId = opp.pipeline_stage.toString();
        opportunitiesPerStage[stageId] =
            (opportunitiesPerStage[stageId] || 0) + 1;
    });

    // Process stages to be added
    const stagesToAdd = stagesToBeAdded.map((stage) => ({
        name: stage.stage_name,
        display_order: stage.display_order,
        probability: stage.probability || 0,
        account: accountId,
        pipeline: pipelineId,
    }));

    // Process stages to be updated
    const stagesToUpdate = stagesToBeUpdated.map((stage) => ({
        _id: stage.stage_id,
        name: stage.stage_name,
        display_order: stage.display_order,
        probability: stage.probability || 0,
    }));

    // Process stages to be deleted
    const stageIdsToDelete = [];
    for (const stage of stagesToBeDeleted) {
        const stageId = stage.stage_id;
        const usedInCount = opportunitiesPerStage[stageId] || 0;

        // Find stage name for error message
        const existingStage = existingStages.find(
            (s) => s._id.toString() === stageId
        );
        const stageName = existingStage ? existingStage.name : "Unknown";

        if (usedInCount > 0) {
            throw new CustomError(
                `Cannot delete stage "${stageName}" as it is used by ${usedInCount} opportunities`,
                fileName,
                funcName,
                400,
                true
            );
        }

        stageIdsToDelete.push(stageId);
    }

    // Perform database operations

    // Add new stages
    if (stagesToAdd.length > 0) {
        await PipelineStage.insertMany(stagesToAdd);
    }

    // Update existing stages
    for (const stage of stagesToUpdate) {
        await PipelineStage.updateOne(
            { _id: stage._id, account: accountId, pipeline: pipelineId },
            {
                $set: {
                    name: stage.name,
                    display_order: stage.display_order,
                    probability: stage.probability,
                    updated_on: new Date(),
                },
            }
        );
    }

    // Delete stages
    if (stageIdsToDelete.length > 0) {
        await PipelineStage.updateMany(
            {
                _id: { $in: stageIdsToDelete },
                account: accountId,
                pipeline: pipelineId,
            },
            { $set: { is_deleted: true, updated_on: new Date() } }
        );
    }

    // Get updated pipeline stages
    const updatedStages = await PipelineStage.find({
        pipeline: pipelineId,
        account: accountId,
        is_deleted: { $ne: true },
    }).lean();

    // Format result to match getPipelineSettingInfo format
    const result = updatedStages.map((stage) => {
        return {
            stage_id: stage._id.toString(),
            stage_name: stage.name,
            used_in_count: opportunitiesPerStage[stage._id.toString()] || 0,
            probability: stage.probability || 0,
            display_order: stage.display_order,
        };
    });

    // Sort result by display_order
    result.sort((a, b) => a.display_order - b.display_order);

    logg.info(`ended`);
    return [result, null];
}

export const updatePipelineSettingInfo = functionWrapper(
    fileName,
    "updatePipelineSettingInfo",
    _updatePipelineSettingInfo
);
