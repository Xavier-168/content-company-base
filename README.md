# Content Company Base

**给 Agent 使用的内容一人公司底座：飞书保存业务事实，蚁小二负责真实发布，本机工作台负责计划、人工确认和执行证据。**

它不是模型、聊天产品或另一个 Agent 框架。你继续使用自己的 Agent，让它通过 CLI / HTTP API 读取内容事项、提交草稿、准备发布和提交复盘；底座把结果关联回你自己的飞书记录。

## 先用三步理解

1. **业务在哪里？** 在你自己的飞书 Base / 表。这里没有另一套公司业务数据库，也不复制别人的账号、表格或授权。
2. **谁做内容？** 你已有的 Agent。项目不内置模型、不索取模型 Key；Agent 交付文本和文件，底座保存带摘要的执行计划。
3. **谁决定发布？** 你本人。蚁小二上传、校验与 dry-run 后，必须查看冻结预览并明确确认才正式投递。任务受理和作品公开分别验收。

```text
你的 Agent ── CLI / API ── 本机工作台
                             ├─ lark-cli → 你的飞书内容表（业务权威）
                             └─ yxer     → 你的蚁小二账号 → 发布平台
                         私有技术 state：计划 / 摘要 / 幂等 / 回执
```

## 首版能做什么

- 真实 `lark-cli` 接入：每次核验 user 身份，显式 Profile，读取指定 Base / 表；写前读、dry-run、本人批准、执行和写后回读。
- 草稿编辑另取完整原记录并绑定 source fingerprint；源变化保留稿件，须本人核对最新原文后重新建立计划。公开登记、复盘同样先生成受审写计划。
- 真实 `yxer` 接入：单账号图文 / 视频，平台 schema 与动态音乐 / 分区，完整上传回执，固定 `cloud` 或 `local` 通道的 validate + dry-run。
- 准备时复制并摘要冻结实际素材；网页按原顺序验证字节并显示图片 / 视频 / 独立封面，或导出完整本机审核包。本人完整观看并明确确认后才投递，重复请求幂等、未知不重发。
- 本机 Web 工作台与 CLI 共用业务守护；外部 Agent 无需迁移到我们的聊天界面。

**首版边界：** 单用户本机；无自动建表、内置 AI、自动采集、定时无人发布、财务、多人权限或 OS 执行沙箱。支持 CLI / API 的 Agent 可以接入，不等于每个聊天产品天然具备执行能力。

## 快速开始

首版运行环境为 macOS / Linux（Windows 支持待补）。需要 Python 3.11+、你自行安装的 `lark-cli` / `yxer`、自己的已授权飞书 Profile / 内容表和蚁小二账号。运行代码只有 Python 标准库；可直接从源码启动，无需先安装 Python 包。Python 支持状态以 [官方版本维护表](https://devguide.python.org/versions/) 为准；本项目最低运行版本为 3.11，不把已结束维护的版本列为生产推荐。

- `lark-cli`：按 [飞书官方 CLI 源码与安装说明](https://github.com/larksuite/cli) 获取和安装，使用你本人已有的授权 Profile。
- `yxer`：向蚁小二供应商获取其本人安装 / 配置指引；本项目不猜测 npm 包名、不提供陌生下载镜像。
- 拉取本项目源码只获得本项目代码，不附赠飞书、蚁小二或发布平台的服务授权、账号、额度或凭据。

```bash
cd content-company-base
export CONFIG="$HOME/.config/content-company-base/config.json"
python3 -m contentbase --config "$CONFIG" init-config
# 编辑刚生成的配置：填写你自己的 Profile、Base token、table ID 和字段映射。
python3 -m contentbase --config "$CONFIG" doctor
python3 -m contentbase --config "$CONFIG" sync
python3 -m contentbase --config "$CONFIG" serve --port 8787
```

打开 `http://127.0.0.1:8787`。访问 Token 在有效 state 目录的 `web-access.json`（0600）；由本人在本机读取并输入工作台，启动输出不会打印 Token。配置不填写密码、OAuth Token 或 API Key；供应商凭据继续由供应商 CLI 保管。默认技术目录为 `~/.local/state/content-company-base`，可用 `CONTENTBASE_STATE_DIR` 指定源码之外的独立目录。一个 state 首次真实核验后固定本人身份；另一位使用者必须准备自己的配置 / state 与供应商授权，不清旧数据库或借用旧授权。

> `sync` 读取真实飞书；“准备发布”会向蚁小二上传素材。第一次演练前先看 [快速上手](docs/QUICKSTART.md) 和 [发布流程](docs/PUBLISHING.md)，不要把它们当离线操作。

## 文档地图

| 你想做什么 | 先读 |
|---|---|
| 已有授权资源时快速理解并启动 | [快速上手](docs/QUICKSTART.md) |
| 绑定自己的飞书表 | [飞书接入](docs/FEISHU_SETUP.md) |
| 图文 / 视频正式发布 | [蚁小二发布](docs/PUBLISHING.md) |
| 让现有 Agent 接入 | [Agent 协议](docs/AGENT_PROTOCOL.md)、[项目 Skill](skills/content-company-base/SKILL.md) |
| 接手开发、审查或提交 Pull Request | [PR Agent 交接](docs/PR_AGENT_HANDOFF.md) |
| 理解技术边界、修改代码 | [架构](docs/ARCHITECTURE.md)、[开发规则](AGENTS.md) |
| 判断什么可以公开 | [隐私与开源边界](docs/PRIVACY.md) |
| 区分已实现与真实待验收 | [当前状态](docs/STATUS.md) |
| 遇到错误，判断本人下一步 | [排错手册](docs/TROUBLESHOOTING.md) |

## 验证与真实验收

本地自动测试使用显式合成数据与替身 CLI；它们验证守护逻辑，不代表你的账号授权或平台发布已成功。

```bash
python3 -m unittest discover -s tests -v
```

真实验收按层记录：CLI 环境 → 本人身份 → 飞书读写与回读 → 素材上传及 validate / dry-run → 本人确认投递 → 查询平台回执 → 本人打开公开作品 → 显式回写飞书 → 复盘回读。开源开发及测试本身不授权正式发作品；未完成的层级仍是待验收。

MIT 许可覆盖本项目代码；飞书、蚁小二与平台服务的许可、账号权限、费用和使用规则由相应供应商决定。本项目不附带它们的服务、账号、凭据或私有软件。
