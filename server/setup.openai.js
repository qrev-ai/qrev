import OpenAI from "openai";
import dotenv from "dotenv";

// configure .env using package dotenv
dotenv.config({ path: "./.env" });

let openai;

export const setupOpenAi = () => {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
};

export const getOpenAiInstance = () => {
    if (!openai) {
        throw new Error("OpenAI is not set up. Call setupOpenAi first.");
    }
    return openai;
};
