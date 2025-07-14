import axios from "axios";
import { API_BASE_URL } from "../config";

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add a request interceptor to add the auth token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const authUser = JSON.parse(localStorage.getItem("authUser"));
    if (authUser?.token) {
      config.headers.Authorization = `Bearer ${authUser.token}`;
      if (import.meta.env.MODE === "development") {
        console.log("Sending Authorization token:", authUser.token);
      }
    } else {
      if (import.meta.env.MODE === "development") {
        console.warn("No auth token found in localStorage");
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);