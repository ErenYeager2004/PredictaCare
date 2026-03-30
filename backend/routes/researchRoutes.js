import express from "express";
import {
  getDatasetStats,
  getDataPreview,
  createResearchOrder,
  verifyResearchPayment,
  downloadDataset,
  getAdminOrders,
  activateOrder,
  cancelOrder,
} from "../controllers/researchController.js";
import authAdmin from "../middlewares/authAdmin.js";

const researchRouter = express.Router();

researchRouter.get("/stats", getDatasetStats); // public
researchRouter.get("/preview", getDataPreview); // public
researchRouter.post("/order", createResearchOrder); // public (researcher registers)
researchRouter.post("/verify-payment", verifyResearchPayment);
researchRouter.get("/download", downloadDataset); // token-gated
researchRouter.get("/admin/orders", authAdmin, getAdminOrders);
researchRouter.post("/admin/activate", authAdmin, activateOrder);
researchRouter.post("/admin/cancel", authAdmin, cancelOrder);
export default researchRouter;
