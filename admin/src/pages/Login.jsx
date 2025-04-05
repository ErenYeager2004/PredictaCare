import React, { useContext, useState } from 'react'
import { assets } from '../assets/assets'
import { AdminContext } from '../context/AdminContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { DoctorContext } from '../context/DoctorContext'
import {useNavigate} from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

const Login = () => {
  const [state, setState] = useState('Admin')
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const {setAToken,backendUrl} = useContext(AdminContext)
  const {setDToken} = useContext(DoctorContext)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev)
  }
  const onSubmitHandler = async (event)=>{
      event.preventDefault()

      try{

          if(state === 'Admin'){

            const {data} = await axios.post(backendUrl + '/api/admin/login',{email,password})
            if(data.success){
              localStorage.setItem('aToken',data.token)
              setAToken(data.token)
              navigate('/admin-dashboard')
            }else{
              toast.error(data.message)
            }
             
          }else{

            const {data} = await axios.post(backendUrl+'/api/doctor/login',{email,password})
            if(data.success){
              localStorage.setItem('dToken',data.token)
              setDToken(data.token)
              console.log(data.token)
              navigate('/doctor-profile')
            }else{
              toast.error(data.message)
            }

          }

      }catch(error){


      }
  }



  return (
    <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border border-gray-200 rounded-xl text-[#5E5E5E] text-sm shadow-lg'>

        <p className='text-2xl font-semibold m-auto'><span className='text-[#5F6FFF]'> {state} </span> Login</p>
        <div className='w-full'>
          <p>Email</p>
          <input onChange={(e)=>setEmail(e.target.value)} value={email} className='border border-[#DADADA] rounded w-full p-2 mt-1' type="email" required />
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

        <button className='bg-[#5F6FFF] text-white w-full py-2 rounded-md text-base'>Login</button>
        {
          state === 'Admin'
          ? <p>Doctor Login? <span className='text-[#5F6FFF] underline cursor-pointer' onClick={()=>setState('Doctor')}>Click here</span></p>
          : <p>Admin Login? <span className='text-[#5F6FFF] underline cursor-pointer' onClick={()=>setState('Admin')}>Click here</span></p>
        }
      
      </div>
    </form>
  )
}

export default Login