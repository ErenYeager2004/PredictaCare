import express from 'express';
import { 
    addDoctor, 
    allDoctors, 
    loginAdmin, 
    appointmentsAdmin, 
    cancelAppointmentAdmin, 
    adminDashboard, 
    getPredictions, 
    sendForReview 
} from '../controllers/adminController.js';
import upload from '../middlewares/multer.js';
import authAdmin from '../middlewares/authAdmin.js';
import { changeAvailablity } from '../controllers/doctorController.js';

const adminRouter = express.Router();

adminRouter.post('/add-doctor', authAdmin, upload.single('image'), addDoctor);
adminRouter.post('/login', loginAdmin);
adminRouter.post('/all-doctors', authAdmin, allDoctors);
adminRouter.post('/change-availability', authAdmin, changeAvailablity);
adminRouter.get('/appointments', authAdmin, appointmentsAdmin);
adminRouter.post('/cancel-appointment', authAdmin, cancelAppointmentAdmin);
adminRouter.get('/dashboard', authAdmin, adminDashboard);

// ✅ New Routes for Predictions
adminRouter.get('/predictions', authAdmin, getPredictions);
adminRouter.post('/send-review/:predictionId', authAdmin, sendForReview);

export default adminRouter;