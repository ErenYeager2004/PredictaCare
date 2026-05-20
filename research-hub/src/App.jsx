import React, { useContext, useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { ResearchContext } from './context/ResearchContext'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Register from './pages/Register'
import Datasets from './pages/Datasets'
import DatasetDetail from './pages/DatasetDetail'
import MyProfile from './pages/MyProfile'
import MyOrders from './pages/MyOrders'
import Download from './pages/Download'

const App = () => {
  const { rToken, loadProfile } = useContext(ResearchContext)

  useEffect(() => {
    if (rToken) loadProfile()
  }, [rToken])

  return rToken ? (
    <div className="bg-[#F8F9FD] min-h-screen">
      <ToastContainer />
      <Navbar />
      <div className="flex items-start">
        <Sidebar />
        <div className="flex-1 min-h-[calc(100vh-64px)] overflow-auto">
          <Routes>
            <Route path="/"                element={<Datasets />} />
            <Route path="/datasets"        element={<Datasets />} />
            <Route path="/dataset/:disease" element={<DatasetDetail />} />
            <Route path="/my-profile"      element={<MyProfile />} />
            <Route path="/my-orders"       element={<MyOrders />} />
            <Route path="/download"        element={<Download />} />
          </Routes>
        </div>
      </div>
    </div>
  ) : (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="*"         element={<Login />} />
      </Routes>
    </>
  )
}

export default App
