import React, { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import axios from 'axios'
import { toast } from 'react-toastify'

const MyProfile = () => {

  const { userData, setUserData, token, backendUrl, loadUserProfileData } = useContext(AppContext)

  const [isEdit, setIsEdit] = useState(false)
  const [image, setImage] = useState(false)
  const [consentLoading, setConsentLoading] = useState(false)

  const updateUserProfileData = async () => {
    try {
      const formData = new FormData()
      formData.append('name', userData.name)
      formData.append('phone', userData.phone)
      formData.append('address', JSON.stringify(userData.address))
      formData.append('gender', userData.gender)
      formData.append('dob', userData.dob)
      image && formData.append('image', image)

      const { data } = await axios.post(backendUrl + '/api/user/update-profile', formData, { headers: { token } })

      if (data.success) {
        toast.success(data.message)
        await loadUserProfileData()
        setIsEdit(false)
        setImage(false)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const toggleConsent = async () => {
    setConsentLoading(true)
    try {
      const newConsent = !userData.dataConsent
      const { data } = await axios.post(
        backendUrl + '/api/user/update-consent',
        { dataConsent: newConsent },
        { headers: { token } }
      )
      if (data.success) {
        setUserData(prev => ({ ...prev, dataConsent: newConsent }))
        toast.success(newConsent ? 'Research consent enabled' : 'Research consent withdrawn')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setConsentLoading(false)
    }
  }

  return userData && (
    <div className='max-w-lg flex flex-col gap-2 text-sm'>

      {isEdit
        ? <label htmlFor='image'>
          <div className='inline-block relative cursor-pointer'>
            <img className='w-36 rounded opacity-75' src={image ? URL.createObjectURL(image) : userData.image} alt="" />
            <img className='w-10 absolute bottom-12 right-12' src={image ? '' : assets.upload_icon} alt="" />
          </div>
          <input onChange={(e) => setImage(e.target.files[0])} type="file" id="image" hidden />
        </label>
        : <img className='w-36 rounded' src={userData.image} alt="" />
      }

      {isEdit
        ? <input className='bg-gray-50 text-3xl font-medium max-w-60 mt-4' type="text" value={userData.name} onChange={e => setUserData(prev => ({ ...prev, name: e.target.value }))} />
        : <p className='font-medium text-3xl text-neutral-800 mt-4'>{userData.name}</p>
      }

      <hr className='bg-zinc-400 h-[1px] border-none' />

      {/* ── Contact Information ──────────────────────────────────────────── */}
      <div>
        <p className='text-neutral-500 underline mt-3'>CONTACT INFORMATION</p>
        <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-neutral-700'>
          <p className='font-medium'>Email id:</p>
          <p className='text-blue-500'>{userData.email}</p>
          <p className='font-medium'>Phone:</p>
          {isEdit
            ? <input className='bg-gray-100 max-w-52' type="text" value={userData.phone} onChange={e => setUserData(prev => ({ ...prev, phone: e.target.value }))} />
            : <p className='text-blue-400'>{userData.phone}</p>
          }
          <p className='font-medium'>Address:</p>
          {isEdit
            ? <p>
              <input className='bg-gray-50' onChange={(e) => setUserData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))} value={userData.address.line1} type="text" />
              <br />
              <input className='bg-gray-50' onChange={(e) => setUserData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))} value={userData.address.line2} type="text" />
            </p>
            : <p className='text-gray-500'>{userData.address.line1}<br />{userData.address.line2}</p>
          }
        </div>
      </div>

      {/* ── Basic Information ────────────────────────────────────────────── */}
      <div>
        <p className='text-neutral-500 underline mt-3'>BASIC INFORMATION</p>
        <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-neutral-700'>
          <p className='font-medium'>Gender:</p>
          {isEdit
            ? <select className='max-w-20 bg-gray-100' onChange={(e) => setUserData(prev => ({ ...prev, gender: e.target.value }))} value={userData.gender}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            : <p className='text-gray-400'>{userData.gender}</p>
          }
          <p className='font-medium'>Birthday:</p>
          {isEdit
            ? <input className='max-w-28 bg-gray-100' type='date' onChange={(e) => setUserData(prev => ({ ...prev, dob: e.target.value }))} value={userData.dob} />
            : <p className='text-gray-400'>{userData.dob}</p>
          }
        </div>
      </div>

      {/* ── Research Consent ─────────────────────────────────────────────── */}
      <div>
        <p className='text-neutral-500 underline mt-3'>RESEARCH DATA</p>
        <div className='mt-3 flex items-start justify-between gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4'>
          <div className='flex-1'>
            <p className='font-medium text-neutral-700 mb-1'>Share anonymised prediction data</p>
            <p className='text-gray-400 text-xs leading-relaxed'>
              Help advance medical research by sharing your anonymised prediction data with verified researchers.
              No personal information (name, email, photo) is ever shared.
            </p>
            {userData.dataConsent
              ? <p className='text-green-600 text-xs font-semibold mt-2'>✅ Currently contributing to research</p>
              : <p className='text-gray-400 text-xs mt-2'>❌ Not contributing</p>
            }
          </div>
          {/* Toggle switch */}
          <button
            onClick={toggleConsent}
            disabled={consentLoading}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${userData.dataConsent ? 'bg-green-500' : 'bg-gray-300'} ${consentLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${userData.dataConsent ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* ── Buttons ──────────────────────────────────────────────────────── */}
      <div className='mt-10'>
        {isEdit
          ? <button className='border border-[#5f6FFF] px-8 py-2 rounded-full hover:bg-[#5f6FFF] hover:text-white transition-all' onClick={updateUserProfileData}>Save information</button>
          : <button className='border border-[#5f6FFF] px-8 py-2 rounded-full hover:bg-[#5f6FFF] hover:text-white transition-all' onClick={() => setIsEdit(true)}>Edit</button>
        }
      </div>
    </div>
  )
}

export default MyProfile
