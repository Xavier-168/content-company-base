# PR Agent 交接：从哪里读、改什么、怎样验收

## 1. 先理解这个仓库

这是 **单用户本机内容运营控制面**，不是原有私有工作室系统的整库副本。它只提取通用闭环：

```text
已有 Agent → 草稿 / 飞书写计划 → 本人批准 → lark-cli 写入并回读
           → 冻结素材 / yxer 上传预检 → 本人审核准确版本 → 正式投递
           → 原任务查询 → 本人打开公开作品 → 飞书登记 / 复盘写计划
```

飞书原表是业务事实源；本地 SQLite 只保存技术任务、快照、审批、幂等键和回执。真实集成必须仍使用 `lark-cli` 与 `yxer`，不换成另一个发布服务或自建业务数据库。模型由使用者自己的 Agent 提供，仓库不附带模型、授权、原业务资料或真实账号。

**建议阅读顺序：** [README](../README.md) → [AGENTS](../AGENTS.md) → 本文件 → [架构](ARCHITECTURE.md) → [Agent 协议](AGENT_PROTOCOL.md) → [当前状态](STATUS.md)。运行接入再读 [快速上手](QUICKSTART.md)、[飞书接入](FEISHU_SETUP.md)、[发布流程](PUBLISHING.md)。

## 2. 源码入口与调用关系

```text
python -m contentbase → cli.py ─┐
                               ├→ service.py → feishu.py / yxer.py → runner.py → 供应商 CLI
server.py ← web/app.js ─────────┘             → store.py（私有技术状态）
                                             → frozen_media.py / review_package.py
```

| 文件 / 目录 | 负责什么 | 修改时一起检查 |
|---|---|---|
| `contentbase/cli.py`、`__main__.py` | CLI 参数、输出、本人 TTY 确认 | `service.py`、`tests/test_cli.py`、协议 / 快速上手 |
| `contentbase/service.py` | 所有入口共用的编排与业务门禁 | 适配器、状态库、HTTP / CLI 调用方、service / core / media 测试 |
| `contentbase/feishu.py` | 每次核验 user、显式 Profile、准确表绑定、分页、dry-run / 写 / 回读 | adapters / adapter_audit、飞书接入文档 |
| `contentbase/yxer.py` | schema、账号、动态选择、上传回执、预检、投递与原任务查询 | 适配器 / 发布测试、发布流程 |
| `contentbase/runner.py`、`errors.py` | argv 子进程、错误分类、业务信息脱敏 | adapter_audit、未知结果路径；不拼接 Shell |
| `contentbase/store.py` | 本人 pin、配置 scope、操作 / 事件、跨进程资源锁、在途恢复 | store_audit / core_audit；不得把 unknown 自动重放 |
| `contentbase/config.py` | 源码外配置 / state、占位与凭据检查、私有文件写入 | config / privacy / release 测试、恢复说明 |
| `contentbase/frozen_media.py` | 实际字节冻结、有序 manifest、摘要、匿名 FD 快照、有界读取 | frozen_media / media_stream / stream_service |
| `contentbase/review_package.py` | 私有完整 HTML 审核包、原媒体与 checksum、原子导出 | review_package / media_service；导出不等于人已看过 |
| `contentbase/server.py` | 仅回环 HTTP、Bearer / 本人 / 提供方门禁、Range、流容量限制 | server / stream_service、协议路由表 |
| `contentbase/web/` | 无框架工作台、完整来源、请求 journal、字节预览与本人确认 | frontend_audit / media_frontend；取消、换身份、换任务释放 Blob |
| `build_backend.py`、`scripts/` | 白名单导出、源码 / 包隐私审计、中性归属元数据、源码回滚 | privacy / release_audit；检查实际产物而非只查文本 |

## 3. 审查时必须保留的不变量

1. **外部动作按层分开。** draft / published / review 生成写计划；approve 后才 apply。`publish-prepare` 会真实上传；`publish-submit` 才正式投递。发布 taskSetId 只表示受理，公开可见由本人另行核验。
2. **准确绑定与同身份回读。** 已知 table ID 直接 `+table-get`，不把默认前 50 张当全量。字段和记录按需分页；本人身份、配置、源记录及字段变化使旧计划失效。写后通过同一 Profile 读回。
3. **所有入口同一门禁。** CLI / Web / HTTP 共用 Service，不能在某个入口省略审批、identity、source fingerprint 或发布 provider context。GUI 编辑必须另取完整原记录并传 expected_source，不拿列表摘要当完整正文。
4. **unknown 先核验，不换键重跑。** 超时或中断不等于外部没执行。保留原 operation ID、key、state、旧配置；非发布 verify-write 只证明当前字段符合预期，不证明原请求执行者或回执。
5. **审批绑定准确版本。** 完整正文、账号、平台、通道、动态选择与有序媒体均绑定摘要。正式发布还需本任务 `reviewed_media_digest`。Agent 不代替本人输入 CONFIRM、勾选或伪造 approved。
6. **动态选择绑定快照。** 音乐 / 分区选择保存 receipt 和稳定对象；提交重查原对象，不按当前列表索引替换。ready 与选择快照有时效，过期后重新准备、重新审核。
7. **媒体是实际字节，不只是路径。** 冻结后使用副本；复制与读取核验 SHA / 大小 / 类型。单素材 Web 上限 20 MiB，较大视频走 CLI；冻结视频上限 512 MiB。HTTP / 完整包使用有界流，不恢复整视频内存累积。大 header 夹具不证明真实视频可播放。
8. **本地锁不是远端事务。** 资源锁防同一 state 内重复操作；飞书写入是乐观门禁，不具备远端原子 CAS，其他客户端仍可能并发修改。
9. **这是单用户信任模型。** 回环、Token、TTY、私有目录和身份绑定不是 OS 沙箱或多用户权限系统。提供方 fingerprint 是 CLI 可观察上下文，不证明供应商当前本人身份或平台稳定 UID 已完整核验。
10. **公开源码不带运行材料。** 真实配置、凭据、账号列表、业务 MD、原稿、媒体、SQLite、截图和原项目历史均排除。禁止为方便复现把它们加入测试、日志、Issue 或 PR。

