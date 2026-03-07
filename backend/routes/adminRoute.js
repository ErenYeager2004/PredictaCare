import express from 'express';
import {
    addDoctor,
    allDoctors,
    loginAdmin,
    appointmentsAdmin,
    cancelAppointmentAdmin,
    adminDashboard,
    getPredictions,
    sendForReview,
    deletePrediction,
    uploadToBlockchain,
    handleDelete,
    refreshAdminToken,
    logoutAdmin
} from '../controllers/adminController.js';
import upload from '../middlewares/multer.js';
import authAdmin from '../middlewares/authAdmin.js';
import { changeAvailablity } from '../controllers/doctorController.js';
import authLimiter from '../middlewares/authLimiter.js';

const adminRouter = express.Router();

adminRouter.post('/add-doctor', authAdmin, upload.single('image'), addDoctor);
adminRouter.post('/login',authLimiter, loginAdmin);
adminRouter.post('/all-doctors', authAdmin, allDoctors);
adminRouter.post('/change-availability', authAdmin, changeAvailablity);
adminRouter.get('/appointments', authAdmin, appointmentsAdmin);
adminRouter.post('/cancel-appointment', authAdmin, cancelAppointmentAdmin);
adminRouter.get('/dashboard', authAdmin, adminDashboard);

// ✅ New Routes for Predictions
adminRouter.get('/predictions', authAdmin, getPredictions);
adminRouter.post('/send-review/:predictionId', authAdmin, sendForReview);
adminRouter.post("/upload-to-blockchain", authAdmin, uploadToBlockchain);
adminRouter.delete('/delete/:predictionId', authAdmin, deletePrediction);
adminRouter.delete('/handle-delete/:predictionId', authAdmin, handleDelete);
adminRouter.post('/refresh-token', refreshAdminToken);
adminRouter.post('/logout', logoutAdmin);
export default adminRouter;
