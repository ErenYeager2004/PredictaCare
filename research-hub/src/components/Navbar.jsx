import React, { useContext } from 'react'
import { ResearchContext } from '../context/ResearchContext'
import { useNavigate } from 'react-router-dom'

const Navbar = () => {
  const { logout, userData } = useContext(ResearchContext)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex justify-between items-center px-4 sm:px-10 py-3 border-b border-gray-200 bg-white sticky top-0 z-40">
      {/* Logo & badge */}
      <div className="flex items-center gap-3 text-xs cursor-pointer" onClick={() => navigate('/datasets')}>
        <div className="flex items-center gap-2">
          {/* Brand logo mark */}
          <div className="w-8 h-8 rounded-lg bg-[#5F6FFF] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          </div>
          <div>
            <span className="text-gray-900 font-semibold text-base sm:text-lg">PredictaCare</span>
            <span className="text-[#5F6FFF] font-semibold text-base sm:text-lg ml-1">Research Hub</span>
          </div>
        </div>
        <p className="border px-2.5 py-0.5 rounded-full border-gray-400 text-gray-500 hidden sm:block">
          Researcher
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {userData && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
            <div className="w-8 h-8 rounded-full bg-[#5F6FFF] flex items-center justify-center text-white font-semibold text-sm">
              {userData.name?.[0]?.toUpperCase() || 'R'}
            </div>
            <span className="max-w-[150px] truncate">{userData.name}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="bg-[#5F6FFF] text-white text-sm px-6 sm:px-10 py-2 rounded-full hover:bg-[#4a57e8] transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default Navbar
