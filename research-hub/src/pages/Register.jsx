import React, { useContext, useState } from 'react'
import { ResearchContext } from '../context/ResearchContext'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

const Register = () => {
  const { register } = useContext(ResearchContext)
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', institution: '', researchArea: ''
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    setLoading(true)
    const success = await register(form)
    if (success) navigate('/datasets')
    setLoading(false)
  }

  return (
    <form onSubmit={onSubmitHandler} className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FD] py-10">

      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[#5F6FFF] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
        </div>
        <span className="text-gray-900 font-semibold text-xl">PredictaCare</span>
        <span className="text-[#5F6FFF] font-semibold text-xl">Research Hub</span>
      </div>

      {/* Card */}
      <div className="flex flex-col gap-3 items-start p-8 min-w-[340px] sm:min-w-96 border border-gray-200 rounded-xl text-[#5E5E5E] text-sm shadow-lg bg-white">
        <p className="text-2xl font-semibold m-auto">
          <span className="text-[#5F6FFF]">Create</span> Account
        </p>

        <div className="w-full">
          <p>Full Name</p>
          <input
            onChange={set('name')} value={form.name}
            className="border border-[#DADADA] rounded w-full p-2 mt-1 focus:outline-none focus:border-[#5F6FFF]"
            type="text" placeholder="Dr. Priya Sharma" required
          />
        </div>

        <div className="w-full">
          <p>Email</p>
          <input
            onChange={set('email')} value={form.email}
            className="border border-[#DADADA] rounded w-full p-2 mt-1 focus:outline-none focus:border-[#5F6FFF]"
            type="email" placeholder="your@email.com" required
          />
        </div>

        <div className="w-full relative">
          <p>Password</p>
          <div className="relative w-full">
            <input
              className="border border-zinc-300 rounded w-full p-2 mt-1 pr-12 focus:outline-none focus:border-[#5F6FFF]"
              type={showPassword ? 'text' : 'password'}
              onChange={set('password')} value={form.password}
              placeholder="At least 8 characters" required
            />
            <span
              className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-500 hover:text-gray-700 mt-1"
              onClick={() => setShowPassword((p) => !p)}
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} size="lg" />
            </span>
          </div>
        </div>

        <div className="w-full">
          <p>Institution / Organisation</p>
          <input
            onChange={set('institution')} value={form.institution}
            className="border border-[#DADADA] rounded w-full p-2 mt-1 focus:outline-none focus:border-[#5F6FFF]"
            type="text" placeholder="AIIMS Delhi, IIT Bombay..." required
          />
        </div>

        <div className="w-full">
          <p>Research Area <span className="text-gray-400">(optional)</span></p>
          <select
            onChange={set('researchArea')} value={form.researchArea}
            className="border border-[#DADADA] rounded w-full p-2 mt-1 focus:outline-none focus:border-[#5F6FFF] bg-white"
          >
            <option value="">Select area</option>
            <option>Cardiology</option>
            <option>Endocrinology</option>
            <option>Gynaecology</option>
            <option>Neurology</option>
            <option>Epidemiology</option>
            <option>Machine Learning / AI</option>
            <option>Public Health</option>
            <option>Other</option>
          </select>
        </div>

        <button
          disabled={loading}
          className="bg-[#5F6FFF] text-white w-full py-2 rounded-md text-base hover:bg-[#4a57e8] transition-colors disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p>
          Already have an account?{' '}
          <span
            className="text-[#5F6FFF] underline cursor-pointer"
            onClick={() => navigate('/')}
          >
            Login here
          </span>
        </p>
      </div>
    </form>
  )
}

export default Register
