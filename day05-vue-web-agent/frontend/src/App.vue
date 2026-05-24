<script setup>
// Day 05：Vue3 Web Agent 页面。
//
// 本文件学习重点：
// 1. 用 Vue 的响应式状态保存输入、加载态、错误、最终回答和事件流。
// 2. 用浏览器 fetch 调用本地 Node 后端 /api/agent。
// 3. 把 agent loop 的 tool call、observation、final 展示到页面上。
// 注意：前端不直接调用 Ollama，真实模型地址只放在后端环境变量里。

// computed 用来声明“由其它状态推导出来”的值；ref 用来声明可变响应式状态。
import { computed, ref } from 'vue';

// VITE_AGENT_API_BASE 是 Vite 暴露给前端的环境变量。
// 不设置时默认访问本机 day05 后端：http://127.0.0.1:8787。
const apiBase = import.meta.env.VITE_AGENT_API_BASE || 'http://127.0.0.1:8787';
// question 保存 textarea 里的问题文本；ref 初始值会直接显示在输入框里。
const question = ref('计算 (18+24)*3');
// loading 表示请求是否正在进行；按钮会用它禁用重复点击。
const loading = ref(false);
// error 保存后端或网络错误，页面只在有错误时展示红色提示。
const error = ref('');
// answer 保存 agent 的最终回答，也就是后端返回的 final 文本。
const answer = ref('');
// events 保存 agent 运行过程事件，例如 model_response、tool_call、observation。
const events = ref([]);
// mock=true 表示只跑后端假数据流程，不访问真实 Ollama，适合学习 UI。
const mock = ref(true);

// hasResult 是派生状态：只要有答案、事件或错误，结果区域就应该显示。
const hasResult = computed(() => answer.value || events.value.length > 0 || error.value);

// askAgent 是点击“运行 Agent”时触发的主流程。
// 它负责校验输入、发请求、解析响应、更新页面状态。
async function askAgent() {
  // trim 去掉用户输入两边的空格，避免只有空格也被当成有效问题。
  const text = question.value.trim();
  // 输入为空时直接在页面显示错误，不发起无意义的 HTTP 请求。
  if (!text) {
    error.value = '请输入问题';
    return;
  }
  // 进入请求态：按钮禁用，页面知道当前正在等待后端返回。
  loading.value = true;
  // 每次提问前清空上一次错误，避免旧错误误导当前结果。
  error.value = '';
  // 每次提问前清空上一次答案，避免等待期间显示过期 final。
  answer.value = '';
  // 每次提问前清空事件流，确保只展示本轮 agent run。
  events.value = [];
  try {
    // /api/agent 是 day05 Node 后端暴露给前端的本地 Agent API：
    // 前端把用户问题发给后端，后端再决定使用 mock 还是真实 Ollama。
    const response = await fetch(`${apiBase}/api/agent`, {
      // POST 表示提交一个新问题给后端执行，不能用 GET 表达这个动作。
      method: 'POST',
      // 告诉后端 body 是 JSON；如果漏掉，后端可能无法正确读取请求体。
      headers: { 'content-type': 'application/json' },
      // fetch 的 body 必须是字符串，所以把下面的 JS 对象 JSON.stringify。
      body: JSON.stringify({
        // question 是用户真正输入的问题，后端会把它放进 agent 或模型请求。
        question: text,
        // mock=true 表示只演示 tool call/observation；mock=false 才会访问 Ollama。
        mock: mock.value,
      }),
    });
    // 后端统一返回 JSON；这里把响应文本解析成 JS 对象继续读字段。
    const body = await response.json();
    // response.ok 表示 HTTP 状态码是 2xx；body.ok 表示业务层也成功。
    if (!response.ok || !body.ok) {
      // 优先展示后端给出的 error，否则用 HTTP 状态码辅助定位。
      throw new Error(body.error || `HTTP ${response.status}`);
    }
    // 保存最终回答；模板里的 {{ answer }} 会自动刷新。
    answer.value = body.answer;
    // 保存事件流；如果后端没有 events 字段，回退为空数组避免 v-for 报错。
    events.value = body.events || [];
  } catch (requestError) {
    // 网络错误、JSON 解析错误或后端业务错误都会进入这里，展示给学习者。
    error.value = requestError.message;
  } finally {
    // 无论成功失败都要退出 loading，否则按钮会一直禁用。
    loading.value = false;
  }
}
</script>

