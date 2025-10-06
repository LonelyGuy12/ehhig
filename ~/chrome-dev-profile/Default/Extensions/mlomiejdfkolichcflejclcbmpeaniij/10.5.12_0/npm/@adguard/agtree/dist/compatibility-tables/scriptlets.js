import { CompatibilityTableBase } from './base.js';
import { scriptletsCompatibilityTableData } from './compatibility-table-data.js';
import { deepFreeze } from '../utils/deep-freeze.js';

/*
 * AGTree v3.2.2 (build date: Tue, 08 Jul 2025 13:39:47 GMT)
 * (c) 2025 Adguard Software Ltd.
 * Released under the MIT license
 * https://github.com/AdguardTeam/tsurlfilter/tree/master/packages/agtree#readme
 */

/**
 * @file Compatibility tables for scriptlets.
 */
/**
 * Compatibility table for scriptlets.
 */
class ScriptletsCompatibilityTable extends CompatibilityTableBase {
}
/**
 * Deep freeze the compatibility table data to avoid accidental modifications.
 */
deepFreeze(scriptletsCompatibilityTableData);
/**
 * Compatibility table instance for scriptlets.
 */
const scriptletsCompatibilityTable = new ScriptletsCompatibilityTable(scriptletsCompatibilityTableData);

export { scriptletsCompatibilityTable };
