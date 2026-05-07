import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/hakolect/v1'

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach API key if set (for external/Chrome ext usage)
client.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey
  }
  return config
})

// Response interceptor: normalize errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const detail = error.response?.data?.detail

    if (status === 409 && detail?.existing_bookmark_id) {
      // Duplicate URL - pass through for caller to handle
      return Promise.reject(error)
    }

    const message =
      typeof detail === 'string'
        ? detail
        : detail?.message || error.message || 'An error occurred'

    error.userMessage = message
    return Promise.reject(error)
  }
)

export default client
