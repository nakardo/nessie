/**
 * Status flags
 * See: https://wiki.nesdev.com/w/index.php/Status_flags
 *
 * 7  bit  0
 * ---- ----
 * NVss DIZC
 * |||| ||||
 * |||| |||+- Carry
 * |||| ||+-- Zero
 * |||| |+--- Interrupt Disable
 * |||| +---- Decimal
 * ||++------ No CPU effect, see: the B flag
 * |+-------- Overflow
 * +--------- Negative
 */
export const SIGN = 1 << 7;
export const OVERFLOW = 1 << 6;
export const DECIMAL = 1 << 3;
export const INTERRUPT = 1 << 2;
export const ZERO = 1 << 1;
export const CARRY = 1;
