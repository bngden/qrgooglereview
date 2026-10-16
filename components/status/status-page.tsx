import { STATUS_CSS } from './status-styles'
import { statusBody, type StatusState } from './status-body'

export type { StatusState }

/**
 * Wrapper halaman App Router untuk layar status QR.
 * Markup & style berasal dari `status-body.ts` / `status-styles.ts` — sumber yang sama
 * dipakai route handler `/r/[slug]` (lihat status-document.ts).
 */
export function StatusPage({ state }: { state: StatusState }) {
  return (
    <>
      <style data-status="reviewqr" precedence="status">
        {STATUS_CSS}
      </style>
      <div dangerouslySetInnerHTML={{ __html: statusBody(state) }} />
    </>
  )
}
