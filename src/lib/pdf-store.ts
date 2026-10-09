import type { ExtractedPdf, PdfPageText } from "@/lib/pdf"

const DB_NAME = "local-llm-pdfs"
const DB_VERSION = 1
const STORE_NAME = "pdfs"

export type StoredPdf = {
  chatId: string
  id: string
  name: string
  pageCount: number
  pages: PdfPageText[]
  blob: Blob
  createdAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "chatId" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB Fehler"))
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB Fehler"))
  })
}

export async function savePdfForChat(
  chatId: string,
  file: File,
  extracted: ExtractedPdf,
  id: string
): Promise<StoredPdf> {
  const record: StoredPdf = {
    chatId,
    id,
    name: extracted.name,
    pageCount: extracted.pageCount,
    pages: extracted.pages,
    blob: file,
    createdAt: Date.now(),
  }

  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, "readwrite")
    await requestToPromise(tx.objectStore(STORE_NAME).put(record))
  } finally {
    db.close()
  }

  return record
}

export async function getPdfForChat(chatId: string): Promise<StoredPdf | null> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, "readonly")
    const result = await requestToPromise(
      tx.objectStore(STORE_NAME).get(chatId)
    )
    return (result as StoredPdf | undefined) ?? null
  } finally {
    db.close()
  }
}

export async function deletePdfForChat(chatId: string): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, "readwrite")
    await requestToPromise(tx.objectStore(STORE_NAME).delete(chatId))
  } finally {
    db.close()
  }
}
