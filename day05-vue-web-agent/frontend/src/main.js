/**
 * Day 5：自包含学习源码。
 *
 * 这个文件属于 day05-vue-web-agent，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import { createApp } from 'vue';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import App from './App.vue';
// 教学：导入依赖：这一行把当前文件需要用到的模块或函数拿进来。
import './styles.css';

// 教学：调用函数：把当前数据交给已有逻辑处理。
createApp(App).mount('#app');

