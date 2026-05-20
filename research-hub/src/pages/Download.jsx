import React, { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResearchContext } from '../context/ResearchContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const Download = () => {
  const { rToken, backendUrl } = useContext(ResearchContext)
  const navigate = useNavigate()
  const [token, setToken]     = useState('')
  const [format, setFormat]   = useState('csv')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const handleDownload = async () => {
    if (!token.trim()) { toast.error('Please paste your access token'); return }
    setLoading(true)
    try {
      const res = await axios.get(
        `${backendUrl}/api/research-hub/download?token=${encodeURIComponent(token.trim())}&format=${format}`,
        { headers: { rtoken: rToken }, responseType: 'blob' }
      )
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([res.data]))
      link.download = `predictacare_dataset_${Date.now()}.${format}`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success('Dataset downloaded! Find it in My Datasets anytime.')
      setDone(true)
      setToken('')
    } catch (error) {
      const msg = error.response?.data?.message || error.message
      toast.error(msg || 'Download failed')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 sm:p-10 max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Download Dataset</h1>
      <p className="text-sm text-gray-500 mb-6">
        After purchasing, check your email for a <strong>10-minute access token</strong>.
        Paste it below to download your dataset.
      </p>

      {/* Success state */}
      {done && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-green-800">Download complete!</p>
            <p className="text-sm text-green-700 mt-0.5">
              Your dataset has been saved to your account permanently.
            </p>
            <button
              onClick={() => navigate('/my-orders')}
              className="text-sm text-green-700 underline mt-1 font-medium"
            >
              View in My Datasets →
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-5">

        {/* Token input */}
        <div>
          <label className="text-sm font-medium text-[#363636] block mb-1">
            Access Token
            <span className="text-xs text-orange-500 font-normal ml-2">⏱ Valid 10 minutes only</span>
          </label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the token from your email here…"
            rows={3}
            className="w-full border border-[#DADADA] rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#5F6FFF] resize-none"
          />
        </div>

        {/* Format */}
        <div>
          <label className="text-sm font-medium text-[#363636] block mb-2">Download Format</label>
          <div className="flex gap-3">
            {['csv', 'json'].map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 py-3 rounded-xl border-2 font-semibold uppercase text-sm transition-all ${
                  format === f
                    ? 'border-[#5F6FFF] bg-[#eef0ff] text-[#5F6FFF]'
                    : 'border-gray-100 text-gray-400 hover:border-gray-200'
                }`}
              >
                {f === 'csv' ? '📊 CSV' : '{ } JSON'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {format === 'csv' ? 'Best for Excel, pandas, R' : 'Best for APIs and programmatic use'}
          </p>
        </div>

        {/* Submit */}
        <button
          onClick={handleDownload}
          disabled={loading || !token.trim()}
          className="w-full py-3 rounded-xl bg-[#5F6FFF] hover:bg-[#4a57e8] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? 'Downloading...' : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Dataset
            </>
          )}
        </button>
      </div>

      {/* Info box */}
      <div className="mt-4 bg-[#eef0ff] border border-[#d4d8ff] rounded-xl p-4 text-xs text-[#4a57e8] leading-relaxed">
        <strong>ℹ️ After downloading:</strong> Your dataset is permanently saved to your account.
        Go to <span className="underline cursor-pointer" onClick={() => navigate('/my-orders')}>My Datasets</span> to re-download anytime, as many times as you need — no token required.
      </div>

      {/* Licence */}
      <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700 leading-relaxed">
        <strong>⚠️ Licence:</strong> For research purposes only.
        Redistribution, resale, or commercial use is strictly prohibited.
      </div>
    </div>
  )
}

export default Download
