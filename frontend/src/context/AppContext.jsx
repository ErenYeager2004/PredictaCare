import { createContext, useEffect, useState } from "react";
import axios from 'axios'
import { toast } from "react-toastify";
export const AppContext = createContext()

const AppContextProvider = (props) => {
    const currencySymbol = '₹'
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const [doctors, setDoctors] = useState([])
    const [token, setToken] = useState(false)
    const [userData, setUserData] = useState(false)

    //Auto-refresh token when it expires
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            async error => {
                const original = error.config;
                if (error.response?.status === 401 && !original._retry) {
                    original._retry = true;
                    try {
                        const { data } = await axios.post(backendUrl + '/api/user/refresh-token');
                        if (data.success) {
                            setToken(data.token);
                            original.headers['token'] = data.token;
                            return axios(original);
                        }
                    } catch {
                        setToken(false);
                        setUserData(false);
                    }
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    const getDoctorsData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctor/list')
            if (data.success) {
                setDoctors(data.doctors)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    const loadUserProfileData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/user/get-profile', { headers: { token } })
            if (data.success) {
                setUserData(data.userData)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    const value = {
        doctors, getDoctorsData,
        currencySymbol,
        token,
        setToken,
        backendUrl,
        userData,
        setUserData,
        loadUserProfileData
    }

    useEffect(() => {
        getDoctorsData()
    }, [])

    useEffect(() => {
        if (token) {
            loadUserProfileData()
        } else {
            setUserData(false)
        }
    }, [token])

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}
export default AppContextProvider
