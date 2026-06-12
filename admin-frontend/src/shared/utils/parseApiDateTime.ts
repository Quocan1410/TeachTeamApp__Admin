/**
 * Parse API / MySQL datetimes stored as UTC without a timezone suffix.
 * Avoids treating UTC wall-clock values as local time (e.g. 7h offset in ICT).
 */
export function parseApiDateTime(value: string | Date): Date {
    if (value instanceof Date) {
        return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return new Date();
    }

    if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
        return new Date(trimmed);
    }

    const iso = trimmed.includes("T")
        ? trimmed
        : trimmed.replace(" ", "T");

    return new Date(`${iso}Z`);
}
