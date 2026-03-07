import express from 'express'

import { registerUser,loginUser, getProfile,updateProfile,bookAppointment,listAppointment,cancelAppointment,paymentRazorpay,verifyRazorpay, refreshAccessToken} from '../controllers/userController.js'
import authUser from '../middlewares/authUser.js'
import upload from '../middlewares/multer.js'
import authLimiter from '../middlewares/authLimiter.js'

const userRouter = express.Router()

userRouter.post('/register',authLimiter, registerUser)
userRouter.post('/login',authLimiter, loginUser)
userRouter.get('/get-profile',authUser,getProfile)
userRouter.post('/update-profile',upload.single('image'),authUser,updateProfile)
userRouter.post('/book-appointment',authUser,bookAppointment)
userRouter.get('/appointments',authUser,listAppointment)
userRouter.post('/cancel-appointment',authUser,cancelAppointment)
userRouter.post('/payment-razorpay', authUser, paymentRazorpay)

userRouter.post('/verifyRazorpay',authUser,verifyRazorpay)

userRouter.post('/refresh-token', refreshAccessToken);

export default userRouter
