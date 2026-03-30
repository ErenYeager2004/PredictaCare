import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

const Login = () => {
  const { token, setToken, backendUrl } = useContext(AppContext)
  const navigate = useNavigate()

  const [state, setState] = useState('Sign Up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [dataConsent, setDataConsent] = useState(null) // null = not decided yet

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev)

  // Called when Create Account button is clicked
  const handleSignUpClick = (event) => {
    event.preventDefault()
    if (state === 'Sign Up') {
      setShowConsentModal(true) // show popup before registering
    } else {
      submitLogin()
    }
  }

  const submitLogin = async () => {
    try {
      const { data } = await axios.post(backendUrl + '/api/user/login', { password, email })
      if (data.success) {
        setToken(data.token)
        toast.success('Logged in successfully!')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const submitRegister = async (consent) => {
    setShowConsentModal(false)
    setDataConsent(consent)
    try {
      const { data } = await axios.post(backendUrl + '/api/user/register', {
        name, password, email,
        dataConsent: consent,
      })
      if (data.success) {
        setToken(data.token)
        toast.success('Account created successfully!')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (token) navigate('/')
  }, [token])

  return (
    <>
      {/* ── Consent Modal ─────────────────────────────────────────────── */}
      {showConsentModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center'
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        >
          <div className='bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center gap-4'>
            {/* Icon */}
            <div className='w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-3xl'>
              🔬
            </div>

            <div>
              <p className='text-lg font-bold text-gray-800 mb-1'>Help advance medical research</p>
              <p className='text-sm text-gray-500 leading-relaxed'>
                Would you like to share your <span className='font-semibold text-gray-700'>anonymised</span> prediction data with verified researchers?
                <br /><br />
                <span className='text-xs text-gray-400'>No personal info (name, email, image) is ever shared. You can change this anytime in your profile.</span>
              </p>
            </div>

            {/* Buttons */}
            <div className='w-full flex flex-col gap-2 mt-1'>
              <button
                onClick={() => submitRegister(true)}
                className='w-full py-2.5 rounded-xl text-sm font-semibold text-white'
                style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}
              >
                ✅ Yes, I'm happy to contribute
              </button>
              <button
                onClick={() => submitRegister(false)}
                className='w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 bg-gray-50 hover:bg-gray-100'
              >
                No thanks, skip this
              </button>
            </div>

            <a href='/research' target='_blank' className='text-xs text-blue-500 underline'>
              Learn how your data is used →
            </a>
          </div>
        </div>
      )}

      {/* ── Login / Sign Up Form ───────────────────────────────────────── */}
      <form onSubmit={handleSignUpClick} className='min-h-[80vh] flex items-center'>
        <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border border-gray-200 rounded-xl text-zinc-600 text-sm shadow-lg'>
          <p className='text-2xl font-semibold'>{state === "Sign Up" ? "Create Account" : "Login"}</p>
          <p>Please {state === 'Sign Up' ? "sign up" : "log in"} to book an appointment</p>

          {state === "Sign Up" && (
            <div className='w-full'>
              <p>Full Name</p>
              <input className='border border-zinc-300 rounded w-full p-2 mt-1' type="text" onChange={(e) => setName(e.target.value)} value={name} required />
            </div>
          )}

          <div className='w-full'>
            <p>Email</p>
            <input className='border border-zinc-300 rounded w-full p-2 mt-1' type="email" onChange={(e) => setEmail(e.target.value)} value={email} required />
          </div>

          <div className='w-full relative'>
            <p>Password</p>
            <div className="relative w-full">
              <input
                className='border border-zinc-300 rounded w-full p-2 mt-1 pr-12'
                type={showPassword ? "text" : "password"}
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
              />
              <span
                className="absolute inset-y-0 right-3 flex items-center cursor-pointer text-gray-500 hover:text-gray-700"
                onClick={togglePasswordVisibility}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} size="lg" />
              </span>
            </div>
          </div>

          <button type='submit' className='bg-[#5f6FFF] text-white w-full py-2 rounded-md text-base'>
            {state === "Sign Up" ? "Create Account" : "Login"}
          </button>

          {state === "Sign Up" ? (
            <p>Already have an account? <span onClick={() => setState('Login')} className='text-[#5f6FFF] underline cursor-pointer'>Login here</span></p>
          ) : (
            <p>Create a new account? <span onClick={() => setState('Sign Up')} className='text-[#5f6FFF] underline cursor-pointer'>Click here</span></p>
          )}
        </div>
      </form>
    </>
  )
}

export default Login
