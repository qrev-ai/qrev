import GoogleAuthRoutes from "./routes/google/google.auth.routes.js";
import AuthRoutes from "./routes/auth/auth.routes.js";
import TestRouter from "./routes/test/test.routes.js";
import UserRouter from "./routes/user/user.routes.js";
import AccountRouter from "./routes/account/account.routes.js";
import TeamRouter from "./routes/team/team.routes.js";
import HubSpotRouter from "./routes/integration/hubspot.routes.js";
import ZoomRouter from "./routes/integration/zoom.routes.js";
import QaiBotRouter from "./routes/qai/qai.routes.js";
import CampaignRouter from "./routes/campaign/campaign.routes.js";
import CrmRouter from "./routes/crm/crm.routes.js";

export function setRoutes(app) {
    app.get("/ping", (req, res) => {
        return res.sendStatus(200);
    });
    app.use("/api/google/auth", GoogleAuthRoutes);
    app.use("/api/auth", AuthRoutes);
    app.use("/api/test", TestRouter);
    app.use("/api/user", UserRouter);
    app.use("/api/account", AccountRouter);
    app.use("/api/team", TeamRouter);
    app.use("/api/hubspot", HubSpotRouter);
    app.use("/api/zoom", ZoomRouter);
    app.use("/api/qai", QaiBotRouter);
    app.use("/api/campaign", CampaignRouter);
    app.use("/api/crm", CrmRouter);
}
