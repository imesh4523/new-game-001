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
  /^\.git\//,
  /^node_modules\//,
  /^\.replit$/,
  /^replit\.nix$/,
  /^\.config\//,
  /^\.upm\//,
  /^\.cache\//,
  /^dist\//,
  /^\.npm\//,
  /^\.local\//,
  /\.log$/,
  /^\.DS_Store$/,
  /^\.env$/,
  /\.lock$/,
  /^\.breakpoints$/,
  /^\.agent-logs\//,
  /^cookies\.txt$/
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      const relativePath = path.relative(process.cwd(), fullPath);
      
      if (shouldIgnore(relativePath)) {
        return;
      }

      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else if (stat.isFile()) {
          arrayOfFiles.push(fullPath);
        }
      } catch (err) {
        // Skip files that can't be accessed
      }
    });
  } catch (err) {
    // Skip directories that can't be read
  }

  return arrayOfFiles;
}

async function uploadFilesToGitHub() {
  try {
    console.log('🚀 Starting GitHub push...');
    
    const octokit = await getGitHubClient();
    const { data: user } = await octokit.users.getAuthenticated();
    const owner = user.login;
    const repo = 'Top-11';
    
    console.log(`✅ Authenticated as: ${owner}`);
    console.log(`📦 Repository: ${repo}`);
    
    // Step 1: Initialize repository with README
    console.log('📝 Initializing repository...');
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'README.md',
        message: 'Initialize repository',
        content: Buffer.from('# Top-11\n\nGaming platform with VIP system').toString('base64')
      });
      console.log('✅ Repository initialized');
    } catch (error: any) {
      if (error.status !== 422) { // 422 means file already exists
        throw error;
      }
      console.log('✅ Repository already initialized');
    }
    
    // Get all files
    console.log('📂 Scanning project files...');
    const files = getAllFiles(process.cwd());
    console.log(`📋 Found ${files.length} files to upload`);
    
    // Get the latest commit
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
    
    // Create blobs for all files
    console.log('📤 Creating blobs...');
    const blobs: Array<{ path: string; sha: string; mode: string }> = [];
    
    let uploadedCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(async (file) => {
        const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');
        try {
          const content = fs.readFileSync(file);
          const { data: blob } = await octokit.git.createBlob({
            owner,
            repo,
            content: content.toString('base64'),
            encoding: 'base64'
          });
          
          return {
            path: relativePath,
            sha: blob.sha,
            mode: '100644'
          };
        } catch (error: any) {
          console.error(`   ❌ Failed to upload ${relativePath}:`, error.message);
          return null;
        }
      });
      
      const results = await Promise.all(batchPromises);
      blobs.push(...results.filter(r => r !== null) as any[]);
      
      uploadedCount += batch.length;
      console.log(`   Uploaded ${uploadedCount}/${files.length} files...`);
    }
    
    console.log(`✅ Created ${blobs.length} blobs`);
    
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
      base_tree: commit.tree.sha
    });
    
    console.log('✅ Tree created');
    
    // Create commit
    console.log('💾 Creating commit...');
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: 'Complete project code - Top-11 Gaming Platform',
      tree: tree.sha,
      parents: [commit.sha]
    });
    
    console.log('✅ Commit created');
    
    // Update reference
    console.log('🔄 Updating main branch...');
    await octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: newCommit.sha,
      force: true
    });
    
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
