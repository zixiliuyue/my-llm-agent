<script setup>
import { computed, ref } from 'vue';

const apiBase = import.meta.env.VITE_AGENT_API_BASE || 'http://127.0.0.1:8787';
const question = ref('计算 (18+24)*3');
const loading = ref(false);
const error = ref('');
const answer = ref('');
const events = ref([]);
const mock = ref(true);

const hasResult = computed(() => answer.value || events.value.length > 0 || error.value);

async function askAgent() {
  const text = question.value.trim();
  if (!text) {
    error.value = '请输入问题';
    return;
  }
  loading.value = true;
  error.value = '';
  answer.value = '';
  events.value = [];
  try {
    const response = await fetch(`${apiBase}/api/agent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: text, mock: mock.value }),
    });
    const body = await response.json();
    if (!response.ok || !body.ok) {
      throw new Error(body.error || `HTTP ${response.status}`);
    }
    answer.value = body.answer;
    events.value = body.events || [];
  } catch (requestError) {
    error.value = requestError.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="shell">
    <section class="workspace">
      <aside class="sidebar">
        <div class="brand">
          <span class="mark">A</span>
          <div>
            <h1>Web Agent</h1>
            <p>Day 05 · Vue3 + Vite</p>
          </div>
        </div>
        <div class="note">
          <strong>学习目标</strong>
          <span>把 CLI agent loop 包成 HTTP API，并在页面上看见 tool call 与 observation。</span>
        </div>
        <label class="switch">
          <input v-model="mock" type="checkbox" />
          <span>Mock 模式</span>
        </label>
      </aside>

      <section class="panel">
        <div class="composer">
          <label for="question">输入问题</label>
          <textarea
            id="question"
            v-model="question"
            rows="4"
            placeholder="例如：计算 (18+24)*3"
          />
          <button type="button" :disabled="loading" @click="askAgent">
            {{ loading ? '运行中...' : '运行 Agent' }}
          </button>
        </div>

        <div v-if="hasResult" class="result">
          <div v-if="error" class="error">{{ error }}</div>
          <div v-if="answer" class="answer">
            <span class="label">Final</span>
            <p>{{ answer }}</p>
          </div>
          <ol v-if="events.length" class="timeline">
            <li v-for="(event, index) in events" :key="index">
              <span class="event-type">{{ event.type }}</span>
              <code>{{ event.preview || event.tool || JSON.stringify(event) }}</code>
            </li>
          </ol>
        </div>
        <div v-else class="empty">运行后这里会显示模型消息、工具调用、observation 和最终回答。</div>
      </section>
    </section>
  </main>
</template>