## 4. 不接真实账号也能做的验证

从仓库根目录运行；测试使用合成数据和替身 CLI，不需要供应商凭据，也不上传 / 发布：

```bash
python3 --version                    # Python 3.11+
python3 -B -m contentbase --help
python3 -B -m unittest discover -s tests -v
node --check contentbase/web/app.js  # 完整前端回归需要 Node；见 tests
python3 -B scripts/privacy_audit.py --root .
```

截至 v0.3.3，macOS Python 3.14 和隔离 Linux Python 3.11 / Node 各 292 项通过、0 跳过；具体限制见 [状态](STATUS.md)。PR 应记录自己实际运行的命令、退出码及失败 / 跳过项，不沿用旧验收数声称新代码通过。

运行代码仅依赖 Python 标准库；从源码即可启动。构建 wheel / sdist 需要 setuptools，属于构建依赖。不要因开发交接增加运行依赖、迁移或后台服务。

发布源码必须从精确白名单导出；输出与私人 denylist 均在源码外。例如使用一个尚不存在的目标目录：

```bash
python3 -B scripts/export_source.py --root . \
  --destination "$HOME/contentbase-public-candidate"
python3 -B "$HOME/contentbase-public-candidate/scripts/rollback.py" \
  --source "$HOME/contentbase-public-candidate" --rehearse
```

本地私有检查可在 audit / export 追加 `--denylist PATH`；只提交脱敏结论，不提交标识清单。新增公开文件必须登记 `PUBLIC_EXPORT_MANIFEST.json`。生成的 `MANIFEST.sha256` 应由 exporter 重新计算，源码改动后不保留旧 checksum。构建包还须重开检查实际成员、内容与 tar / gzip / wheel 元数据，源文本零命中不覆盖分发包隐私。

## 5. 已验证与尚未完成

**已验证：** 通用 CLI / Service / Web、合成守护测试、冻结媒体与审核包、干净导出 / 构建隐私；开发环境真实飞书和蚁小二只读接入。真实业务回执保存在私有位置，不随仓库分发。

**待真实验收：** 测试表写入与同身份回读、真实素材上传及预检、本人确认投递、原平台结果、本人打开公开作品、飞书登记与复盘，以及另一套本人账号的干净设备完整闭环。当前没有因开源测试而发出真实测试作品。

**空白测试结构：** 尚未创建云端测试 Base / 表，未复制原业务记录。只复制结构也需检查人员选项、品牌字段、关联目标与公式；关联范围和历史失效公式须另行明确，不直接把整张源表复制当通用可导入模板。使用者可先依 [飞书接入](FEISHU_SETUP.md) 手工建立自己的最小内容表。

原系统的业务地图 / 飞书 MD 导航、消息 Bridge、CardKit 回调、通知中心、成员沙箱、原生 Mac 工作台和运营复盘算法 **没有整体包含在这个最小底座中**。这里的 docs / AGENTS / Skill 是开源项目的快速理解入口，不是原公司的业务知识包；勿以原系统能力介绍替代当前源码事实。

## 6. 给下一个 PR 的交付要求

- 先查看 Git 状态及具体需求，只改相关模块；未指定功能时做审查，不顺手扩展为多人平台、ERP、采集器或另一个 Agent 框架。
- 对 bug 先给复现证据和根因；测试同时覆盖成功与拒绝 / 冲突 / unknown 路径，协议变化同步文档、例子和调用方。
- PR 描述最少列：目标、关键文件、为何这样改、实际测试命令 / 结果、未验证项、回滚方式；修复与重构分开说明。
- 仓库访问或通过 PR 测试不等于对真实账号的业务操作许可。真实测试另行由本人指定配置、记录、素材和动作；本人审批继续由本人完成。
- 回滚保留原技术 state 与回执；恢复代码不撤销已写的飞书记录或已投递作品。没有可靠原请求结果时，只读核验，不自动再发。
