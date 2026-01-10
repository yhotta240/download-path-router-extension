import 'dotenv/config';
import chromeWebstoreUpload from 'chrome-webstore-upload';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import packageJson from '../package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionId = process.env.EXTENSION_ID!;
const clientId = process.env.CLIENT_ID!;
const clientSecret = process.env.CLIENT_SECRET!;
const refreshToken = process.env.REFRESH_TOKEN!;

const repoName = packageJson.name;
const version = packageJson.version;

const releasesDir = path.resolve(__dirname, '../releases');
const zipFileName = `${repoName}-${version}.zip`;
const zipFilePath = path.join(releasesDir, zipFileName);
const distPath = path.resolve(__dirname, '../dist');

// ZIPファイル作成
async function createZip(): Promise<void> {
  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
  }

  if (fs.existsSync(zipFilePath)) {
    console.log(`! 既存のZIPファイルをスキップ: ${path.basename(zipFilePath)}`);
    return;
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✓ ZIPファイル作成完了: ${zipFilePath} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(distPath, false);
    archive.finalize();
  });
}

// Webストアにアップロード
async function uploadToWebStore(targetZipPath: string): Promise<void> {
  const store = chromeWebstoreUpload({
    extensionId,
    clientId,
    clientSecret,
    refreshToken,
  });

  const zipStream = fs.createReadStream(targetZipPath);
  await store.uploadExisting(zipStream);
  console.log('✓ アップロード完了');

  await store.publish();
  console.log('✓ 公開完了');
}

// 最新のZIPファイルを取得
function getLatestZipFile(): string | null {
  if (!fs.existsSync(releasesDir)) {
    return null;
  }

  const files = fs.readdirSync(releasesDir)
    .filter(file => file.startsWith(`${repoName}-`) && file.endsWith('.zip'))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(releasesDir, files[0]) : null;
}

async function main() {
  try {
    console.log(`リポジトリ名: ${repoName}`);
    console.log(`バージョン: ${version}`);
    console.log(`拡張機能ID: ${extensionId}`);

    await createZip();

    const latestZip = getLatestZipFile();
    if (latestZip) {
      console.log(`✓ 最新版を公開: ${path.basename(latestZip)}`);
      await uploadToWebStore(latestZip);
    } else {
      console.log('! ZIPファイルが見つかりません');
    }
  } catch (err) {
    console.error('エラー:', err);
    process.exit(1);
  }
}

main();
