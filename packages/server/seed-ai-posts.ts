/**
 * 种子脚本：生成 200 篇关于 AI 的示例文章。
 *
 * 运行：在 packages/server 下执行 `npx -y tsx seed-ai-posts.ts`
 *
 * 图片策略：统一使用 https://picsum.photos 提供的真实可加载图片（按 seed 固定），
 * 确保每个封面图与正文配图都能正常显示。如部署环境无法访问 picsum，
 * 可把下方 IMG_BASE 改成你自己的图片 CDN 前缀。
 */
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const DATABASE_URL =
  process.env['DATABASE_URL'] ||
  'postgresql://postgres:postgres@localhost:5432/blog_db?schema=public';

const IMG_BASE = 'https://picsum.photos/seed';

function img(seed: string, w = 800, h = 450): string {
  return `${IMG_BASE}/${encodeURIComponent(seed)}/${w}/${h}`;
}

interface Section {
  heading: string;
  body: string[];
}

interface Topic {
  en: string;
  category: string;
  tags: string[];
  title: string;
  summary: string;
  intro: string;
  sections: Section[];
  conclusion: string;
}

const TOPICS: Topic[] = [
  {
    en: 'llm-principles',
    category: '大语言模型',
    tags: ['大语言模型', 'LLM', 'Transformer'],
    title: '大语言模型（LLM）原理与实践',
    summary: '从 Transformer 到自回归生成，系统梳理大语言模型的工作机制与落地要点。',
    intro:
      '大语言模型（Large Language Model, LLM）已经成为自然语言处理乃至整个人工智能领域最重要的技术底座。理解它的底层原理，有助于我们在工程实践中扬长避短。',
    sections: [
      {
        heading: '一、从 Transformer 说起',
        body: [
          '现代大语言模型几乎都建立在 Transformer 架构之上。自注意力机制让模型能够并行地建模序列中任意两个位置之间的依赖关系，从而突破了 RNN 的串行瓶颈。',
          '位置编码、多头注意力与前馈网络共同构成了 Transformer 的基本单元。通过堆叠数十层甚至上百层这样的结构，模型得以捕捉从词法到语义再到篇章层面的复杂模式。',
        ],
      },
      {
        heading: '二、预训练与自回归生成',
        body: [
          '预训练阶段，模型在海量语料上以「预测下一个 token」为目标学习语言分布。这种简单的目标配合足够的规模，意外地涌现出推理、翻译、代码生成等能力。',
          '推理时，模型以自回归方式逐个生成 token，并可通过温度、top-p 等采样参数控制输出的多样性与确定性。',
        ],
      },
    ],
    conclusion:
      '掌握 LLM 的原理只是第一步，真正的价值在于把它稳妥地嵌入业务闭环。后续文章会继续探讨微调、RAG 与评测等工程话题。',
  },
  {
    en: 'rag-system',
    category: '大语言模型',
    tags: ['RAG', '向量数据库', '检索增强'],
    title: 'RAG 检索增强生成：让大模型“有据可依”',
    summary: 'RAG 通过外挂知识库补足大模型的静态知识短板，是企业落地的关键范式。',
    intro:
      '尽管大模型参数里压缩了海量知识，但它无法记住私有数据，也容易产生幻觉。检索增强生成（Retrieval-Augmented Generation, RAG）把「检索」与「生成」结合，让回答基于真实文档。',
    sections: [
      {
        heading: '一、RAG 的基本链路',
        body: [
          '典型 RAG 流程包括：文档切分、向量化、写入向量数据库、query 向量检索、拼接上下文、交给大模型生成。检索质量直接决定最终效果。',
          '切分策略（chunk size、overlap）与 embedding 模型的选择，往往比模型本身更影响召回率。',
        ],
      },
      {
        heading: '二、工程中的常见坑',
        body: [
          '上下文过长会稀释关键信息，建议对检索结果做重排序（rerank）与去重。',
          '定期重建索引、处理文档更新，是保证知识时效性的必要运维动作。',
        ],
      },
    ],
    conclusion:
      'RAG 不是银弹，但它是当前把大模型接入企业私有知识最务实的路径。下一期我们聊聊向量数据库选型。',
  },
  {
    en: 'prompt-engineering',
    category: 'AI 工具',
    tags: ['Prompt工程', '大语言模型', 'AI工具'],
    title: 'Prompt 工程实战：写出让模型“秒懂”的提示词',
    summary: '角色、任务、约束、示例——拆解高质量提示词的四个支柱。',
    intro:
      '很多人觉得大模型“不听话”，其实多半是提示词不够清晰。好的 Prompt 能显著降低试错成本，让输出稳定可控。',
    sections: [
      {
        heading: '一、四要素模板',
        body: [
          '一个 robust 的提示词通常包含：角色设定、明确任务、输出约束、以及少量示例（few-shot）。',
          '把复杂任务拆成步骤，并让模型先“思考再回答”，能显著提升逻辑类任务的正确率。',
        ],
      },
      {
        heading: '二、迭代与评测',
        body: [
          '提示词需要像代码一样被版本化管理，并配合一批测试用例做回归。',
          '善用结构化输出（JSON/XML）便于下游程序解析，减少格式噪声。',
        ],
      },
    ],
    conclusion: 'Prompt 工程是一门经验学科，多写、多测、多沉淀，才能形成可复用的提示词资产。',
  },
  {
    en: 'diffusion-models',
    category: '多模态',
    tags: ['扩散模型', 'AI绘画', '多模态'],
    title: '扩散模型入门：AI 绘画背后的数学直觉',
    summary: '从“逐步去噪”的视角理解 Stable Diffusion 等生成模型的工作方式。',
    intro:
      '最近一年，文生图应用席卷社交网络。支撑它们的核心算法是扩散模型（Diffusion Model），其思想优雅而强大。',
    sections: [
      {
        heading: '一、前向与反向过程',
        body: [
          '前向过程不断往图像中加入高斯噪声，直到变成纯噪声；反向过程则训练神经网络一步步去噪，从噪声中“雕刻”出清晰图像。',
          '通过条件输入（文本 embedding），模型可以在去噪时对齐语义，实现“按描述作画”。',
        ],
      },
      {
        heading: '二、潜空间扩散',
        body: [
          'Stable Diffusion 先在压缩后的潜空间（latent space）上做扩散，大幅降低计算量，使消费级显卡也能跑起来。',
          '理解潜空间，有助于调参（步数、CFG、种子）与可控生成。',
        ],
      },
    ],
    conclusion: '扩散模型只是生成式 AI 的一个切面，视频、3D 生成正沿着类似思路快速演进。',
  },
  {
    en: 'cv-foundation',
    category: '计算机视觉',
    tags: ['计算机视觉', '深度学习', '神经网络'],
    title: '计算机视觉基础：让机器“看懂”世界',
    summary: '从卷积到检测分割，梳理计算机视觉的核心任务与典型网络。',
    intro:
      '计算机视觉致力于让机器从图像与视频中提取语义。卷积神经网络（CNN）是这一领域的经典支柱。',
    sections: [
      {
        heading: '一、卷积与特征提取',
        body: [
          '卷积核在局部滑动提取边缘、纹理等低级特征，深层网络逐步组合出部件、物体等高级语义。',
          '池化与残差连接缓解了梯度消失，使网络可以训练得更深。',
        ],
      },
      {
        heading: '二、检测与分割',
        body: [
          '目标检测在定位框的同时识别类别；语义/实例分割则精确到像素级。',
          'Transformer 架构（如 ViT）正把视觉任务统一到“token + attention”的范式下。',
        ],
      },
    ],
    conclusion: '视觉模型已深入安防、医疗、零售等场景，与语言模型的融合更打开了多模态的大门。',
  },
  {
    en: 'nlp-evolution',
    category: '自然语言处理',
    tags: ['自然语言处理', 'Transformer', '机器学习'],
    title: '自然语言处理简史：从规则到神经网络',
    summary: '回顾 NLP 从词典规则、统计模型到预训练范式的演进脉络。',
    intro:
      '自然语言处理（NLP）是人工智能中与人最直接相关的分支。它的方法论经历了数次范式转移。',
    sections: [
      {
        heading: '一、规则与统计时代',
        body: [
          '早期依赖人工规则与词典；随后统计机器学习（如 HMM、CRF）用数据驱动特征。',
          '词向量（Word2Vec）让词语首次拥有可计算的稠密表示，是深度时代的序章。',
        ],
      },
      {
        heading: '二、预训练范式',
        body: [
          'BERT 用掩码语言模型双向编码，GPT 用自回归单向生成，二者共同开启了“预训练+微调”时代。',
          '今天的 LLM 把这一范式推向极致，几乎统一了各类语言任务。',
        ],
      },
    ],
    conclusion: 'NLP 的演进说明：当算力、数据与算法同时到位，范式转移会来得比想象更快。',
  },
  {
    en: 'ml-basics',
    category: '机器学习',
    tags: ['机器学习', '算法', '数据科学'],
    title: '机器学习入门：监督、无监督与强化学习',
    summary: '厘清三大学习范式的定义、典型任务与适用场景。',
    intro:
      '机器学习是人工智能的方法论核心。按“是否有标签、如何反馈”，可分为三大范式。',
    sections: [
      {
        heading: '一、监督与无监督',
        body: [
          '监督学习从带标注的数据中学习输入到输出的映射，典型如分类与回归。',
          '无监督学习在数据无标签时挖掘结构，如聚类、降维，常用于探索性分析。',
        ],
      },
      {
        heading: '二、强化学习',
        body: [
          '智能体在环境中通过“试错—奖励”不断调整策略，适合序列决策问题。',
          '从 AlphaGo 到 robotics，强化学习展示了在复杂博弈中的惊人潜力。',
        ],
      },
    ],
    conclusion: '范式之间没有高下，选对问题对应的学习方法，比追逐新模型更重要。',
  },
  {
    en: 'deep-learning',
    category: '深度学习',
    tags: ['深度学习', '神经网络', '机器学习'],
    title: '深度学习为什么有效：表示学习的力量',
    summary: '从端到端表示学习解释深度模型在感知任务上的成功。',
    intro:
      '深度学习并非新概念，但算力和数据的爆发让它焕发新生。其本质优势在于自动学习层次化表示。',
    sections: [
      {
        heading: '一、端到端表示',
        body: [
          '传统方法依赖人工特征工程；深度学习让模型从原始数据中自动学到有用特征。',
          '层数越深，抽象层级越高，越能捕捉语义层面的不变性。',
        ],
      },
      {
        heading: '二、训练挑战',
        body: [
          '梯度消失/爆炸、过拟合、调参困难是常见挑战，需借助归一化、正则化与大规模数据缓解。',
          '框架与分布式训练的成熟，让训练大模型成为可工程化的工作。',
        ],
      },
    ],
    conclusion: '深度学习把“特征”这件事交给了数据本身，这是它区别于传统机器学习的关键。',
  },
  {
    en: 'ai-ethics',
    category: 'AI 伦理',
    tags: ['AI伦理', '安全', '可解释性'],
    title: 'AI 伦理与安全：能力越大，责任越大',
    summary: '讨论偏见、隐私、可解释性与对齐等大模型时代的关键议题。',
    intro:
      '当 AI 深入社会关键场景，伦理与安全不再是事后补丁，而是设计之初就要考虑的约束。',
    sections: [
      {
        heading: '一、偏见与公平',
        body: [
          '训练数据中的历史偏见会被模型放大，造成对特定群体的不公平对待。',
          '需在数据采集、评测与上线后监控全流程中引入公平性指标。',
        ],
      },
      {
        heading: '二、对齐与可解释',
        body: [
          '让模型目标与人类真实意图一致（对齐）是核心难题；可解释性方法帮助审计决策依据。',
          '红队测试、人类反馈强化学习（RLHF）是当前主流的对齐手段。',
        ],
      },
    ],
    conclusion: '技术发展越快，治理越要跟上。负责任的 AI 需要工程、法律与公众共同参与。',
  },
  {
    en: 'ai-agents',
    category: 'AI 工具',
    tags: ['AI Agent', '大语言模型', '自动化'],
    title: 'AI Agent：会“自己干活”的智能体',
    summary: '解析规划-记忆-工具调用闭环，看 Agent 如何完成多步任务。',
    intro:
      '单纯问答已不能满足需求，AI Agent 通过调用工具、维护记忆，自主完成多步骤目标。',
    sections: [
      {
        heading: '一、Agent 的核心闭环',
        body: [
          '一个典型 Agent 包括：规划（拆解任务）、记忆（短期/长期）、行动（调用工具/API）。',
          'ReAct 等范式让模型在“思考”与“行动”间交替，显著提升复杂任务成功率。',
        ],
      },
      {
        heading: '二、工具与编排',
        body: [
          '把搜索、代码执行、数据库查询封装为工具，Agent 的能力边界随之扩展。',
          '多 Agent 协作（规划者/执行者/评审者）可进一步分摊复杂任务。',
        ],
      },
    ],
    conclusion: 'Agent 正在重塑“软件如何使用”的方式，但可靠的编排与兜底仍是工程重点。',
  },
  {
    en: 'vector-db',
    category: '大语言模型',
    tags: ['向量数据库', 'RAG', '检索'],
    title: '向量数据库选型：RAG 系统的存储基石',
    summary: '对比主流向量库的索引算法、性能与运维差异，给出选型建议。',
    intro:
      'RAG 的表现很大程度取决于向量检索的质量与延迟。选对向量数据库，事半功倍。',
    sections: [
      {
        heading: '一、索引算法',
        body: [
          'HNSW、IVF-PQ 等近似最近邻（ANN）算法在召回率与速度间权衡。',
          '量化压缩能显著降低内存占用，但会牺牲少量精度。',
        ],
      },
      {
        heading: '二、工程考量',
        body: [
          '除向量检索外，元数据过滤、混合检索（BM25+向量）与水平扩展同样重要。',
          '托管服务降低运维成本，自建则更可控、成本更低。',
        ],
      },
    ],
    conclusion: '没有最好的向量库，只有最适合你规模与团队能力的那一个。',
  },
  {
    en: 'fine-tuning',
    category: '大语言模型',
    tags: ['微调', 'LoRA', '大语言模型'],
    title: '微调还是提示？大模型定制化的两条路径',
    summary: '对比全量微调、参数高效微调（PEFT）与提示工程的取舍。',
    intro:
      '要让通用大模型适配你的领域，常见做法是微调或精巧提示。二者成本与效果各不相同。',
    sections: [
      {
        heading: '一、参数高效微调',
        body: [
          'LoRA、QLoRA 等方法只训练少量适配参数，显存友好且可插拔，是中小团队的首选。',
          '相比全量微调，PEFT 大幅降低训练成本，同时保留基座能力。',
        ],
      },
      {
        heading: '二、何时用提示',
        body: [
          '若任务可通过上下文示例表达，Prompt+RAG 往往更快上线、更易维护。',
          '当风格、格式或领域知识必须“内化”时，微调才更值得投入。',
        ],
      },
    ],
    conclusion: '先用提示+RAG 打基线，收益不足再上微调，是稳健的迭代顺序。',
  },
  {
    en: 'multimodal',
    category: '多模态',
    tags: ['多模态', '视觉语言', '大模型'],
    title: '多模态大模型：让模型同时“看”与“说”',
    summary: '图文对齐、视觉编码器与跨模态注意力如何统一感知与语言。',
    intro:
      '多模态模型把图像、文本甚至音频映射到同一语义空间，实现看图说话、视觉问答等能力。',
    sections: [
      {
        heading: '一、对齐与融合',
        body: [
          '视觉编码器（如 ViT）产出图像 token，与文本 token 拼接后由统一 Transformer 处理。',
          '对比学习让图文在表示空间彼此靠近，是跨模态理解的关键。',
        ],
      },
      {
        heading: '二、应用前沿',
        body: [
          '文档理解、UI 自动化、具身智能都依赖稳定的多模态感知。',
          '视频与 3D 模态的加入，正把“世界模型”的想象推向现实。',
        ],
      },
    ],
    conclusion: '多模态是通向更通用智能的重要一步，也让 AI 的应用界面更自然。',
  },
  {
    en: 'reinforcement-learning',
    category: '机器学习',
    tags: ['强化学习', '决策', '机器人'],
    title: '强化学习实战：从奖励设计到策略优化',
    summary: '剖析奖励塑形、探索利用与策略梯度等 RL 核心概念。',
    intro:
      '强化学习关注“在不确定性中做决策”。它在游戏、控制与推荐中都有用武之地。',
    sections: [
      {
        heading: '一、奖励与探索',
        body: [
          '奖励函数定义了“什么是好”，设计不当会诱导出意外行为（奖励黑客）。',
          '探索-利用权衡决定 agent 是尝试新动作还是利用已知收益。',
        ],
      },
      {
        heading: '二、主流算法',
        body: [
          '策略梯度、PPO、SAC 等算法在稳定性与样本效率上各有侧重。',
          '离线 RL 让模型从固定数据中学习，更适合无法随意试错的业务场景。',
        ],
      },
    ],
    conclusion: 'RL 的难点常在“环境”与“奖励”，而非算法本身。先把问题建模清楚。',
  },
  {
    en: 'neural-networks',
    category: '深度学习',
    tags: ['神经网络', '深度学习', '数学'],
    title: '神经网络真的在“理解”吗？',
    summary: '从函数拟合视角拆解神经网络的能力边界与误区。',
    intro:
      '神经网络常被拟人化，但其本质是可微分的复合函数。理性看待它的能力很重要。',
    sections: [
      {
        heading: '一、拟合与泛化',
        body: [
          '足够宽的网络可逼近任意连续函数；泛化能力则来自数据分布与正则。',
          '过参数化带来了双下降等反直觉现象，仍是活跃的研究课题。',
        ],
      },
      {
        heading: '二、能力的边界',
        body: [
          '模型擅长统计模式，却缺乏真正的因果与物理常识。',
          '把概率生成误读为“确信”，是幻觉与过度自信的根源之一。',
        ],
      },
    ],
    conclusion: '把神经网络当作强大的模式机，而不是会思考的“人”，能帮我们更好驾驭它。',
  },
  {
    en: 'ai-coding',
    category: 'AI 工具',
    tags: ['AI编程', 'Copilot', '生产力'],
    title: 'AI 编程助手实测：效率提升还是技术债？',
    summary: '结合一线经验谈代码生成工具的收益、风险与最佳实践。',
    intro:
      'GitHub Copilot、Cursor 等工具已深入日常开发。它们究竟改变了什么？',
    sections: [
      {
        heading: '一、收益与节奏',
        body: [
          '样板代码、单测、正则与 SQL 是 AI 最擅长的“省力区”。',
          '配对式编程让开发者更聚焦架构与边界，而非记忆语法细节。',
        ],
      },
      {
        heading: '二、风险与治理',
        body: [
          '未经审查地接受建议，可能引入漏洞与隐性技术债。',
          '把 AI 输出当作“需review的初级工程师”，并配合强测试文化最稳妥。',
        ],
      },
    ],
    conclusion: 'AI 编程不会取代工程师，但会用 AI 的工程师会取代不用 AI 的工程师。',
  },
  {
    en: 'model-eval',
    category: '大语言模型',
    tags: ['评测', '基准', '大语言模型'],
    title: '如何科学地评测一个大模型？',
    summary: '从基准测试、人工评估到线上指标，建立立体评测体系。',
    intro:
      '“哪个模型更好”是个陷阱式问题。评测必须回到你的真实任务与用户。',
    sections: [
      {
        heading: '一、离线基准',
        body: [
          'MMLU、GSM8K 等公开基准提供横向参考，但易被“刷榜”失真。',
          '领域小数据集 + 人工标注，往往比通用榜更贴近业务。',
        ],
      },
      {
        heading: '二、线上与人工',
        body: [
          '留存率、采纳率、任务完成率才是最终裁判。',
          '点对点盲测（A/B）能有效剔除“品牌偏好”干扰。',
        ],
      },
    ],
    conclusion: '评测不是一次性动作，而应嵌入模型选型与迭代的常态化流程。',
  },
  {
    en: 'edge-ai',
    category: 'AI 工具',
    tags: ['端侧AI', '推理优化', '移动端'],
    title: '端侧 AI：把模型装进手机与 IoT',
    summary: '量化、蒸馏与推理框架如何让 AI 在资源受限设备上跑起来。',
    intro:
      '把推理从云端下沉到设备端，带来隐私、延迟与离线优势。代价是算力约束。',
    sections: [
      {
        heading: '一、压缩三板斧',
        body: [
          '量化（INT8/INT4）、剪枝与知识蒸馏，是缩小模型体积的常用手段。',
          '蒸馏让小模型“模仿”大模型行为，在精度与体积间取得平衡。',
        ],
      },
      {
        heading: '二、推理框架',
        body: [
          'ONNX Runtime、TensorRT、NCNN 等针对不同硬件做了深度优化。',
          '端云协同（小模型初筛+云端精排）是兼顾体验与成本的折中。',
        ],
      },
    ],
    conclusion: '端侧 AI 让智能更贴近用户，也是隐私友好型产品的关键路径。',
  },
  {
    en: 'data-pipeline',
    category: '机器学习',
    tags: ['数据工程', '特征', 'MLOps'],
    title: '数据决定上限：AI 项目的数据管线实践',
    summary: '从采集、清洗、标注到特征存储，谈数据质量对模型的影响。',
    intro:
      '业界有句老话：模型效果的上限由数据决定，算法只是去逼近它。',
    sections: [
      {
        heading: '一、采集与清洗',
        body: [
          '噪声、重复与偏斜会直接污染模型；去重与异常检测应前置。',
          '标注规范的一致性，往往比标注数量更影响最终质量。',
        ],
      },
      {
        heading: '二、特征与版本',
        body: [
          '特征存储（Feature Store）保证线上线下一致，避免训练-服务偏斜。',
          '数据版本化让实验可复现，是团队协作的基础。',
        ],
      },
    ],
    conclusion: '把数据管线当成产品来打磨，AI 项目才具备可持续迭代的能力。',
  },
  {
    en: 'mlops',
    category: '机器学习',
    tags: ['MLOps', '部署', '工程化'],
    title: 'MLOps：让模型从 Notebook 走向生产',
    summary: 'CI/CD、模型注册、监控与回滚，构建可运维的 ML 系统。',
    intro:
      '训练出一个好模型只是开始，能不能稳定、可观测地服务用户才是难点。',
    sections: [
      {
        heading: '一、流水线化',
        body: [
          '用 CI/CD 把数据校验、训练、评测、部署串成可重复流水线。',
          '模型注册表记录版本与指标，方便灰度与回滚。',
        ],
      },
      {
        heading: '二、线上监控',
        body: [
          '监控输入分布漂移、延迟与错误率，及时触发重训练。',
          '可解释与日志留存，是排查线上异常的前提。',
        ],
      },
    ],
    conclusion: 'MLOps 是把“算法 Demo”变成“业务资产”的必经之路。',
  },
];

