import { logger } from "../../logger.js";

export async function testApi(req, res, next) {
    const txid = `test`;
    const funcName = "testApi";
    const logg = logger.child({ txid, funcName });
    logg.info(`started with body:` + JSON.stringify(req.body));

    let docs = null;

    _printDocs(docs, req.body, logg);
    logg.info(`ended`);
    res.json({ docs });
}

function _printDocs(docs, reqBody, logg) {
    if (reqBody.doc_log) {
        logg.info(`docs: ` + JSON.stringify(docs));
    }
    if (reqBody.doc_length_log && docs && (docs.length || docs.length === 0)) {
        logg.info(`docs.length: ` + docs.length);
    } else if (reqBody.doc_length_log) {
        logg.info(`\nCannot display docs.length`);
    }
}
