import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface DeploymentConfig {
  dropletId: number;
  dropletName: string;
  ipAddress: string;
  sshUser?: string;
  sshKeyPath?: string;
}

interface DeploymentResult {
  success: boolean;
  message: string;
  logs?: string;
  error?: string;
}

export class DeploymentService {
  private sshUser: string;
  private sshKeyPath: string;

  constructor() {
    // Default SSH user (can be overridden)
    this.sshUser = process.env.SSH_USER || 'root';
    this.sshKeyPath = process.env.SSH_KEY_PATH || '~/.ssh/id_rsa';
  }

  /**
   * Deploy application to a Digital Ocean droplet
   */
  async deployToDroplet(config: DeploymentConfig): Promise<DeploymentResult> {
    try {
      console.log(`🚀 Starting deployment to ${config.dropletName} (${config.ipAddress})...`);

      // Step 1: Test SSH connection
      const connectionTest = await this.testSSHConnection(config.ipAddress);
      if (!connectionTest.success) {
        return {
          success: false,
          message: 'SSH connection failed',
          error: connectionTest.error
        };
      }

      // Step 2: Copy deployment script to server
      const scriptPath = path.join(__dirname, 'deploy-script.sh');
      const copyResult = await this.copyFileToServer(
        scriptPath,
        config.ipAddress,
        '/tmp/deploy-script.sh'
      );

      if (!copyResult.success) {
        return {
          success: false,
          message: 'Failed to copy deployment script',
          error: copyResult.error
        };
      }

      // Step 3: Make script executable and run it
      const deployResult = await this.executeRemoteCommand(
        config.ipAddress,
        'chmod +x /tmp/deploy-script.sh && /tmp/deploy-script.sh'
      );

      if (!deployResult.success) {
        return {
          success: false,
          message: 'Deployment script execution failed',
          error: deployResult.error,
          logs: deployResult.logs
        };
      }

      console.log(`✅ Deployment to ${config.dropletName} completed successfully`);

      return {
        success: true,
        message: `Successfully deployed to ${config.dropletName}`,
        logs: deployResult.logs
      };
    } catch (error) {
      console.error(`❌ Deployment to ${config.dropletName} failed:`, error);
      return {
        success: false,
        message: 'Deployment failed with unexpected error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Setup Nginx load balancer on the primary server
   */
  async setupLoadBalancer(
    primaryServerIp: string,
    backendServers: Array<{ ip: string; weight: number }>,
    method: string = 'least_conn'
  ): Promise<DeploymentResult> {
    try {
      console.log(`⚙️  Setting up Nginx load balancer on ${primaryServerIp} with ${method} method...`);

      // Generate Nginx configuration
      const nginxConfig = await this.generateNginxConfig(backendServers, method);

      // Create temporary config file
      const tempConfigPath = '/tmp/nginx-lb.conf';
      await fs.writeFile(tempConfigPath, nginxConfig);

      // Copy config to server
      const copyResult = await this.copyFileToServer(
        tempConfigPath,
        primaryServerIp,
        '/tmp/nginx-lb.conf'
      );

      if (!copyResult.success) {
        return {
          success: false,
          message: 'Failed to copy Nginx configuration',
          error: copyResult.error
        };
      }

      // Install and configure Nginx
      const setupCommands = [
        // Install Nginx if not present
        'which nginx || (apt-get update && apt-get install -y nginx)',
        // Backup existing config
        'cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup || true',
        // Copy new config
        'cp /tmp/nginx-lb.conf /etc/nginx/sites-available/default',
        // Test configuration
        'nginx -t',
        // Reload Nginx
        'systemctl reload nginx || service nginx reload'
      ].join(' && ');

      const setupResult = await this.executeRemoteCommand(
        primaryServerIp,
        setupCommands
      );

      if (!setupResult.success) {
        return {
          success: false,
          message: 'Nginx setup failed',
          error: setupResult.error,
          logs: setupResult.logs
        };
      }

      console.log(`✅ Nginx load balancer configured successfully`);

      return {
        success: true,
        message: 'Load balancer setup completed',
        logs: setupResult.logs
      };
    } catch (error) {
      console.error(`❌ Load balancer setup failed:`, error);
      return {
        success: false,
        message: 'Load balancer setup failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test SSH connection to a server
   */
  private async testSSHConnection(ipAddress: string): Promise<DeploymentResult> {
    try {
      const command = `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${this.sshUser}@${ipAddress} "echo 'Connection successful'"`;
      const { stdout, stderr } = await execAsync(command);

      if (stdout.includes('Connection successful')) {
        return { success: true, message: 'SSH connection successful' };
      } else {
        return {
          success: false,
          message: 'SSH connection test failed',
          error: stderr
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'SSH connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Copy a file to remote server using SCP
   */
  private async copyFileToServer(
    localPath: string,
    serverIp: string,
    remotePath: string
  ): Promise<DeploymentResult> {
    try {
      const command = `scp -o StrictHostKeyChecking=no ${localPath} ${this.sshUser}@${serverIp}:${remotePath}`;
      const { stdout, stderr } = await execAsync(command);

      return {
        success: true,
        message: 'File copied successfully',
        logs: stdout
      };
    } catch (error) {
      return {
        success: false,
        message: 'File copy failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a command on remote server via SSH
   */
  private async executeRemoteCommand(
    serverIp: string,
    command: string
  ): Promise<DeploymentResult> {
    try {
      const sshCommand = `ssh -o StrictHostKeyChecking=no ${this.sshUser}@${serverIp} "${command}"`;
      const { stdout, stderr } = await execAsync(sshCommand, {
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for logs
      });

      return {
        success: true,
        message: 'Command executed successfully',
        logs: stdout + (stderr ? `\nSTDERR:\n${stderr}` : '')
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Command execution failed',
        error: error.message,
        logs: error.stdout || error.stderr
      };
    }
  }

  /**
   * Generate Nginx load balancer configuration
   */
  private async generateNginxConfig(
    backendServers: Array<{ ip: string; weight: number }>,
    method: string = 'least_conn'
  ): Promise<string> {
    // Read template
    const templatePath = path.join(__dirname, 'nginx-loadbalancer.conf');
    let template = await fs.readFile(templatePath, 'utf-8');

    // Generate load balancing method directive
    let methodDirective = '';
    if (method === 'least_conn') {
      methodDirective = '    least_conn;';
    } else if (method === 'ip_hash') {
      methodDirective = '    ip_hash;';
    }
    // round_robin is default, no directive needed

    // Generate upstream servers configuration
    const serversConfig = backendServers
      .map(
        server =>
          `    server ${server.ip}:5000 weight=${server.weight} max_fails=3 fail_timeout=30s;`
      )
      .join('\n');

    // Replace placeholders
    template = template.replace('    # PLACEHOLDER_SERVERS', `${methodDirective}\n    \n    # Backend servers\n${serversConfig}`);

    return template;
  }

  /**
   * Deploy to multiple droplets in parallel
   */
  async deployToMultipleDroplets(
    configs: DeploymentConfig[]
  ): Promise<Array<DeploymentResult & { dropletId: number; dropletName: string }>> {
    console.log(`🚀 Starting parallel deployment to ${configs.length} servers...`);

    const deploymentPromises = configs.map(async config => {
      const result = await this.deployToDroplet(config);
      return {
        ...result,
        dropletId: config.dropletId,
        dropletName: config.dropletName
      };
    });

    const results = await Promise.all(deploymentPromises);

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Deployment completed: ${successCount}/${configs.length} successful`);

    return results;
  }
}

// Export singleton instance
export const deploymentService = new DeploymentService();
