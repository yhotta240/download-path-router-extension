import 'dotenv/config';
import chromeWebstoreUpload from 'chrome-webstore-upload';
import fs from 'fs';
import packageJson from '../package.json' with { type: 'json' };
import { createZip } from './create-zip.mts';

const extensionId = process.env.EXTENSION_ID!;
const clientId = process.env.CLIENT_ID!;
const clientSecret = process.env.CLIENT_SECRET!;
const refreshToken = process.env.REFRESH_TOKEN!;

const repoName = packageJson.name;
const version = packageJson.version;

/**
 * Webストアにアップロード
 */
async function uploadToWebStore(targetZipPath: string): Promise<void> {
  if (!fs.existsSync(targetZipPath)) {
    throw new Error(`アップロード対象のZIPファイルが見つかりません: ${targetZipPath}`);
  }

  console.log('\n=== Chrome Web Store へのアップロードを開始します ===\n');

  try {
    const store = chromeWebstoreUpload({
      extensionId,
      clientId,
      clientSecret,
      refreshToken,
    });

    const zipStream = fs.createReadStream(targetZipPath);
    await store.uploadExisting(zipStream);
    console.log('✓ アップロードが完了しました');

    console.log('\n拡張機能を公開しています...');
    await store.publish();
    console.log('✓ 公開が完了しました');
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Chrome Web Store への公開中にエラーが発生しました: ${err.message}`);
    }
    throw new Error(`Chrome Web Store への公開中に予期しないエラーが発生しました: ${String(err)}`);
  }
}

async function main() {
  try {
    console.log('\n=== Chrome Web Store への公開処理を開始します ===\n');
    console.log(`プロジェクト名: ${repoName}`);
    console.log(`バージョン: ${version}`);
    console.log(`拡張機能ID: ${extensionId}\n`);

    // 環境変数の確認
    if (!extensionId || !clientId || !clientSecret || !refreshToken) {
      throw new Error(
        '必要な環境変数が設定されていません。\n' +
        '.envファイルに以下の項目を設定してください：\n' +
        '  - EXTENSION_ID\n' +
        '  - CLIENT_ID\n' +
        '  - CLIENT_SECRET\n' +
        '  - REFRESH_TOKEN'
      );
    }

    // ZIPファイルを作成
    const zipPath = await createZip();

    // Webストアにアップロード
    await uploadToWebStore(zipPath);

    console.log('\n✓ すべての処理が正常に完了しました');
    console.log(`  公開されたバージョン: ${version}`);
  } catch (err) {
    console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

main();
