/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
/**
 * Checks whether the given value is undefined.
 *
 * @param value Value to check.
 *
 * @returns `true` if the value is 'undefined', `false` otherwise.
 */
const isUndefined = (value) => {
    return typeof value === 'undefined';
};
/**
 * Checks whether the given value is null.
 *
 * @param value Value to check.
 *
 * @returns `true` if the value is 'null', `false` otherwise.
 */
const isNull = (value) => {
    return value === null;
};
/**
 * Checks whether the given value is a string.
 *
 * @param value Value to check.
 * @returns `true` if the value is a string, `false` otherwise.
 */
const isString = (value) => {
    return typeof value === 'string';
};
/**
 * Checks whether the given value is an array of Uint8Arrays.
 *
 * @param value Value to check.
 *
 * @returns True if the value type is an array of Uint8Arrays.
 */
const isArrayOfUint8Arrays = (value) => {
    return Array.isArray(value) && value.every((chunk) => chunk instanceof Uint8Array);
};

export { isArrayOfUint8Arrays, isNull, isString, isUndefined };
