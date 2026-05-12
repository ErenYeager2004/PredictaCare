/**
 * consultationRoutes.js
 * Copy to: backend/routes/consultationRoutes.js
 * Add to server.js:
 *   import consultationRouter from "./routes/consultationRoutes.js";
 *   app.use("/api/consultations", consultationRouter);
 */

import express from "express";
import authUser   from "../middlewares/authUser.js";
import authAdmin  from "../middlewares/authAdmin.js";
import authDoctor from "../middlewares/authDoctor.js";
import {
  bookConsultation,
  verifyConsultationPayment,
  getUserConsultations,
  getCallToken,
  completeConsultation,
  rateConsultation,
  cancelConsultation,
  getAdminConsultations,
  assignDoctor,
  getDoctorConsultations,
  doctorRespond,
} from "../controllers/consultationController.js";

const consultationRouter = express.Router();

// User routes
consultationRouter.post("/book",                  authUser,   bookConsultation);
consultationRouter.post("/verify-payment",        authUser,   verifyConsultationPayment);
consultationRouter.get("/my",                     authUser,   getUserConsultations);
// User joins call
consultationRouter.get("/token/:consultationId",         authUser,   getCallToken);

// ✅ Doctor joins call — add this line
consultationRouter.get("/doctor/token/:consultationId",  authDoctor, getCallToken);
consultationRouter.post("/complete",              authUser,   completeConsultation);
consultationRouter.post("/rate",                  authUser,   rateConsultation);
consultationRouter.post("/cancel",                authUser,   cancelConsultation);

// Admin routes
consultationRouter.get("/admin/all",              authAdmin,  getAdminConsultations);
consultationRouter.post("/admin/assign",          authAdmin,  assignDoctor);

// Doctor routes
consultationRouter.get("/doctor/my",              authDoctor, getDoctorConsultations);
consultationRouter.post("/doctor/respond",        authDoctor, doctorRespond);

export default consultationRouter;
