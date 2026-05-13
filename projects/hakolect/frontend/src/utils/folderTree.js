export function flattenFolders(folders = [], depth = 0) {
  const result = []
  for (const folder of folders) {
    result.push({ ...folder, depth })
    if (folder.children?.length) {
      result.push(...flattenFolders(folder.children, depth + 1))
    }
  }
  return result
}

export function getFolderPath(folders = [], folderId) {
  const flat = flattenFolders(folders, 0)
  const folder = flat.find((item) => item.id === folderId)
  if (!folder) return []

  const path = [folder]
  let current = folder
  while (current.parent_id) {
    const parent = flat.find((item) => item.id === current.parent_id)
    if (!parent) break
    path.unshift(parent)
    current = parent
  }
  return path
}

export function getFolderLabelMap(folders = []) {
  const flat = flattenFolders(folders, 0)
  return new Map(
    flat.map((folder) => [folder.id, '  '.repeat(folder.depth) + folder.name])
  )
}

export function collectDescendantIds(folders = [], folderId) {
  const flat = flattenFolders(folders, 0)
  const childMap = new Map()
  for (const folder of flat) {
    const list = childMap.get(folder.parent_id) || []
    list.push(folder.id)
    childMap.set(folder.parent_id, list)
  }

  const ids = []
  const stack = [folderId]
  while (stack.length > 0) {
    const current = stack.pop()
    ids.push(current)
    for (const childId of childMap.get(current) || []) {
      stack.push(childId)
    }
  }
  return ids
}

export function getSiblingFolders(folders = [], parentId = null) {
  return flattenFolders(folders, 0)
    .filter((folder) => (folder.parent_id ?? null) === (parentId ?? null))
    .sort((a, b) => a.sort_order - b.sort_order)
}
