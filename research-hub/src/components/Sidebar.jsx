import React from 'react'
import { NavLink } from 'react-router-dom'

const Sidebar = () => {
  const navClass = ({ isActive }) =>
    `flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-72 cursor-pointer transition-colors ${
      isActive ? 'bg-[#F2F3FF] border-r-4 border-[#5F6FFF]' : 'hover:bg-gray-50'
    }`

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white border-r border-gray-200 sticky top-16">
      <ul className="text-[#515151] mt-5">

        <NavLink className={navClass} to="/datasets">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
          <p className="hidden md:block">Datasets</p>
        </NavLink>

        <NavLink className={navClass} to="/my-orders">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <p className="hidden md:block">My Datasets</p>
        </NavLink>

        <NavLink className={navClass} to="/download">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <p className="hidden md:block">Download</p>
        </NavLink>

        <NavLink className={navClass} to="/my-profile">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <p className="hidden md:block">My Profile</p>
        </NavLink>

      </ul>
    </div>
  )
}

export default Sidebar
