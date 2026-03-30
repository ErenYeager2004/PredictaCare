import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const AppContext = createContext();

// ── Helper: check if a JWT is expired client-side ────────────────────────────
const isTokenExpired = (token) => {
  if (!token || typeof token !== "string") return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // exp is in seconds, Date.now() is ms — add 10s buffer
    return payload.exp * 1000 < Date.now() + 10000;
  } catch {
    return true;
  }
};

const AppContextProvider = (props) => {
  const currencySymbol = "₹";
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [doctors, setDoctors] = useState([]);

  // ── Token — read from localStorage but discard if already expired ─────────
  const getInitialToken = () => {
    const stored = localStorage.getItem("token");
    if (stored && !isTokenExpired(stored)) return stored;
    // Clear it right away so nothing stale is sent
    localStorage.removeItem("token");
    return false;
  };

  const [token, setTokenState] = useState(getInitialToken);
  const [userData, setUserData] = useState(false);

  // Wrap setToken so every update also syncs to localStorage
  const setToken = (newToken) => {
    if (newToken) {
      localStorage.setItem("token", newToken);
    } else {
      localStorage.removeItem("token");
    }
    setTokenState(newToken);
  };

  // ── Auto-refresh access token when it expires ─────────────────────────────
  // Handles BOTH http 401 AND backend returning {success:false, message:"jwt expired"}
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      async (response) => {
        // Backend returns 200 with success:false for expired tokens
        const d = response.data;
        if (
          d &&
          d.success === false &&
          typeof d.message === "string" &&
          (d.message.toLowerCase().includes("jwt") ||
           d.message.toLowerCase().includes("expired") ||
           d.message.toLowerCase().includes("not authorized"))
        ) {
          // Don't retry refresh calls themselves to avoid infinite loop
          if (response.config.url?.includes("refresh-token")) {
            setToken(false);
            setUserData(false);
            return response;
          }
          if (!response.config._retry) {
            response.config._retry = true;
            try {
              const { data } = await axios.post(backendUrl + "/api/user/refresh-token");
              if (data.success) {
                setToken(data.token);
                response.config.headers["token"] = data.token;
                return axios(response.config);
              }
            } catch {
              // refresh failed — clear everything
            }
            setToken(false);
            setUserData(false);
          }
        }
        return response;
      },
      async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;
          try {
            const { data } = await axios.post(backendUrl + "/api/user/refresh-token");
            if (data.success) {
              setToken(data.token);
              original.headers["token"] = data.token;
              return axios(original);
            }
          } catch {
            // refresh failed
          }
          setToken(false);
          setUserData(false);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // ── Fetch doctors list ────────────────────────────────────────────────────
  const getDoctorsData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/list");
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  // ── Fetch user profile ────────────────────────────────────────────────────
  const loadUserProfileData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/user/get-profile", {
        headers: { token },
      });
      if (data.success) {
        setUserData(data.userData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  // ── Load doctors on mount ─────────────────────────────────────────────────
  useEffect(() => {
    getDoctorsData();
  }, []);

  // ── Load user profile whenever token changes ──────────────────────────────
  useEffect(() => {
    if (token) {
      loadUserProfileData();
    } else {
      setUserData(false);
    }
  }, [token]);

  const value = {
    doctors,
    getDoctorsData,
    currencySymbol,
    token,
    setToken,
    backendUrl,
    userData,
    setUserData,
    loadUserProfileData,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
