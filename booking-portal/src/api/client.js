import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api/v1' : '');
if (!baseURL) console.error('VITE_API_URL is not set. API calls will fail.');

const api = axios.create({ baseURL, timeout: 20000 });

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    return body && typeof body === 'object' && 'data' in body ? body.data : body;
  },
  (error) => {
    let message = error.response?.data?.message;
    if (!message) {
      if (error.code === 'ECONNABORTED') message = 'The server took too long to respond. Please try again.';
      else if (!error.response) message = 'Cannot reach the server. Check your internet connection and try again.';
      else message = 'Something went wrong. Please try again.';
    }
    const err = new Error(message);
    err.status = error.response?.status;
    err.isNetworkError = !error.response;
    return Promise.reject(err);
  }
);

export default api;