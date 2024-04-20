// create a custom error class to handle errors and expose it

class CustomError extends Error {
    constructor(
        error,
        fileName = "",
        funcName = "",
        statusCode = 500,
        reportToTeam = true
    ) {
        let message = null;
        if (typeof error === "string") {
            message = error;
        } else if (error && error.isCustomError) {
            message = error.message;
        } else if (error && error.response && error.response.data) {
            message = JSON.stringify(error.response.data);
        } else if (error && error.message) {
            message = error.message;
        } else {
            message = "Unknown error";
        }
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        this.isOperational = true;
        this.reportToTeam = reportToTeam;
        this.isCustomError = true;
        if (error.isCustomError) {
            this.fileName = error.fileName;
            this.funcName = error.funcName;
        } else {
            this.fileName = fileName;
            this.funcName = funcName;
        }
        Error.captureStackTrace(this, this.constructor);
    }
}

export default CustomError;
