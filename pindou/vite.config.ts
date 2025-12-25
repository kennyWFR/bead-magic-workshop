import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// 复制云函数目录的插件
function copyCloudFunctions() {
  return {
    name: 'copy-cloudfunctions',
    writeBundle() {
      const sourceDir = join(process.cwd(), 'cloudfunctions');
      const targetDir = join(process.cwd(), 'dist/dev/mp-weixin/cloudfunctions');
      
      if (existsSync(sourceDir)) {
        // 递归复制目录
        function copyDir(src: string, dest: string) {
          if (!existsSync(dest)) {
            mkdirSync(dest, { recursive: true });
          }
          
          const files = readdirSync(src);
          files.forEach(file => {
            const srcPath = join(src, file);
            const destPath = join(dest, file);
            const stat = statSync(srcPath);
            
            if (stat.isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              copyFileSync(srcPath, destPath);
            }
          });
        }
        
        try {
          copyDir(sourceDir, targetDir);
          console.log('✅ 云函数目录已复制到编译输出目录');
        } catch (error) {
          console.error('❌ 复制云函数目录失败:', error);
        }
      }
      
      // 更新 project.config.json，添加 cloudfunctionRoot 配置
      const projectConfigPath = join(process.cwd(), 'dist/dev/mp-weixin/project.config.json');
      if (existsSync(projectConfigPath)) {
        try {
          const projectConfig = JSON.parse(readFileSync(projectConfigPath, 'utf-8'));
          if (!projectConfig.cloudfunctionRoot) {
            projectConfig.cloudfunctionRoot = 'cloudfunctions/';
            writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2), 'utf-8');
            console.log('✅ 已添加 cloudfunctionRoot 配置到 project.config.json');
          }
        } catch (error) {
          console.error('❌ 更新 project.config.json 失败:', error);
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [
    uni(),
    copyCloudFunctions()
  ],
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
