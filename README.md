# 智能医学量表采集助手 (Intelligent Medical Scale Assistant)

一个基于 Next.js 和 Google Gemini API 构建的对话式医学量表采集 Web 应用。本项目旨在通过模拟日常聊天的交互方式，结合 AI 智能释义和语音输入，帮助患儿家属轻松、准确地完成复杂的医学量表填写。

## ✨ 核心特性

- 💬 **对话式交互 (Conversational UI)**：告别枯燥、压抑的传统静态长表单，采用类似微信的一问一答聊天流界面，降低用户的认知负担。
- 🧠 **AI 智能释义 (AI Explanation)**：深度集成 Google Gemini 大模型。AI 被设定为“拥有20年临床经验的发育行为儿科主治医师”，当用户对题目产生困惑时，AI 会用不超过小学六年级的阅读难度进行生活化解释，且严格遵守不提供直接医疗诊断的原则。
- 🎙️ **语音转文字 (Voice Input)**：无缝接入浏览器原生的 Web Speech API。用户只需按住麦克风图标即可说话，系统会实时将语音转化为文字，极大提升输入效率。
- ⚙️ **JSON 驱动量表 (JSON Schema Driven)**：量表数据（包含题目、选项、分值等）完全与 UI 组件解耦，由独立的 JSON 文件驱动。您可以零代码修改 JSON 来快速替换或扩展自定义量表。
- 🔑 **自定义 API Key (Custom API Key)**：支持用户在前端界面（右上角设置）自行配置 Google Gemini API Key。密钥仅安全地存储在浏览器的 `localStorage` 中，用于纯前端的大模型鉴权。
- 📊 **CSV 结果导出 (Export to CSV)**：量表填写完成后，系统会自动汇总用户的回答记录（题号、题目、用户选择的答案、得分），并支持一键导出为 `.csv` 表格文件，方便医生后续评估。
- 📈 **实时进度指示 (Progress Tracking)**：界面顶部提供清晰的进度条，实时展示当前答题进度。

## 🛠️ 技术栈

- **框架**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI 库**: [React 19](https://react.dev/)
- **样式**: [Tailwind CSS v4](https://tailwindcss.com/)
- **动画**: [Motion](https://motion.dev/) (原 Framer Motion)
- **大模型 SDK**: [@google/genai](https://www.npmjs.com/package/@google/genai)
- **图标**: [Lucide React](https://lucide.dev/)

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境变量配置 (可选)

您可以直接在应用界面的右上角“设置”中输入 API Key，也可以在项目根目录创建 `.env.local` 文件并配置默认的 API Key：

```env
NEXT_PUBLIC_GEMINI_API_KEY="your_google_gemini_api_key_here"
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可查看应用。

## 📁 核心文件结构

```text
├── app/
│   ├── layout.tsx         # 全局布局与字体配置
│   ├── page.tsx           # 应用主入口
│   └── globals.css        # 全局样式与 Tailwind 引入
├── components/
│   └── chat-ui.tsx        # 核心对话流组件（包含 AI 逻辑、语音识别、导出等）
├── data/
│   └── scale.json         # 量表配置文件（在此修改题目和选项）
└── metadata.json          # AI Studio 平台应用元数据
```

## 📝 如何自定义量表？

您只需修改 `data/scale.json` 文件即可替换量表内容。标准的数据结构如下：

```json
{
  "metadata": {
    "title": "您的量表名称",
    "description": "量表简介",
    "total": 4 // 总题数
  },
  "questions": [
    {
      "id": "q1",
      "text": "您的第一道题目内容？",
      "options": [
        {"label": "选项 A", "score": 0},
        {"label": "选项 B", "score": 1},
        {"label": "选项 C", "score": 2}
      ]
    }
    // 继续添加更多题目...
  ]
}
```

## ⚠️ 注意事项

1. **语音识别兼容性**：语音输入功能依赖于浏览器原生的 `Web Speech API`，建议使用最新版的 Google Chrome、Edge 或 Safari 浏览器以获得最佳体验。
2. **AI 医疗免责声明**：本应用中的 AI 仅作为**辅助释义工具**，其生成的解释**不构成任何专业的医疗诊断或治疗建议**。最终的医学评估请务必以专业医生的面诊结论为准。
