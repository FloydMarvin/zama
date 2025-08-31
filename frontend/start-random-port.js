const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

// 查找可用端口
function findAvailablePort(startPort = 3000, maxAttempts = 50) {
  return new Promise((resolve, reject) => {
    let port = startPort;
    let attempts = 0;

    function tryPort() {
      if (attempts >= maxAttempts) {
        reject(new Error(`无法找到可用端口，尝试了 ${maxAttempts} 个端口`));
        return;
      }

      const server = net.createServer();
      
      server.listen(port, () => {
        const actualPort = server.address().port;
        server.close(() => {
          console.log(`✅ 找到可用端口: ${actualPort}`);
          resolve(actualPort);
        });
      });
      
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ 端口 ${port} 已被占用，尝试下一个...`);
          port++;
          attempts++;
          tryPort();
        } else {
          reject(err);
        }
      });
    }
    
    tryPort();
  });
}

// 启动开发服务器
async function startDevServer() {
  try {
    console.log('🔍 正在寻找可用端口...');
    const port = await findAvailablePort(3000);
    
    console.log(`🚀 在端口 ${port} 启动React开发服务器...`);
    console.log(`🌐 应用将在 http://localhost:${port} 打开`);
    
    // 设置环境变量
    const env = {
      ...process.env,
      PORT: port.toString(),
      BROWSER: 'none', // 禁用自动打开浏览器
      SKIP_PREFLIGHT_CHECK: 'true',
      DANGEROUSLY_DISABLE_HOST_CHECK: 'true',
      GENERATE_SOURCEMAP: 'false'
    };
    
    // 启动React开发服务器
    const child = spawn('npm', ['start'], {
      stdio: 'inherit',
      env: env,
      cwd: path.dirname(__filename),
      shell: true
    });
    
    // 延迟3秒后打开浏览器
    setTimeout(() => {
      console.log(`\n🌟 准备就绪! 访问: http://localhost:${port}`);
      console.log(`📱 移动端访问: http://192.168.x.x:${port}`);
      console.log(`🛑 按 Ctrl+C 停止服务器\n`);
      
      // 尝试打开浏览器
      const { exec } = require('child_process');
      const url = `http://localhost:${port}`;
      
      // Windows
      if (process.platform === 'win32') {
        exec(`start "" "${url}"`, (err) => {
          if (err) console.log('请手动打开浏览器访问:', url);
        });
      }
      // macOS
      else if (process.platform === 'darwin') {
        exec(`open "${url}"`, (err) => {
          if (err) console.log('请手动打开浏览器访问:', url);
        });
      }
      // Linux
      else {
        exec(`xdg-open "${url}"`, (err) => {
          if (err) console.log('请手动打开浏览器访问:', url);
        });
      }
    }, 3000);
    
    child.on('close', (code) => {
      console.log(`\n🔴 开发服务器已停止 (退出码: ${code})`);
    });
    
    child.on('error', (err) => {
      console.error('❌ 启动失败:', err.message);
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n👋 正在退出...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 正在退出...');
  process.exit(0);
});

// 启动
startDevServer();