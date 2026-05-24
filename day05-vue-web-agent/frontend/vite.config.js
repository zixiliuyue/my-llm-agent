// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { defineConfig } from 'vite';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5175,
  },
});

