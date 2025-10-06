/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */
/**
 * Simple deep freeze implementation.
 * It freezes the object and all its properties recursively.
 *
 * @param object Object to freeze.
 *
 * @returns Frozen object.
 *
 * @template T Type of the object to freeze.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze#deep_freezing}
 */
const deepFreeze = (object) => {
    // Retrieve the property names defined on object
    const propNames = Reflect.ownKeys(object);
    // Freeze properties before freezing self
    for (const name of propNames) {
        const value = object[name];
        if ((value && typeof value === 'object') || typeof value === 'function') {
            deepFreeze(value);
        }
    }
    return Object.freeze(object);
};

export { deepFreeze };
