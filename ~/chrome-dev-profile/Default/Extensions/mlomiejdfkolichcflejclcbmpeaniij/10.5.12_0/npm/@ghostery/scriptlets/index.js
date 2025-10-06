import scriptlets$1 from './ubo.js';

const scriptlets = {};

for (const [name, scriptlet] of Object.entries(scriptlets$1)) {
  scriptlets[name] = scriptlet;
  for (const alias of scriptlet.aliases) {
    scriptlets[alias] = scriptlet;
  }
}

export { scriptlets as default };
