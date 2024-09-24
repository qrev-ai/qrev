import { getOpenAiInstance } from "../../setup.openai.js";
import { functionWrapper } from "../../std/wrappers.js";
import CustomError from "../../std/custom.error.js";

const fileName = "OpenAI Utils";

async function _queryGpt40Mini({ query }, { logg, funcName }) {
    try {
        logg.info(`Querying GPT-4o Mini with query: ${query}`);
        const openai = getOpenAiInstance();
        const response = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                {
                    role: "user",
                    content: query,
                },
            ],
            model: "gpt-4o-mini",
        });
        const summary = response.choices[0].message.content.trim();
        logg.info(`Received summary: ${summary}`);
        return [summary, null];
    } catch (error) {
        logg.error(`OpenAI request failed: ${error.message}`);
        throw new CustomError("OpenAI request failed", fileName, funcName);
    }
}

export const queryGpt40Mini = functionWrapper(
    fileName,
    "_queryGpt40Mini",
    _queryGpt40Mini
);
