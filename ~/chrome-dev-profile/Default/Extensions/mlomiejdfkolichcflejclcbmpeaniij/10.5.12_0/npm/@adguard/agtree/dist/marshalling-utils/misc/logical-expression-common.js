import { OperatorValue } from '../../nodes/index.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * Property map for binary serialization.
 *
 * ! IMPORTANT: If you change values here, please update the {@link BINARY_SCHEMA_VERSION} !
 */
const VariableNodeBinaryPropMarshallingMap = {
    Name: 1,
    FrequentName: 2,
    Start: 3,
    End: 4,
};
/**
 * Property map for binary serialization.
 *
 * ! IMPORTANT: If you change values here, please update the {@link BINARY_SCHEMA_VERSION} !
 */
const OperatorNodeBinaryPropMarshallingMap = {
    Operator: 1,
    Left: 2,
    Right: 3,
    Start: 4,
    End: 5,
};
/**
 * Property map for binary serialization.
 *
 * ! IMPORTANT: If you change values here, please update the {@link BINARY_SCHEMA_VERSION} !
 */
const ParenthesisNodeBinaryPropMarshallingMap = {
    Expression: 1,
    Start: 2,
    End: 3,
};
/**
 * Property map for binary serialization.
 *
 * ! IMPORTANT: If you change values here, please update the {@link BINARY_SCHEMA_VERSION} !
 */
const LOGICAL_EXPRESSION_OPERATOR_SERIALISATION_MAP = new Map([
    [OperatorValue.Not, 0],
    [OperatorValue.And, 1],
    [OperatorValue.Or, 2],
]);
/**
 * Serialization map for known variables.
 */
const KNOWN_VARIABLES_SERIALIZATION_MAP = new Map([
    ['ext_abp', 0],
    ['ext_ublock', 1],
    ['ext_ubol', 2],
    ['ext_devbuild', 3],
    ['env_chromium', 4],
    ['env_edge', 5],
    ['env_firefox', 6],
    ['env_mobile', 7],
    ['env_safari', 8],
    ['env_mv3', 9],
    ['false', 10],
    ['cap_html_filtering', 11],
    ['cap_user_stylesheet', 12],
    ['adguard', 13],
    ['adguard_app_windows', 14],
    ['adguard_app_mac', 15],
    ['adguard_app_android', 16],
    ['adguard_app_ios', 17],
    ['adguard_ext_safari', 18],
    ['adguard_ext_chromium', 19],
    ['adguard_ext_firefox', 20],
    ['adguard_ext_edge', 21],
    ['adguard_ext_opera', 22],
    ['adguard_ext_android_cb', 23],
    // TODO: Add 'adguard_ext_chromium_mv3' to the list
]);

export { KNOWN_VARIABLES_SERIALIZATION_MAP, LOGICAL_EXPRESSION_OPERATOR_SERIALISATION_MAP, OperatorNodeBinaryPropMarshallingMap, ParenthesisNodeBinaryPropMarshallingMap, VariableNodeBinaryPropMarshallingMap };
