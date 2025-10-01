// fix-imports.mjs
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

// Caminho do tsconfig
const tsconfigPath = path.join(projectRoot, "tsconfig.json");

// Carrega tsconfig para pegar os aliases
let aliases = {};
if (fs.existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
  const paths = tsconfig.compilerOptions?.paths || {};

  for (const [alias, targetArr] of Object.entries(paths)) {
    // exemplo: "@/*": ["./*"]
    const base = alias.replace("/*", "");
    const target = targetArr[0].replace("/*", "");
    aliases[base] = path.resolve(projectRoot, target);
  }
}

function walk(dir, callback) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, callback);
    } else if (
      entry.isFile() &&
      (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx"))
    ) {
      callback(fullPath);
    }
  });
}

function resolveAlias(importPath, fileDir) {
  for (const [alias, target] of Object.entries(aliases)) {
    if (importPath.startsWith(alias)) {
      const relPath = importPath.replace(alias, target);
      // converte para relativo em relação ao arquivo atual
      let relativePath = path.relative(fileDir, relPath);
      if (!relativePath.startsWith(".")) {
        relativePath = "./" + relativePath;
      }
      return relativePath;
    }
  }
  return importPath;
}

function fixImports(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;
  const fileDir = path.dirname(filePath);

  const newContent = content.replace(
    /from\s+["']([^"']+)["']/g,
    (match, importPath) => {
      let newImport = importPath;

      // 1. Resolver alias @/
      if (importPath.startsWith("@/")) {
        newImport = resolveAlias(importPath.replace("@", ""), fileDir);
      }

      // 2. Adicionar .js em imports relativos sem extensão
      if (
        newImport.startsWith(".") &&
        !/\.[a-z]+$/i.test(newImport) // já tem extensão? não mexe
      ) {
        newImport += ".js";
      }

      if (newImport !== importPath) {
        modified = true;
        return `from "${newImport}"`;
      }
      return match;
    }
  );

  if (modified) {
    fs.writeFileSync(filePath, newContent, "utf-8");
    console.log(`✅ Corrigido: ${filePath}`);
  }
}

console.log("🔍 Corrigindo imports relativos e aliases @/... ");
walk(projectRoot, fixImports);
console.log("✨ Finalizado!");