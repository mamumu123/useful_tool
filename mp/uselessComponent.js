/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

async function findUnusedComponents(projectPath) {
  const unusedComponents = [];

  const walk = async (dir) => {
    const files = await readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.lstatSync(filePath);
      if (stat.isDirectory()) {
        await walk(filePath);
      } else {
        if (file.endsWith('.json')) {
          const jsonFile = filePath;
          const jsonData = require(jsonFile);
          const usingComponentsMatch = jsonData.usingComponents;

          if (usingComponentsMatch) {
            const usingComponents = JSON.parse(JSON.stringify(usingComponentsMatch));
            const htmlFile = filePath.replace('.json', '.wxml');
            const htmlContent = await readFile(htmlFile, 'utf8');

            // eslint-disable-next-line no-restricted-syntax
            for (const component in usingComponents) {
              if (!htmlContent.includes(component)) {
                unusedComponents.push({ jsonFile, component });
              }
            }
          }
        }
      }
    }
  };

  await walk(projectPath);
  return unusedComponents;
}

async function removeUnusedComponents(unusedComponents) {
  for (const { jsonFile, component } of unusedComponents) {
    const jsonData = require(jsonFile);
    delete jsonData.usingComponents[component];
    await writeFile(jsonFile, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log(`Removed unused component ${component} from ${jsonFile}`);
  }
}

if (require.main === module) {
  const projectPath = `${process.cwd()}/src`; // TODO:请将此处替换为您的小程序项目路径
  findUnusedComponents(projectPath)
    .then(unusedComponents => removeUnusedComponents(unusedComponents))
    .catch(error => console.error('Error:', error));
}
