import React, { useContext, useState } from 'react'
import { ResearchContext } from '../context/ResearchContext'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

const Login = () => {
  const { login } = useContext(ResearchContext)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    setLoading(true)
    const success = await login(email, password)
    if (success) navigate('/datasets')
    setLoading(false)
  }

  return (
    <form onSubmit={onSubmitHandler} className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FD]">

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

      {/* Card - identical structure to admin Login */}
      <div className="flex flex-col gap-3 items-start p-8 min-w-[340px] sm:min-w-96 border border-gray-200 rounded-xl text-[#5E5E5E] text-sm shadow-lg bg-white">
        <p className="text-2xl font-semibold m-auto">
          <span className="text-[#5F6FFF]">Researcher</span> Login
        </p>

        <div className="w-full">
          <p>Email</p>
          <input
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            className="border border-[#DADADA] rounded w-full p-2 mt-1 focus:outline-none focus:border-[#5F6FFF]"
            type="email"
            placeholder="your@email.com"
            required
          />
        </div>

        <div className="w-full relative">
          <p>Password</p>
          <div className="relative w-full">
            <input
              className="border border-zinc-300 rounded w-full p-2 mt-1 pr-12 focus:outline-none focus:border-[#5F6FFF]"
              type={showPassword ? 'text' : 'password'}
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              placeholder="••••••••"
              required
            />
            <span
              className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-500 hover:text-gray-700 mt-1"
              onClick={() => setShowPassword((p) => !p)}
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} size="lg" />
            </span>
          </div>
        </div>

        <button
          disabled={loading}
          className="bg-[#5F6FFF] text-white w-full py-2 rounded-md text-base hover:bg-[#4a57e8] transition-colors disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>

        <p>
          New researcher?{' '}
          <span
            className="text-[#5F6FFF] underline cursor-pointer"
            onClick={() => navigate('/register')}
          >
            Create an account
          </span>
        </p>
      </div>
    </form>
  )
}

export default Login
