import client from './client'

export const getTags = () =>
  client.get('/tags').then((r) => r.data)

export const deleteTag = (id) =>
  client.delete(`/tags/${id}`).then((r) => r.data)
