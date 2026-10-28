// 사람들이 그린 그림 모음 (서버 /api/gallery). 홈 화면에 무작위로 띄운다.

export interface GalleryItem {
  id: string
  drawing: string
  keyword: string
  name: string
  score: number
}

/** 이 점수 밑의 그림(빈 캔버스나 낙서 수준)은 올리지 않는다 */
export const GALLERY_MIN_SCORE = 100

export async function fetchGallery(): Promise<GalleryItem[]> {
  try {
    const res = await fetch('/api/gallery', { cache: 'no-store' })
    if (!res.ok) return []
    const list = await res.json()
    return Array.isArray(list) ? list.filter(it => typeof it?.drawing === 'string') : []
  } catch {
    return []
  }
}

export function postGallery(item: Omit<GalleryItem, 'id'>) {
  if (!item.drawing || item.score < GALLERY_MIN_SCORE) return
  fetch('/api/gallery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  }).catch(() => {
    // 서버가 없으면(정적 배포) 갤러리 없이 진행
  })
}