<template>
  <!-- shell 是整页容器，提供页面背景和外边距。 -->
  <main class="shell">
    <!-- workspace 用 CSS grid 把左侧说明栏和右侧聊天面板排成两列。 -->
    <section class="workspace">
      <!-- sidebar 放当天学习目标和 mock 开关，不参与 agent 结果展示。 -->
      <aside class="sidebar">
        <!-- brand 是页面标题区域，帮助识别这是 Day 05 的 Web Agent。 -->
        <div class="brand">
          <!-- mark 是一个简单视觉标记，不承载业务状态。 -->
          <span class="mark">A</span>
          <div>
            <h1>Web Agent</h1>
            <p>Day 05 · Vue3 + Vite</p>
          </div>
        </div>
        <!-- note 说明今天要学的概念；这是固定静态文案。 -->
        <div class="note">
          <strong>学习目标</strong>
          <span>把 CLI agent loop 包成 HTTP API，并在页面上看见 tool call 与 observation。</span>
        </div>
        <!-- switch 是 mock 模式开关，label 包住 input 后点击文字也能切换。 -->
        <label class="switch">
          <!-- v-model 把 checkbox 的选中状态和 mock 这个 ref 双向绑定。 -->
          <input v-model="mock" type="checkbox" />
          <span>Mock 模式</span>
        </label>
      </aside>

      <!-- panel 是主要操作区：输入问题、运行 agent、展示结果。 -->
      <section class="panel">
        <!-- composer 是提问表单区域，不使用 form，避免回车默认刷新页面。 -->
        <div class="composer">
          <!-- label 的 for 对应 textarea id，提升可访问性和点击体验。 -->
          <label for="question">输入问题</label>
          <!-- v-model 让 textarea 内容实时同步到 question.value。 -->
          <!-- rows 控制初始高度；用户仍可用 CSS 的 resize 纵向调整。 -->
          <textarea
            id="question"
            v-model="question"
            rows="4"
            placeholder="例如：计算 (18+24)*3"
          />
          <!-- :disabled 是动态属性绑定；loading=true 时按钮不可重复点击。 -->
          <!-- @click 是事件绑定；点击按钮会执行 askAgent 函数。 -->
          <button type="button" :disabled="loading" @click="askAgent">
            <!-- mustache 插值会根据 loading 动态显示按钮文字。 -->
            {{ loading ? '运行中...' : '运行 Agent' }}
          </button>
        </div>

        <!-- v-if 只有在有结果、事件或错误时才渲染结果区域。 -->
        <div v-if="hasResult" class="result">
          <!-- 有错误时显示错误块；没有错误时这段 DOM 不存在。 -->
          <div v-if="error" class="error">{{ error }}</div>
          <!-- 有最终回答时显示 Final 区块。 -->
          <div v-if="answer" class="answer">
            <span class="label">Final</span>
            <p>{{ answer }}</p>
          </div>
          <!-- events.length 为真时展示 agent 过程时间线。 -->
          <ol v-if="events.length" class="timeline">
            <!-- v-for 遍历每个事件；index 作为 key 足够用于这类只追加展示列表。 -->
            <li v-for="(event, index) in events" :key="index">
              <span class="event-type">{{ event.type }}</span>
              <!-- 优先展示 preview，其次展示 tool；都没有时展示完整 JSON 方便调试。 -->
              <code>{{ event.preview || event.tool || JSON.stringify(event) }}</code>
            </li>
          </ol>
        </div>
        <!-- v-else 表示还没有任何结果时展示空状态说明。 -->
        <div v-else class="empty">运行后这里会显示模型消息、工具调用、observation 和最终回答。</div>
      </section>
    </section>
  </main>
</template>
