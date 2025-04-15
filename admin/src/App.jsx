import React, { useContext, useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Admin/Dashboard';
import AllAppointments from './pages/Admin/AllAppointments';
import AddDoctor from './pages/Admin/AddDoctor';
import DoctorList from './pages/Admin/DoctorList';
import Review from './pages/Admin/AdminReviewPage';
import DoctorDashboard from './pages/Doctor/DoctorDashboard';
import DoctorAppointment from './pages/Doctor/DoctorAppointment';
import DoctorProfile from './pages/Doctor/DoctorProfile';
import DoctorReview from './pages/Doctor/DoctorReviewPage';

import { AdminContext } from './context/AdminContext';
import { DoctorContext } from './context/DoctorContext';

// ProtectedRoute component for role-based access
const ProtectedRoute = ({ requiredRole, children }) => {
  if (!requiredRole) {
    return <Navigate to="/login" />;  // Redirect to login if no role is found
  }
  return children;  // Allow access if role matches
};

const App = () => {
  const { aToken, userRole } = useContext(AdminContext);  // Assuming 'userRole' is set here
  const { dToken } = useContext(DoctorContext);

  // If no tokens (both admin and doctor tokens missing), show login
  if (!aToken && !dToken) {
    return (
      <>
        <Login />
        <ToastContainer />
      </>
    );
  }

  // If there is a token, show the correct dashboard based on the role
  return (
    <div className="bg-[#F8F9FD]">
      <ToastContainer />
      <Navbar />
      <div className="flex items-start">
        <Sidebar />
        <Routes>
          {/* Redirect root to dashboard for admin or doctor */}
          <Route
            path="/"
            element={<Navigate to={userRole === 'admin' ? '/admin-dashboard' : '/doctor-dashboard'} />}
          />

          {/* Admin Routes */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/all-appointments"
            element={
              <ProtectedRoute requiredRole="admin">
                <AllAppointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-doctor"
            element={
              <ProtectedRoute requiredRole="admin">
                <AddDoctor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor-list"
            element={
              <ProtectedRoute requiredRole="admin">
                <DoctorList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <ProtectedRoute requiredRole="admin">
                <Review />
              </ProtectedRoute>
            }
          />

          {/* Doctor Routes */}
          <Route
            path="/doctor-dashboard"
            element={
              <ProtectedRoute requiredRole="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor-appointments"
            element={
              <ProtectedRoute requiredRole="doctor">
                <DoctorAppointment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor-review"
            element={
              <ProtectedRoute requiredRole="doctor">
                <DoctorReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor-profile"
            element={
              <ProtectedRoute requiredRole="doctor">
                <DoctorProfile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
};

export default App;
