import client from './client'

function getFilenameFromDisposition(disposition) {
  if (!disposition) return null
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }
  const simpleMatch = disposition.match(/filename="?([^";]+)"?/i)
  return simpleMatch?.[1] || null
}

export async function downloadExport(path, fallbackFilename) {
  const response = await client.get(path, { responseType: 'blob' })
  const disposition = response.headers['content-disposition']
  const filename = getFilenameFromDisposition(disposition) || fallbackFilename
  const blobUrl = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}

export const exportAllData = () =>
  downloadExport('/data/export', 'hakolect-export.json')

export const exportFolderData = (folderId) =>
  downloadExport(`/data/export/folder/${folderId}`, `hakolect-export-folder-${folderId}.json`)

export const exportUnsortedData = () =>
  downloadExport('/data/export/unsorted', 'hakolect-export-unsorted.json')

export async function parseImportFile(file) {
  const text = await file.text()
  const payload = JSON.parse(text)
  const meta = payload?.hakolect_export
  if (!meta || meta.version !== '1.0' || !Array.isArray(payload?.bookmarks)) {
    throw new Error('Invalid file format. Please use a Hakolect export file.')
  }

  const stats = meta.stats || {}
  return {
    file,
    payload,
    fileName: file.name,
    stats: {
      bookmarks: stats.bookmarks_count ?? payload.bookmarks.length ?? 0,
      folders:
        stats.folders_count
        ?? stats.subfolders_count
        ?? (Array.isArray(payload.folders) ? payload.folders.length : 0),
      tags: stats.tags_count ?? (Array.isArray(payload.tags) ? payload.tags.length : 0),
    },
  }
}

export async function importData(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await client.post('/data/import', formData)
  return response.data
}
