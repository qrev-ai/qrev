import mongoose from "mongoose";

const Schema = mongoose.Schema;

const SequenceStepSchema = new Schema({
    _id: String,
    sequence: { type: String, ref: "sequence" },
    account: { type: Schema.Types.ObjectId, ref: "account" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },

    type: String,
    subject: String,
    body: String,
    // later we will support draft_type: "fixed" or "hybrid" or "ai_generated". For now, it is only "ai_generated"
    draft_type: { type: String, default: "ai_generated" },
    /*
    time_of_dispatch: {
            type: "from_prospect_added_time",
            value: { time_value: 1, time_unit: "day" },
        }
    */
    time_of_dispatch: {},
    active: { type: Boolean, default: true },
    order: { type: Number, default: 1 },

    is_prospects_generation_completed: { type: Boolean, default: false },
    prospects_generation_estimation_date: Date,

    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const SequenceStep = mongoose.model(
    "sequence.step",
    SequenceStepSchema,
    "sequence.step"
);
