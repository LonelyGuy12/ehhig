import { openDB } from '../npm/idb/build/index.js';
import FilterEngine, { ENGINE_VERSION } from '../npm/@ghostery/adblocker/dist/esm/engine/engine.js';
import '../npm/@ghostery/adblocker/dist/esm/data-view.js';
import '../npm/@ghostery/adblocker/dist/esm/request.js';
import '../npm/@ghostery/adblocker/dist/esm/filters/cosmetic.js';
import '../npm/@ghostery/adblocker/dist/esm/filters/network.js';
import '../npm/@ghostery/adblocker/dist/esm/preprocessor.js';
import { getLinesWithFilters, mergeDiffs } from '../npm/@ghostery/adblocker/dist/esm/lists.js';
import '../npm/@ghostery/adblocker/dist/esm/fetch.js';
import Resources$1 from '../npm/@ghostery/adblocker/dist/esm/resources.js';
import Resources from '../store/resources.js';
import { registerDatabase } from './indexeddb.js';
import debug from './debug.js';
import { CDN_URL } from './urls.js';
import store from '../npm/hybrids/src/store.js';

const MAIN_ENGINE = "main";
const FIXES_ENGINE = "fixes";
const ELEMENT_PICKER_ENGINE = "element-picker-selectors";
const CUSTOM_ENGINE = "custom-filters";
const TRACKERDB_ENGINE = "trackerdb";
const engines = /* @__PURE__ */ new Map();
const ENV = /* @__PURE__ */ new Map([
  ["ext_ghostery", true],
  ["cap_html_filtering", checkUserAgent("Firefox")],
  // can be removed in once $replace support is sufficiently distributed
  ["cap_replace_modifier", checkUserAgent("Firefox")],
  ["env_firefox", checkUserAgent("Firefox")],
  ["env_chromium", checkUserAgent("Chrome")],
  ["env_edge", checkUserAgent("Edg")],
  ["env_mobile", checkUserAgent("Mobile")],
  ["env_experimental", false]
]);
function isPersistentEngine(name2) {
  return name2 !== ELEMENT_PICKER_ENGINE && name2 !== CUSTOM_ENGINE && name2 !== MAIN_ENGINE;
}
function setEnv(key, value) {
  if (ENV.has(key)) {
    ENV.set(key, value);
    for (const engine of engines.values()) {
      engine.updateEnv(ENV);
    }
  } else {
    throw Error(`Unknown environment variable: ${key}`);
  }
}
function checkUserAgent(pattern) {
  return navigator.userAgent.indexOf(pattern) !== -1;
}
function deserializeEngine(engineBytes) {
  const engine = FilterEngine.deserialize(engineBytes);
  engine.updateEnv(ENV);
  return engine;
}
function loadFromMemory(name2) {
  return engines.get(name2);
}
function saveToMemory(name2, engine) {
  engines.set(name2, engine);
}
const DB_NAME = registerDatabase("engines");
async function getDB() {
  if (!getDB.current) {
    getDB.current = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore("engines");
      },
      async blocking() {
        const db = await getDB.current;
        db.close();
        getDB.current = null;
      }
    });
  }
  return getDB.current;
}
async function loadFromStorage(name2) {
  try {
    const engineBytes = await getDB().then((db) => {
      const tx = db.transaction("engines");
      const table = tx.objectStore("engines");
      return table.get(name2).then((result) => {
        return tx.done.then(() => result);
      });
    }).catch((e) => {
      if (false) ; else {
        throw e;
      }
    });
    if (engineBytes) {
      const engine = deserializeEngine(engineBytes);
      if (!engine.config.loadNetworkFilters) {
        throw TypeError(`Engine "${name2}" is obsolete and must be reloaded`);
      }
      saveToMemory(name2, engine);
      return engine;
    }
  } catch (e) {
    console.error(`[engines] Failed to load engine "${name2}" from storage`, e);
  }
  return null;
}
async function saveToStorage(name2, checksum) {
  const engine = loadFromMemory(name2);
  const serialized = engine?.serialize();
  store.set(Resources, {
    checksums: { [name2]: engine && checksum || null }
  });
  try {
    const db = await getDB();
    const tx = db.transaction("engines", "readwrite");
    const table = tx.objectStore("engines");
    if (engine) {
      await table.put(serialized, name2);
    } else {
      await table.delete(name2);
    }
    if (false) ;
    await tx.done;
  } catch (e) {
    throw e;
  }
}
async function loadFromCDN(name2) {
  console.log(`[engines] Loading engine "${name2}" from CDN...`);
  await update(name2, { force: true });
  return await loadFromStorage(name2);
}
function check(response) {
  if (!response.ok) {
    throw new Error(
      `Failed to fetch engine "${name}": ${response.status}: ${response.statusText}`
    );
  }
  return response;
}
async function update(name2, { force = false } = {}) {
  if (!force && await loadFromStorage(name2) === null) {
    console.warn(
      `[engines] Skipping update for engine "${name2}" as the engine is not available`
    );
    return false;
  }
  try {
    const urlName = name2 === "trackerdb" ? "trackerdbMv3" : `dnr-${name2}-v2`;
    const listURL = CDN_URL + `adblocker/configs/${urlName}/allowed-lists.json`;
    console.info(`[engines] Updating engine "${name2}"...`);
    const data = await fetch(listURL).then(check).then((res) => res.json());
    if (!data.engines[ENGINE_VERSION]) {
      throw new Error(
        `Engine "${name2}" for "${ENGINE_VERSION}" engine version not found`
      );
    }
    let engine = loadFromMemory(name2) || await loadFromStorage(name2);
    let requiresFullReload = false;
    if (engine) {
      for (const [name3, checksum] of engine.lists.entries()) {
        if (!data.lists[name3]) {
          requiresFullReload = true;
          break;
        }
        if (data.lists[name3].checksum !== checksum && data.lists[name3].diffs[checksum] === void 0) {
          requiresFullReload = true;
          break;
        }
      }
    } else {
      requiresFullReload = true;
    }
    if (requiresFullReload) {
      const arrayBuffer = await fetch(data.engines[ENGINE_VERSION].url).then(check).then((res) => res.arrayBuffer());
      const engineBytes = new Uint8Array(arrayBuffer);
      engine = deserializeEngine(engineBytes);
      saveToMemory(name2, engine);
      saveToStorage(name2, data.engines[ENGINE_VERSION].checksum);
      console.info(
        `Engine "${name2}" reloaded:`,
        data.engines[ENGINE_VERSION].checksum
      );
      return true;
    }
    const diffs = [];
    const fetchListToAdd = async ({ name: name3, checksum, url }) => {
      try {
        diffs.push({
          added: Array.from(
            getLinesWithFilters(
              await fetch(url).then(check).then((res) => res.text()),
              engine.config
            )
          )
        });
        engine.lists.set(name3, checksum);
      } catch (e) {
        console.error(`[engines] Failed to add list "${name3}"`, e);
      }
    };
    const fetchListToUpdate = async ({ name: name3, checksum, url }) => {
      try {
        diffs.push(
          await fetch(url).then(check).then((res) => res.json())
        );
        engine.lists.set(name3, checksum);
      } catch (e) {
        console.error(`[engines] Failed to update list "${name3}"`, e);
      }
    };
    const promises = [];
    for (const name3 of Object.keys(data.lists)) {
      const checksum = engine.lists.get(name3);
      if (checksum === void 0) {
        promises.push(
          fetchListToAdd({
            name: name3,
            checksum: data.lists[name3].checksum,
            url: data.lists[name3].url
          })
        );
      } else if (checksum !== data.lists[name3].checksum) {
        promises.push(
          fetchListToUpdate({
            name: name3,
            checksum: data.lists[name3].checksum,
            url: data.lists[name3].diffs[checksum]
          })
        );
      }
    }
    await Promise.all(promises);
    const cumulativeDiff = mergeDiffs(diffs);
    let updated = engine.updateFromDiff(cumulativeDiff, ENV);
    if (data.resourcesJson && data.resourcesJson.checksum !== engine.resources.checksum) {
      engine.updateResources(
        await fetch(data.resourcesJson.url).then(check).then((res) => res.text()),
        data.resourcesJson.checksum
      );
      updated = true;
    }
    if (updated) {
      console.info(
        `[engines] Engine "${name2}" updated:`,
        data.engines[ENGINE_VERSION].checksum
      );
      saveToStorage(name2, data.engines[ENGINE_VERSION].checksum);
      return true;
    }
    return false;
  } catch (e) {
    console.error(`[engines] Failed to update engine "${name2}"`, e);
  }
}
function get(name2) {
  return loadFromMemory(name2);
}
async function init(name2) {
  return get(name2) || await loadFromStorage(name2) || isPersistentEngine(name2) && await loadFromCDN(name2) || null;
}
function create(name2, options = null) {
  const engine = new FilterEngine({ ...options });
  engine.updateEnv(ENV);
  saveToMemory(name2, engine);
  saveToStorage(name2).catch(() => {
    console.error(`[engines] Failed to save engine "${name2}" to storage`);
  });
  return engine;
}
function replace(name2, engineOrEngines) {
  const engines2 = [].concat(engineOrEngines);
  let engine;
  if (engines2.length > 1) {
    engine = FilterEngine.merge(engines2, {
      skipResources: true,
      overrideConfig: { enableCompression: false }
    });
    engine.resources = Resources$1.copy(engines2[0].resources);
  } else {
    engine = engines2[0];
  }
  engine.updateEnv(ENV);
  saveToMemory(name2, engine);
  saveToStorage(name2).catch(() => {
    console.error(`[engines] Failed to save engine "${name2}" to storage`);
  });
  return engine;
}
function remove(name2) {
  engines.delete(name2);
  saveToStorage(name2).catch(() => {
    console.error(`[engines] Failed to remove engine "${name2}" from storage`);
  });
}
debug.engines = { get };

export { CUSTOM_ENGINE, ELEMENT_PICKER_ENGINE, FIXES_ENGINE, MAIN_ENGINE, TRACKERDB_ENGINE, create, get, init, isPersistentEngine, remove, replace, setEnv, update };
