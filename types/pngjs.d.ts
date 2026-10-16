/**
 * Deklarasi minimal `pngjs` (transitif via `qrcode`), cukup untuk API yang
 * dipakai: baca/tulis PNG untuk komposit logo dan verifikasi decode.
 */
declare module 'pngjs' {
  export class PNG {
    constructor(options?: { width?: number; height?: number })
    width: number
    height: number
    data: Buffer
    static sync: {
      read(buffer: Buffer): PNG
      write(png: PNG): Buffer
    }
  }
}
