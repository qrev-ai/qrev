import mongoose from "mongoose";

const Schema = mongoose.Schema;

/*
 * Note: Currently (As of 16 May 2025) only Name is being used and maybe unit_price
 */
const ProductSchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: "account" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },

    name: { type: String, required: true },
    description: { type: String },
    sku: { type: String },
    billing_frequency: {
        type: String,
        enum: [
            "one_time",
            "weekly",
            "every_2_weeks",
            "monthly",
            "quarterly",
            "semi_annually",
            "annually",
            "every_2_years",
            "every_3_years",
            "every_4_years",
            "every_5_years",
        ],
        default: "one_time",
    },
    term: { type: String },
    product_type: {
        type: String,
        enum: ["inventory", "non_inventory", "service"],
    },
    url: { type: String },
    unit_cost: { type: Number },
    unit_price: { type: Number },
    margin: { type: Number },
    image_url: { type: String },

    is_deleted: { type: Boolean, default: false },
    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
});

export const Product = mongoose.model(
    "crm.product",
    ProductSchema,
    "crm.product"
);
