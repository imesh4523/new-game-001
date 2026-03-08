import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

const IGNORE_PATTERNS = [
  /^\.git/,
  /^node_modules/,
  /^\.replit$/,
  /^replit\.nix$/,
  /^\.config/,
  /^\.upm/,
  /^\.cache/,
  /^dist/,
  /^\.npm/,
  /\.log$/,
  /^\.DS_Store$/,
  /^\.env$/,
  /\.lock$/
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const relativePath = path.relative(process.cwd(), fullPath);
    
    if (shouldIgnore(relativePath)) {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function uploadFilesToGitHub() {
  try {
    console.log('🚀 Starting file upload to GitHub...');
    
    const octokit = await getGitHubClient();
    const { data: user } = await octokit.users.getAuthenticated();
    const owner = user.login;
    const repo = 'Top-11';
    
    console.log(`✅ Authenticated as: ${owner}`);
    console.log(`📦 Repository: ${repo}`);
    
    // Get all files
    console.log('📂 Scanning project files...');
    const files = getAllFiles(process.cwd());
    console.log(`📋 Found ${files.length} files to upload`);
    
    // Create blobs for all files
    console.log('📤 Creating blobs...');
    const blobs: Array<{ path: string; sha: string; mode: string }> = [];
    
    let uploadedCount = 0;
    for (const file of files) {
      const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');
      const content = fs.readFileSync(file);
      
      try {
        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo,
          content: content.toString('base64'),
          encoding: 'base64'
        });
        
        blobs.push({
          path: relativePath,
          sha: blob.sha,
          mode: '100644'
        });
        
        uploadedCount++;
        if (uploadedCount % 10 === 0) {
          console.log(`   Uploaded ${uploadedCount}/${files.length} files...`);
        }
      } catch (error: any) {
        console.error(`   ❌ Failed to upload ${relativePath}:`, error.message);
      }
    }
    
    console.log(`✅ Created ${blobs.length} blobs`);
    
    // Get the latest commit SHA on main branch (if it exists)
    let baseTreeSha: string | undefined;
    try {
      const { data: ref } = await octokit.git.getRef({
        owner,
        repo,
        ref: 'heads/main'
      });
      const { data: commit } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: ref.object.sha
      });
      baseTreeSha = commit.tree.sha;
      console.log('📌 Found existing main branch');
    } catch {
      console.log('📌 No existing main branch, creating new');
    }
    
    // Create tree
    console.log('🌳 Creating git tree...');
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo,
      tree: blobs.map(blob => ({
        path: blob.path,
        mode: blob.mode as any,
        type: 'blob' as const,
        sha: blob.sha
      })),
      base_tree: baseTreeSha
    });
    
    console.log('✅ Tree created');
    
    // Create commit
    console.log('💾 Creating commit...');
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: 'Initial commit - Top-11 Gaming Platform',
      tree: tree.sha,
      parents: baseTreeSha ? [await octokit.git.getRef({ owner, repo, ref: 'heads/main' }).then(r => r.data.object.sha)] : []
    });
    
    console.log('✅ Commit created');
    
    // Update reference
    console.log('🔄 Updating main branch...');
    try {
      await octokit.git.updateRef({
        owner,
        repo,
        ref: 'heads/main',
        sha: commit.sha,
        force: true
      });
    } catch {
      // If main doesn't exist, create it
      await octokit.git.createRef({
        owner,
        repo,
        ref: 'refs/heads/main',
        sha: commit.sha
      });
    }
    
    console.log('✅ Successfully pushed all files to GitHub!');
    console.log(`🌐 Repository URL: https://github.com/${owner}/${repo}`);
    console.log(`📊 Total files uploaded: ${blobs.length}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('GitHub API Error:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

uploadFilesToGitHub()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
