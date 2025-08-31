@echo off
echo.
echo =====================================
echo    🚀 FHEVM DApp6 演示启动器
echo =====================================
echo.
echo 正在启动基于Zama官方SDK的FHEVM应用...
echo ✅ 使用官方Zama CDN (relayer-sdk-js 0.1.2)
echo ✅ 完整的SDK验证系统
echo ✅ Sepolia网络支持 (chainId: 11155111)  
echo ✅ PublicKey缓存系统
echo ✅ createFhevmInstance函数配置
echo ✅ 随机空闲端口自动分配
echo.

cd /d "%~dp0"
node start-random-port.js

pause