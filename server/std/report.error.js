import sgMail from "@sendgrid/mail";
import { logger } from "../logger.js";

export async function reportErrorToQRevTeam({
    txid,
    location,
    subject,
    message,
}) {
    const funcName = "reportErrorToQRevTeam";
    const logg = logger.child({ txid, funcName });
    logg.info(`started`);
    try {
        if (!txid) {
            logg.error(`ERROR: invalid txid`);
            txid = "unknown";
        }
        if (!location) {
            logg.error(`ERROR: invalid location`);
            location = "unknown";
        }

        if (process.env.LOCAL_COMPUTER === "yes") {
            logg.info(`email not sent because LOCAL_COMPUTER=yes`);
            logg.info(`ended`);
            return;
        }

        let sendgridKey = process.env.SENDGRID_API_KEY;

        if (!sendgridKey) {
            logg.info(`since SENDGRID_API_KEY is not set, email not sent`);
            logg.info(
                `error details: ${JSON.stringify({
                    txid,
                    location,
                    subject,
                    message,
                })}`
            );
            logg.info(`ended`);
            return;
        }

        sgMail.setApiKey(sendgridKey);

        let primaryReportEmail = process.env.PRIMARY_REPORT_EMAIL;
        let secondaryReportEmail = process.env.SECONDARY_REPORT_EMAIL;
        let recipientList = [primaryReportEmail, secondaryReportEmail];
        if (process.env.LOCAL_COMPUTER === "yes") {
            logg.info(
                `sending email to only primary email because LOCAL_COMPUTER=yes`
            );
            recipientList = [primaryReportEmail];
        }

        let fromEmail = process.env.REPORT_FROM_EMAIL;
        let templateId = process.env.SENDGRID_REPORT_ERROR_TEMPLATE_ID;

        const msg = {
            to: recipientList,
            from: fromEmail,
            reply_to: primaryReportEmail,
            templateId,
            dynamicTemplateData: {
                transaction_id: txid,
                location: location,
                message: message || " ",
                error_level: "-",
                subject: subject || " ",
            },
        };
        let sgResp = await sgMail.send(msg);
        logg.info(`sgResp: ${JSON.stringify(sgResp)}`);
        logg.info(`ended`);
        return;
    } catch (err) {
        if (err && err.response && err.response.data) {
            err = JSON.stringify(err.response.data);
        }
        logg.error(err);
        logg.info(`ERROR message:` + err);
        logg.info(`ended unsuccessfully`);
        return;
    }
}
