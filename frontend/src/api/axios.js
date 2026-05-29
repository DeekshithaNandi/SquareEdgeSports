import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
})

API.interceptors.request.use(config => {
  const token = localStorage.getItem('ses_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ses_token')
      localStorage.removeItem('ses_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default API
