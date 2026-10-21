import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3000/api/v1" : "");
if (!baseURL) console.error("VITE_API_URL is not set. API calls will fail.");

const client = axios.create({ baseURL, withCredentials: true, timeout: 20000 });

client.interceptors.response.use(
  (response) => {
    const body = response.data;
    return body && typeof body === "object" && "data" in body ? body.data : body;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    // An expired session anywhere except the login/me checks sends the admin back to login
    if (status === 401 && !url.includes("/admin/login") && !url.includes("/admin/me")) {
      window.location.assign("/login?expired=1");
      return Promise.reject(Object.assign(new Error("Session expired"), { status }));
    }

    let message = error.response?.data?.message;
    if (!message) {
      if (error.code === "ECONNABORTED") message = "The server took too long to respond. Please try again.";
      else if (!error.response) message = "Cannot reach the server. Check your connection.";
      else message = "Something went wrong. Please try again.";
    }

    const err = new Error(message);
    err.status = status;
    err.details = error.response?.data?.details;
    err.code = err.details?.code;
    return Promise.reject(err);
  }
);

export default client;