// 每个主题衍生若干变体，凑足 200 篇
const VARIANT_SUFFIX = ['实战笔记', '深度解析', '入门到精通', '最佳实践', '前沿观察'];

const ALL_TAGS = [
  '人工智能',
  '机器学习',
  '深度学习',
  '大语言模型',
  'GPT',
  'Transformer',
  '计算机视觉',
  '自然语言处理',
  'AI伦理',
  'AI工具',
  '神经网络',
  '强化学习',
  'Prompt工程',
  'AI Agent',
  '多模态',
  '扩散模型',
  'RAG',
  '向量数据库',
  'AI绘画',
  'AI编程',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildContent(topic: Topic, slug: string): string {
  const parts: string[] = [];
  parts.push(`# ${topic.title}`);
  parts.push('');
  parts.push(`> ${topic.summary}`);
  parts.push('');
  parts.push(topic.intro);
  parts.push('');
  parts.push(`![${topic.title}概览](${img(slug + '-cover', 1200, 630)})`);
  parts.push('');
  for (let i = 0; i < topic.sections.length; i++) {
    const s = topic.sections[i];
    parts.push(`## ${s.heading}`);
    parts.push('');
    for (const p of s.body) parts.push(p);
    parts.push('');
    if (i < topic.sections.length - 1) {
      parts.push(`![${s.heading}配图](${img(slug + '-' + i, 800, 450)})`);
      parts.push('');
    }
  }
  parts.push(`## 小结`);
  parts.push('');
  parts.push(topic.conclusion);
  parts.push('');
  parts.push(`![${topic.title}延伸阅读](${img(slug + '-end', 800, 450)})`);
  parts.push('');
  return parts.join('\n');
}

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 5,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  await prisma.$connect();
  console.log('connected to database');

  // 1) 准备用户（作者）
  const users = await prisma.user.findMany({ select: { id: true } });
  if (users.length === 0) throw new Error('没有任何用户，无法指定作者');
  console.log(`found ${users.length} users`);

  // 2) 准备分类（按名称 upsert）
  const categoryNames = Array.from(new Set(TOPICS.map((t) => t.category)));
  const categoryMap = new Map<string, string>();
  for (const name of categoryNames) {
    const slug = 'cat-' + name;
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, slug, description: `${name}相关文章` },
    });
    categoryMap.set(name, cat.id);
  }
  console.log(`ensured ${categoryMap.size} categories`);

  // 3) 准备标签（按名称 upsert）
  const tagIdByName = new Map<string, string>();
  for (const name of ALL_TAGS) {
    const slug = 'tag-' + name;
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
    tagIdByName.set(name, tag.id);
  }
  console.log(`ensured ${tagIdByName.size} tags`);

  // 4) 生成 200 篇文章
  const postTagRows: { postId: string; tagId: string }[] = [];
  let created = 0;

  for (let i = 0; i < 200; i++) {
    const topic = TOPICS[i % TOPICS.length];
    const variantIdx = Math.floor(i / TOPICS.length);
    const suffix = VARIANT_SUFFIX[variantIdx % VARIANT_SUFFIX.length];
    const title = `${topic.title}·${suffix}`;
    const slug = `${topic.en}-${variantIdx + 1}`;
    const content = buildContent(topic, slug);
    const categoryId = categoryMap.get(topic.category)!;
    const authorId = pick(users).id;
    const publishedAt = new Date(
      Date.now() - Math.floor(Math.random() * 730) * 24 * 3600 * 1000,
    );
    const viewCount = Math.floor(Math.random() * 5000);
    const coverImage = img(slug + '-cover', 1200, 630);

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        summary: topic.summary,
        coverImage,
        status: 'PUBLISHED',
        publishedAt,
        viewCount,
        authorId,
        categoryId,
      },
    });
    created++;

    // 标签：主题自带 + 随机补充，去重
    const tagNames = new Set<string>(topic.tags);
    while (tagNames.size < 3) tagNames.add(pick(ALL_TAGS));
    for (const name of tagNames) {
      const tagId = tagIdByName.get(name);
      if (tagId) postTagRows.push({ postId: post.id, tagId });
    }
  }
  console.log(`created ${created} posts`);

  // 5) 批量写入文章-标签关联
  if (postTagRows.length > 0) {
    await prisma.postTag.createMany({ data: postTagRows });
    console.log(`created ${postTagRows.length} post-tag relations`);
  }

  // 6) 修正分类文章计数
  for (const [name, id] of categoryMap) {
    const count = await prisma.post.count({ where: { categoryId: id } });
    await prisma.category.update({ where: { id }, data: { postCount: count } });
  }
  console.log('updated category postCount');

  await prisma.$disconnect();
  await pool.end();
  console.log('DONE: 200 AI articles seeded.');
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
