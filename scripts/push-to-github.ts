import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
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

async function createRepositoryAndPush() {
  try {
    console.log('🚀 Starting GitHub repository creation...');
    
    // Get GitHub client
    const octokit = await getGitHubClient();
    
    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${user.login}`);
    
    // Create repository
    console.log('📦 Creating repository "Top-11"...');
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: 'Top-11',
      description: 'Gaming platform with VIP system',
      private: false,
      auto_init: false
    });
    
    console.log(`✅ Repository created: ${repo.html_url}`);
    
    // Initialize git and push
    console.log('📤 Initializing git and pushing code...');
    
    // Check if git is already initialized
    try {
      await execAsync('git status');
      console.log('Git already initialized');
    } catch {
      console.log('Initializing git...');
      await execAsync('git init');
    }
    
    // Configure git user if not set
    try {
      await execAsync('git config user.email || git config user.email "replit@users.noreply.github.com"');
      await execAsync('git config user.name || git config user.name "Replit User"');
    } catch {
      await execAsync('git config user.email "replit@users.noreply.github.com"');
      await execAsync('git config user.name "Replit User"');
    }
    
    // Add all files
    console.log('Adding files...');
    await execAsync('git add -A');
    
    // Commit
    console.log('Creating commit...');
    try {
      await execAsync('git commit -m "Initial commit - Top-11 Gaming Platform"');
    } catch (error: any) {
      if (error.message.includes('nothing to commit')) {
        console.log('Nothing to commit, checking if already pushed...');
      } else {
        throw error;
      }
    }
    
    // Add remote
    console.log('Adding remote...');
    try {
      await execAsync(`git remote add origin ${repo.clone_url.replace('https://', `https://${await getAccessToken()}@`)}`);
    } catch (error: any) {
      if (error.message.includes('remote origin already exists')) {
        console.log('Remote already exists, updating...');
        await execAsync(`git remote set-url origin ${repo.clone_url.replace('https://', `https://${await getAccessToken()}@`)}`);
      } else {
        throw error;
      }
    }
    
    // Push to GitHub
    console.log('Pushing to GitHub...');
    await execAsync('git branch -M main');
    await execAsync('git push -u origin main --force');
    
    console.log('✅ Successfully pushed to GitHub!');
    console.log(`🌐 Repository URL: ${repo.html_url}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('GitHub API Error:', error.response.data);
    }
    throw error;
  }
}

// Run the script
createRepositoryAndPush()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
