import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import packageJson from '../package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoName = packageJson.name;
const version = packageJson.version;

const releasesDir = path.resolve(__dirname, '../releases');
const zipFileName = `${repoName}-${version}.zip`;
const zipFilePath = path.join(releasesDir, zipFileName);
const distPath = path.resolve(__dirname, '../dist');

/**
 * ZIPファイルを作成する（既存ファイルは上書き）
 */
export async function createZip(): Promise<string> {
  // releasesディレクトリが存在しない場合は作成
  if (!fs.existsSync(releasesDir)) {
    try {
      fs.mkdirSync(releasesDir, { recursive: true });
      console.log(`✓ リリース用ディレクトリを作成しました: ${releasesDir}`);
    } catch (err) {
      throw new Error(`リリース用ディレクトリの作成に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // distディレクトリの存在確認
  if (!fs.existsSync(distPath)) {
    throw new Error(`ビルド済みファイルが見つかりません\n先に "npm run build" を実行してください\nディレクトリ: ${distPath}`);
  }

  // 既存のZIPファイルがある場合は削除
  if (fs.existsSync(zipFilePath)) {
    try {
      fs.unlinkSync(zipFilePath);
      console.log(`✓ 既存のZIPファイルを削除しました: ${path.basename(zipFilePath)}`);
    } catch (err) {
      throw new Error(`既存のZIPファイルの削除に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const sizeInKB = (archive.pointer() / 1024).toFixed(2);
      console.log(`✓ ZIPファイルの作成が完了しました`);
      console.log(`  ファイル名: ${path.basename(zipFilePath)}`);
      console.log(`  保存場所: ${zipFilePath}`);
      console.log(`  ファイルサイズ: ${sizeInKB} KB`);
      resolve(zipFilePath);
    });

    output.on('error', (err) => {
      reject(new Error(`ZIPファイルの書き込み中にエラーが発生しました: ${err.message}`));
    });

    archive.on('error', (err) => {
      reject(new Error(`ZIPファイルの圧縮中にエラーが発生しました: ${err.message}`));
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn(`⚠ 警告: ${err.message}`);
      } else {
        reject(new Error(`ZIPファイルの作成中に警告が発生しました: ${err.message}`));
      }
    });

    archive.pipe(output);
    archive.directory(distPath, false);
    archive.finalize();
  });
}

// このファイルが直接実行された場合
async function main() {
  try {
    console.log('\n=== ZIPファイル作成を開始します ===\n');
    console.log(`プロジェクト名: ${repoName}`);
    console.log(`バージョン: ${version}`);
    console.log(`対象ディレクトリ: ${distPath}\n`);

    await createZip();

    console.log('\n✓ すべての処理が正常に完了しました');
  } catch (err) {
    console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

// このファイルが直接実行された場合にmainを呼び出す
if (process.argv[1]?.endsWith('create-zip.mts')) {
  main();
}
