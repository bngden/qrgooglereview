import { StatusPage } from '@/components/status/status-page'

/** 404 bawaan aplikasi (rute tidak ada — bukan QR). */
export default function NotFound() {
  return <StatusPage state="not-found" />
}
