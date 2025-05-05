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
import AgentRouter from "./routes/agents/agent.routes.js";
import CompanyRouter from "./routes/crm/company.routes.js";
import ContactRouter from "./routes/crm/contact.routes.js";
import OpportunityRouter from "./routes/crm/opportunity.routes.js";
import ResellerRouter from "./routes/crm/reseller.routes.js";

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
    app.use("/api/agent", AgentRouter);
    app.use("/api/crm/company", CompanyRouter);
    app.use("/api/crm/contact", ContactRouter);
    app.use("/api/crm/opportunity", OpportunityRouter);
    app.use("/api/crm/reseller", ResellerRouter);
}
