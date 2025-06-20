import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api",
  withCredentials: true,
});

// Add a request interceptor to add the auth token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const authUser = JSON.parse(localStorage.getItem("authUser"));
    if (authUser?.token) {
      config.headers.Authorization = `Bearer ${authUser.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
