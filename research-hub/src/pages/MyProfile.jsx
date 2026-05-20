import React, { useContext, useEffect, useState } from 'react'
import { ResearchContext } from '../context/ResearchContext'

const MyProfile = () => {
  const { userData, updateProfile, loadProfile } = useContext(ResearchContext)
  const [isEdit, setIsEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', institution: '', researchArea: ''
  })

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (userData) {
      setForm({
        name: userData.name || '',
        institution: userData.institution || '',
        researchArea: userData.researchArea || '',
      })
    }
  }, [userData])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    const success = await updateProfile(form)
    if (success) setIsEdit(false)
    setSaving(false)
  }

  if (!userData) {
    return (
      <div className="p-6 sm:p-10">
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-10 max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">My Profile</h1>

      {/* Avatar block */}
      <div className="flex items-center gap-5 mb-6 p-5 bg-[#eef0ff] rounded-xl">
        <div className="w-16 h-16 rounded-xl bg-[#5F6FFF] flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
          {userData.name?.[0]?.toUpperCase() || 'R'}
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{userData.name}</p>
          <p className="text-sm text-gray-500">{userData.email}</p>
          {userData.institution && (
            <p className="text-sm text-[#5F6FFF] font-medium mt-0.5">{userData.institution}</p>
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm flex flex-col gap-4">

        {/* Name */}
        <div className="grid grid-cols-[130px_1fr] items-center gap-4">
          <p className="font-medium text-[#363636]">Full Name</p>
          {isEdit
            ? <input
                value={form.name} onChange={set('name')}
                className="border border-[#DADADA] rounded px-3 py-1.5 w-full focus:outline-none focus:border-[#5F6FFF]"
              />
            : <p className="text-[#464646]">{userData.name}</p>
          }
        </div>

        <hr className="border-gray-100" />

        {/* Email (read-only) */}
        <div className="grid grid-cols-[130px_1fr] items-center gap-4">
          <p className="font-medium text-[#363636]">Email</p>
          <p className="text-[#5F6FFF]">{userData.email}</p>
        </div>

        <hr className="border-gray-100" />

        {/* Institution */}
        <div className="grid grid-cols-[130px_1fr] items-center gap-4">
          <p className="font-medium text-[#363636]">Institution</p>
          {isEdit
            ? <input
                value={form.institution} onChange={set('institution')}
                className="border border-[#DADADA] rounded px-3 py-1.5 w-full focus:outline-none focus:border-[#5F6FFF]"
                placeholder="Your institution"
              />
            : <p className="text-[#464646]">{userData.institution || '—'}</p>
          }
        </div>

        <hr className="border-gray-100" />

        {/* Research Area */}
        <div className="grid grid-cols-[130px_1fr] items-center gap-4">
          <p className="font-medium text-[#363636]">Research Area</p>
          {isEdit
            ? <select
                value={form.researchArea} onChange={set('researchArea')}
                className="border border-[#DADADA] rounded px-3 py-1.5 w-full focus:outline-none focus:border-[#5F6FFF] bg-white"
              >
                <option value="">Select area</option>
                {['Cardiology','Endocrinology','Gynaecology','Neurology','Epidemiology','Machine Learning / AI','Public Health','Other'].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            : <p className="text-[#464646]">{userData.researchArea || '—'}</p>
          }
        </div>

        <hr className="border-gray-100" />

        {/* Member since */}
        <div className="grid grid-cols-[130px_1fr] items-center gap-4">
          <p className="font-medium text-[#363636]">Member Since</p>
          <p className="text-[#464646]">
            {userData.createdAt
              ? new Date(userData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : '—'}
          </p>
        </div>

        {/* Buttons */}
        <div className="pt-2">
          {isEdit ? (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#5F6FFF] text-white px-8 py-2 rounded-full text-sm hover:bg-[#4a57e8] transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Information'}
              </button>
              <button
                onClick={() => setIsEdit(false)}
                className="border border-gray-300 px-8 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEdit(true)}
              className="border border-[#5F6FFF] text-[#5F6FFF] px-8 py-2 rounded-full text-sm hover:bg-[#eef0ff] transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyProfile
