import React, { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const MyAppointments = () => {
  const { backendUrl, token, getDoctorsData } = useContext(AppContext);
  const navigate = useNavigate();

  const months = useMemo(
    () => [" ", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    []
  );

  const slotDateFormat = (slotDate) => {
    const dateArray = slotDate.split("_");
    const m = Number(dateArray[1]);
    return `${dateArray[0]} ${months[m]} ${dateArray[2]}`;
  };

  const [appointments, setAppointments] = useState([]);
  const [loadingRzp, setLoadingRzp] = useState(false);

  // --- Load Razorpay script safely ---
  const loadRazorpay = async () => {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      setLoadingRzp(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        setLoadingRzp(false);
        resolve(true);
      };
      script.onerror = () => {
        setLoadingRzp(false);
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const getUserAppointments = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/appointments`, {
        headers: { token },
      });
      if (data.success) {
        // newest first (also sorted at backend)
        setAppointments((data.appointments || []).slice().reverse());
      } else {
        toast.error(data.message || "Failed to fetch appointments");
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/cancel-appointment`,
        { appointmentId },
        { headers: { token } }
      );

      if (data.success) {
        toast.success(data.message || "Appointment cancelled");
        getUserAppointments();
        getDoctorsData();
      } else {
        toast.error(data.message || "Unable to cancel");
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  const openRazorpay = (order) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID, // PUBLIC key
      name: "Appointment Payment",
      description: "Appointment Payment",
      // When using order_id, DO NOT pass amount/currency here
      order_id: order.id,
      handler: async (response) => {
        // response: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
        try {
          const verifyData = {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            // optional, backend uses order.receipt but sending helps for auditing
            appointmentId: order.receipt,
          };

          const { data } = await axios.post(
            `${backendUrl}/api/user/verifyRazorpay`,
            verifyData,
            { headers: { token } }
          );

          if (data.success) {
            toast.success("Payment successful");
            getUserAppointments();
            navigate("/my-appointments");
          } else {
            toast.error(data.message || "Payment verification failed");
          }
        } catch (error) {
          console.error(error);
          toast.error(error?.response?.data?.message || "Verification error");
        }
      },
      modal: {
        ondismiss: () => {
          toast.info("Payment popup closed");
        },
      },
      notes: {
        context: "Appointment payment",
      },
      theme: {
        // keep default colors unless you want to set brand colors
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (resp) {
      console.error(resp?.error);
      toast.error(resp?.error?.description || "Payment failed");
    });
    rzp.open();
  };

  const appointmentRazorpay = async (appointmentId) => {
    try {
      const ok = await loadRazorpay();
      if (!ok) {
        toast.error("Failed to load Razorpay. Check your network.");
        return;
      }
      const { data } = await axios.post(
        `${backendUrl}/api/user/payment-razorpay`,
        { appointmentId },
        { headers: { token } }
      );
      if (data.success && data.order) {
        openRazorpay(data.order);
      } else {
        toast.error(data.message || "Unable to initiate payment");
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (token) getUserAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div>
      <p className="pb-3 mt-12 font-medium text-zinc-700 border-b border-gray-200">
        My Appointments
      </p>

      {loadingRzp && (
        <div className="text-sm text-zinc-500 mb-2">Loading payment module…</div>
      )}

      <div>
        {appointments.slice(0, 5).map((item, index) => (
          <div
            className="grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-2 border-b border-gray-200"
            key={item._id || index}
          >
            <div>
              <img className="w-32 bg-indigo-50" src={item.docData?.image} alt="" />
            </div>

            <div className="flex-1 text-sm text-zinc-600">
              <p className="text-neutral-800 font-semibold">{item.docData?.name}</p>
              <p>{item.docData?.speciality}</p>
              <p className="text-zinc-700 font-medium mt-1">Address:</p>
              <p className="text-xs">{item.docData?.address?.line1}</p>
              <p className="text-xs">{item.docData?.address?.line2}</p>
              <p className="text-xs mt-1">
                <span className="text-sm text-neutral-700 font-medium">Date &amp; Time:</span>{" "}
                {slotDateFormat(item.slotDate)} | {item.slotTime}
              </p>
            </div>

            <div className="flex flex-col gap-2 justify-end">
              {!item.cancelled && item.payment && !item.isCompleted && (
                <button
                  className="sm:min-w-48 py-2 border border-gray-200 rounded text-stone-500 bg-indigo-50"
                  disabled
                >
                  Paid
                </button>
              )}

              {!item.cancelled && !item.payment && !item.isCompleted && (
                <button
                  onClick={() => appointmentRazorpay(item._id)}
                  className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border border-gray-200 rounded hover:bg-[#5f6FFF] hover:text-white transition-all duration-300"
                >
                  Pay Online
                </button>
              )}

              {!item.cancelled && !item.isCompleted && (
                <button
                  onClick={() => cancelAppointment(item._id)}
                  className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border border-gray-200 rounded hover:bg-red-600 hover:text-white transition-all duration-300"
                >
                  Cancel Appointment
                </button>
              )}

              {item.cancelled && !item.isCompleted && (
                <button className="sm:min-w-48 py-2 border border-red-500 rounded text-red-500" disabled>
                  Appointment Cancelled
                </button>
              )}

              {item.isCompleted && (
                <button className="sm:min-w-48 py-2 border border-green-500 rounded text-green-500" disabled>
                  Completed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyAppointments;