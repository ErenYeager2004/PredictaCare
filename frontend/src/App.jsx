import React from 'react'
import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Doctors from './pages/Doctors';
import Login from './pages/Login';
import About from './pages/About';
import Contact from './pages/Contact';
import MyProfile from './pages/MyProfile';
import MyAppointments from './pages/MyAppointments';
import Appointment from './pages/Appointment';
import Navbar from './components/Navbar'
import Footer from './components/Footer';
import Bot from './components/Bot';
import Prediction from './pages/Prediction'
import AiSuggestion from './pages/AiSuggestions'
import ProtectedRoute from "./components/ProtectedRoute";
import {ToastContainer,toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const App = () => {
  return (
    <div className='mx-4 sm:mx-[10%]'>
      <ToastContainer/>
      <Navbar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/doctors' element={<Doctors />} />
        <Route path='/doctors/:speciality' element={<Doctors />} />
        <Route path='/login' element={<Login />} />
        <Route path='/about' element={<About />} />
        <Route path='/Contact' element={<Contact />} />
        <Route path='/my-profile' element={<MyProfile />} />
        <Route path='/my-appointments' element={<MyAppointments />} />
        <Route path='/appointment/:docId' element={<Appointment />} />
        <Route path='/prediction' element={<ProtectedRoute><Prediction /></ProtectedRoute>} />
        <Route path='/ai-suggestion' element={<AiSuggestion />} />
      </Routes>
      <Bot />
      <Footer />
    </div>
  )
}

export default App;