import axios from 'axios'
import { createContext, useState, useCallback } from 'react'
import { toast } from 'react-toastify'

export const ResearchContext = createContext()

const ResearchContextProvider = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  const [rToken, setRToken] = useState(localStorage.getItem('rToken') || '')
  const [userData, setUserData] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/research-hub/login`, { email, password })
      if (data.success) {
        localStorage.setItem('rToken', data.token)
        setRToken(data.token)
        setUserData(data.user)
        toast.success('Welcome back, ' + data.user.name + '!')
        return true
      } else {
        toast.error(data.message)
        return false
      }
    } catch (error) {
      toast.error(error.message)
      return false
    }
  }

  const register = async (formData) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/research-hub/register`, formData)
      if (data.success) {
        localStorage.setItem('rToken', data.token)
        setRToken(data.token)
        setUserData(data.user)
        toast.success('Account created! Welcome, ' + data.user.name)
        return true
      } else {
        toast.error(data.message)
        return false
      }
    } catch (error) {
      toast.error(error.message)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('rToken')
    setRToken('')
    setUserData(null)
    setOrders([])
    toast.success('Logged out successfully')
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    if (!rToken) return
    try {
      const { data } = await axios.get(`${backendUrl}/api/research-hub/profile`, {
        headers: { rtoken: rToken }
      })
      if (data.success) setUserData(data.user)
    } catch (error) {
      console.error(error)
    }
  }, [rToken, backendUrl])

  const updateProfile = async (form) => {
    try {
      const { data } = await axios.put(`${backendUrl}/api/research-hub/profile`, form, {
        headers: { rtoken: rToken }
      })
      if (data.success) {
        setUserData(data.user)
        toast.success('Profile updated successfully')
        return true
      } else {
        toast.error(data.message)
        return false
      }
    } catch (error) {
      toast.error(error.message)
      return false
    }
  }

  // ── Datasets ──────────────────────────────────────────────────────────────
  const loadDatasets = useCallback(async (filters = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams(filters).toString()
      const { data } = await axios.get(`${backendUrl}/api/research-hub/datasets?${params}`)
      if (data.success) setDatasets(data.datasets)
    } catch (error) {
      toast.error(error.message)
    }
    setLoading(false)
  }, [backendUrl])

  const loadStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/research-hub/stats`)
      if (data.success) setStats(data.stats)
    } catch (error) {
      console.error(error)
    }
  }, [backendUrl])

  // ── Orders ────────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    if (!rToken) return
    try {
      const { data } = await axios.get(`${backendUrl}/api/research-hub/my-orders`, {
        headers: { rtoken: rToken }
      })
      if (data.success) setOrders(data.orders)
    } catch (error) {
      console.error(error)
    }
  }, [rToken, backendUrl])

  const createOrder = async (payload) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/research-hub/create-order`, payload, {
        headers: { rtoken: rToken }
      })
      return data
    } catch (error) {
      toast.error(error.message)
      return { success: false }
    }
  }

  const verifyPayment = async (payload) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/research-hub/verify-payment`, payload, {
        headers: { rtoken: rToken }
      })
      return data
    } catch (error) {
      toast.error(error.message)
      return { success: false }
    }
  }

  const value = {
    backendUrl,
    rToken, setRToken,
    userData, setUserData,
    datasets, stats,
    orders,
    loading,
    login, register, logout,
    loadProfile, updateProfile,
    loadDatasets, loadStats,
    loadOrders,
    createOrder, verifyPayment,
  }

  return (
    <ResearchContext.Provider value={value}>
      {props.children}
    </ResearchContext.Provider>
  )
}

export default ResearchContextProvider
