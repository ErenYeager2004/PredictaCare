import validator from "validator";
import bycrypt from 'bcrypt';
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import Razorpay from "razorpay";
import crypto from "crypto";

// -------------------- Auth --------------------

// api to register user
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !password || !email) {
      return res.json({ success: false, message: "Missing Details" })
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Enter a valid email" })
    }

    if (password.length < 8) {
      return res.json({ success: false, message: "Enter a strong password" })
    }

    // hashing user password

    const salt = await bycrypt.genSalt(10)
    const hashedPassword = await bycrypt.hash(password, salt)

    const userData = {
      name,
      email,
      password: hashedPassword
    }

    const newUser = new userModel(userData)
    const user = await newUser.save()

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

    res.json({ success: true, token })

  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

//api for user login

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await userModel.findOne({ email })

    if (!user) {
      return res.json({ success: false, message: "User does not exists" })
    }

    const isMatch = await bycrypt.compare(password, user.password)

    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
      res.json({ success: true, token })
    } else {
      res.json({ success: false, message: "Invalid Credentials" })
    }
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

// api to get user profile data

const getProfile = async (req, res) => {
    try {
        const { userId } = req.body
        const userData = await userModel.findById(userId).select('-password')
        res.json({ success: true, userData })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const updateProfile = async (req, res) => {
    try {
        const { userId, name, phone, address, dob, gender } = req.body
        const imageFile = req.file

        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing" })
        }

        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })

        if (imageFile) {

            //upload image to cloudinary

            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: 'image' })
            const imageUrl = imageUpload.secure_url

            await userModel.findByIdAndUpdate(userId, { image: imageUrl })
        }

        res.json({ success: true, message: "Profile Updated" })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const bookAppointment = async (req,res)=>{
    try {
        const {userId,docId,slotDate,slotTime} = req.body
        const docData = await doctorModel.findById(docId).select('-password')
        if (!docData.available) {
            return res.json({success:false,message:"Doctor not Avialable"})

        }
        let slots_booked = docData.slots_booked
        // checking for availability
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({success:false,message:"Slot not Avialable"})
            }else{
                slots_booked[slotDate].push(slotTime)
            }
        }else{
            slots_booked[slotDate]=[]
            slots_booked[slotDate].push(slotTime)
        }

        const userData = await userModel.findById(userId).select('-password')
        delete docData.slots_booked

        const appointmentData ={
            userId,
            docId,
            userData,
            docData,
            amount:docData.fees,
            slotTime,
            slotDate,
            date:Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()
        // save new slotes data 
        await doctorModel.findByIdAndUpdate(docId,{slots_booked})
        res.json({success:true,message:"Appointments Booked"})

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// api to get user appointment to get user appointment is 

const listAppointment = async (req,res)=>{
    try {
        const {userId} = req.body
        const appointments = await appointmentModel.find({userId})
        res.json({success:true,appointments})
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

//api to cancel appointment

const cancelAppointment = async (req,res)=>{
    try {
        const {userId,appointmentId} = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)
        // verify appointment user
        if (appointmentData.userId!==userId) {
            return res.json({success:false,message:"Unauthorized Action"})
        }

        await appointmentModel.findByIdAndUpdate(appointmentId,{cancelled:true})
        // releasing doctor slot

        const {docId,slotDate,slotTime} = appointmentData
        const doctorData = await doctorModel.findById(docId)
        let slots_booked = doctorData.slots_booked

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e!==slotTime)
        await doctorModel.findByIdAndUpdate(docId,{slots_booked})

        res.json({success:true,message:"Appointment Cancelled"})
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// -------------------- Razorpay --------------------

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,        // rzp_test_xxx
  key_secret: process.env.RAZORPAY_KEY_SECRET // test secret
});

// Create order
const paymentRazorpay = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    const { appointmentId } = req.body;

    if (!userId || !appointmentId) {
      return res.json({ success: false, message: "Missing data" });
    }

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData || appointmentData.cancelled) {
      return res.json({ success: false, message: "Appointment cancelled or not found" });
    }

    if (appointmentData.payment === true) {
      return res.json({ success: false, message: "Appointment already paid" });
    }

    const amountPaise = Math.round(Number(appointmentData.amount) * 100);
    const currency = process.env.CURRENCY || "INR";

    const order = await razorpayInstance.orders.create({
      amount: amountPaise,
      currency,
      receipt: appointmentId,
      notes: {
        userId: userId.toString(),
        docId: appointmentData.docId.toString(),
      },
    });

    return res.json({ success: true, order });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message });
  }
};

// Verify payment (client-side confirmation)
const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.json({ success: false, message: "Missing payment verification data" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.json({ success: false, message: "Signature verification failed" });
    }

    const order = await razorpayInstance.orders.fetch(razorpay_order_id);
    const appointmentId = order?.receipt;

    if (!appointmentId) {
      return res.json({ success: false, message: "Order receipt missing" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      payment: true,
      paymentInfo: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount: order.amount,
        currency: order.currency,
        status: "captured_or_authorized",
        createdAt: new Date(),
      },
    });

    return res.json({ success: true, message: "Payment verified successfully" });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: error.message });
  }
};

// Webhook verification (important for Render test mode)
const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // req.body is Buffer here
    const payload = req.body.toString();

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(payload);
    const digest = shasum.digest("hex");

    if (digest !== req.headers["x-razorpay-signature"]) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const data = JSON.parse(payload);
    const event = data.event;

    if (event === "payment.captured" || event === "payment.authorized") {
      const { order_id, id: paymentId } = data.payload.payment.entity;
      const order = await razorpayInstance.orders.fetch(order_id);
      const appointmentId = order?.receipt;

      if (appointmentId) {
        await appointmentModel.findByIdAndUpdate(appointmentId, {
          payment: true,
          paymentInfo: {
            orderId: order_id,
            paymentId,
            amount: order.amount,
            currency: order.currency,
            status: event,
            via: "webhook",
            createdAt: new Date(),
          },
        });
      }
    }

    res.json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  paymentRazorpay,
  verifyRazorpay,
  razorpayWebhook
};