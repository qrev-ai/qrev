import winston from "winston";

export const logger = winston.createLogger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.prettyPrint(),
        winston.format.printf(formatLoggerStr)
    ),
    exceptionHandlers: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "exception.log" }),
    ],
    rejectionHandlers: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "rejections.log" }),
    ],
});

function formatLoggerStr({
    level,
    txid,
    fileName,
    funcName,
    message,
    timestamp,
    stack,
    durationMs,
    ...meta
}) {
    let str = `${timestamp}: ${level}: `;
    if (txid) str += `${txid}: `;
    if (fileName) str += `${fileName}: `;
    if (funcName) str += `${funcName}: `;
    if (message) str += `${message}`;
    if (durationMs) str += `: ${durationMs}ms`;
    if (Object.keys(meta).length) {
        str += `\n${JSON.stringify(meta, null, 2)}`;
    }
    if (stack) str += `\n Stack: ${stack}`;
    return str;
}
