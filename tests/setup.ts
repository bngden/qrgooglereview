/**
 * Setup global test — hanya menyiapkan env agar modul yang butuh secret
 * tidak melempar error saat diimpor. Tidak menyentuh database.
 */
process.env.JWT_SECRET ??= 'test-jwt-secret-minimum-32-characters-long'
process.env.SCAN_SALT ??= 'test-scan-salt-minimum-32-characters-long'
process.env.CRON_SECRET ??= 'test-cron-secret-minimum-32-chars'
process.env.APP_URL ??= 'https://reviewqr.test'
