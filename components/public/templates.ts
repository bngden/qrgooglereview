/** Template pesan permintaan ulasan — dipakai generator (hasil) dan section beranda. */
export type ReviewTemplate = { id: string; label: string; text: (business: string, link: string) => string }

export const TEMPLATES: ReviewTemplate[] = [
  {
    id: 'email',
    label: 'Email',
    text: (b, l) =>
      `Halo,\n\nTerima kasih telah berkunjung ke ${b}. Jika pelayanan kami memuaskan, kami akan sangat berterima kasih bila Anda berkenan menuliskan ulasan singkat di tautan berikut:\n${l}\n\nMasukan Anda membantu kami terus berkembang.\n\nHormat kami,\nTim ${b}`,
  },
  {
    id: 'sms',
    label: 'SMS',
    text: (b, l) => `Terima kasih sudah mampir ke ${b}. Beri kami ulasan di Google: ${l}`,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    text: (b, l) =>
      `Halo Kak! Terima kasih sudah berkunjung ke ${b}. Bagaimana pengalaman Anda hari ini?\n\nBantu kami jadi lebih baik dengan memberikan ulasan singkat di link berikut ya:\n${l}\n\nUlasan Kakak sangat berarti bagi kemajuan kami. Terima kasih banyak! 🙏`,
  },
  {
    id: 'struk',
    label: 'Struk',
    text: (b, l) => `TERIMA KASIH SUDAH BERBELANJA DI ${b.toUpperCase()}\n\nBantu kami dengan ulasan singkat:\n${l}`,
  },
  {
    id: 'website',
    label: 'Tombol Website',
    text: (b, l) => `⭐ Tulis Ulasan untuk ${b}\n${l}`,
  },
]

/** Tab yang aktif pada desain Stitch (section "Template permintaan review"). */
export const DEFAULT_TEMPLATE_ID = 'whatsapp'

export const findTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
