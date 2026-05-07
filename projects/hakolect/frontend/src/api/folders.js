import client from './client'

export const getFolders = () =>
  client.get('/folders').then((r) => r.data)

export const createFolder = (data) =>
  client.post('/folders', data).then((r) => r.data)

export const updateFolder = (id, data) =>
  client.put(`/folders/${id}`, data).then((r) => r.data)

export const deleteFolder = (id) =>
  client.delete(`/folders/${id}`).then((r) => r.data)

export const reorderFolders = (items) =>
  client.put('/folders/reorder', { items }).then((r) => r.data)
