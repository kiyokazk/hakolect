import client from './client'

export const getBookmarks = (params = {}) =>
  client.get('/bookmarks', { params }).then((r) => r.data)

export const getBookmark = (id) =>
  client.get(`/bookmarks/${id}`).then((r) => r.data)

export const createBookmark = (data) =>
  client.post('/bookmarks', data).then((r) => r.data)

export const updateBookmark = (id, data) =>
  client.put(`/bookmarks/${id}`, data).then((r) => r.data)

export const deleteBookmark = (id) =>
  client.delete(`/bookmarks/${id}`).then((r) => r.data)

export const fetchMeta = (url) =>
  client.post('/bookmarks/fetch-meta', { url }).then((r) => r.data)

export const reorderBookmarks = (items) =>
  client.put('/bookmarks/reorder', { items }).then((r) => r.data)
