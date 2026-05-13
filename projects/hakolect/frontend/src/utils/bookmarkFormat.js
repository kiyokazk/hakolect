export function getBookmarkTags(bookmark) {
  return (bookmark?.tags || []).map((tag) =>
    typeof tag === 'string' ? tag : tag?.name
  ).filter(Boolean)
}

export function getBookmarkList(data) {
  return data?.bookmarks || data?.items || []
}

export function getDuplicateBookmarkId(error) {
  return error?.response?.data?.existing_bookmark_id
    || error?.response?.data?.detail?.existing_bookmark_id
    || null
}
