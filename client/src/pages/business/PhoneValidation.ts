// Pakistani mobile numbers are 11 digits total in local format: 03XXXXXXXXX
// (leading 0 + 10 digits), or the same number in international format:
// +92 3XXXXXXXXX (country code + 10 digits, no leading 0).
// We accept common ways people type it — with/without spaces, dashes,
// leading +92, or leading 0092 — and normalize before validating.

export function normalizePhone(raw: string): string {
    return raw.replace(/[\s\-()]/g, '')
}

export function isValidPakistaniPhone(raw: string): boolean {
    const value = normalizePhone(raw)

    // Local format: 0 followed by 10 digits (11 digits total), must start 03
    if (/^03\d{9}$/.test(value)) return true

    // International format: +92 followed by 10 digits, must start with 3
    if (/^\+923\d{9}$/.test(value)) return true

    // International format without the plus: 923XXXXXXXXX
    if (/^00923\d{9}$/.test(value)) return true
    if (/^923\d{9}$/.test(value)) return true

    return false
}

export function phoneErrorMessage(): string {
    return 'Enter a valid Pakistani mobile number, e.g. 0300 1234567 or +92 300 1234567'
}