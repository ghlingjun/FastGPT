# 对话接口文档

## 版本说明

| 项 | 说明 |
|---|---|
| 文档版本 | 2026-11-11 |
| 对齐代码版本 | v4.14.29 |
| 适用范围 | 数科对话对外 OpenAPI 对接 |

### 修订记录

#### 2026-11-11（对齐 v4.14.29）

- 删除对话记录：路径由 `/api/core/chat/item/delete` 变更为 `/api/core/chat/record/delete`；旧路径已失效；删除为软删除。
- 获取历史记录：推荐使用 `/api/core/chat/history/getHistories`（旧路径仍兼容）；`source` 仅支持单个枚举字符串，不支持数组；补充 `customUid` 过滤语义及响应字段（`customUid` / `chatGenerateStatus` / `hasBeenRead`）。
- 对话记录列表 / 运行详情：推荐使用 `/api/core/chat/record/*` 正式路径（旧路径仍兼容）。
- 对话接口：明确 `customUid` 为业务建议必传；补充 `image_url` 与预签名上传说明；补充 SSE event 说明。

> 三方升级到 v4.14.29 后，请重点检查删除接口路径与 `getHistories` 的 `source` 传参，避免继续使用旧约定导致 404 / 校验失败。

# 说明
API 接口都通过 Header.Authorization 进行鉴权。
```javascript
baseUrl: "https://domain.com/lmapp/api"
headers: {
    Authorization: "Bearer {{apikey}}"
}
```

## 应用对接前准备
- baseUrl 接口基础路径
- appId 应用唯一ID
- appName 应用名称
- apikey 应用密钥

# 一、对话接口
调用对话接口时，超时时长需要设置为不少于5分钟。以免因为超时被断开连接。

## 请求示例

### 基础请求示例
```javascript
curl --location --request POST 'https://domain.com/lmapp/api/v1/chat/completions' \
--header 'Authorization: Bearer fastgpt-xxxxx' \
--header 'Content-Type: application/json' \
--data-raw '{
    "appId": "xxxxx",
    "chatId": "xxxxxx",
    "customUid": "xxxxxx",
    "stream": true,
    "detail": true,
    "messages": [
        {
            "role": "user",
            "content": "您好！"
        }
    ]
}'
```

### 文件请求示例
- 仅 messages 有部分区别，其他参数一致。
- 对话接口本身不接收 multipart 上传。可将文件放到可访问的对象存储后，在 messages 中传 `file_url`（文档）或 `image_url`（图片）链接。
- 也可用平台预签名上传接口 `POST /api/core/chat/file/presignChatFilePostUrl` 获取上传地址，上传后再引用平台返回的文件地址。
```javascript
curl --location --request POST 'https://domain.com/lmapp/api/v1/chat/completions' \
--header 'Authorization: Bearer fastgpt-xxxxx' \
--header 'Content-Type: application/json' \
--data-raw '{
    "appId": "xxxxx",
    "chatId": "xxxxxx",
    "customUid": "xxxxxx",
    "stream": true,
    "detail": true,
    "messages": [
        {
            "role": "user",
            "content": [
                 {
                    "type": "text",
                    "text": "您好！"
                },
                {
                    "type": "file_url",
                    "name": "文件名",
                    "url": "文档链接，支持 txt md html word pdf ppt csv excel"
                }
            ]
        }
    ]
}'
```

图片示例（`content` 片段）：
```javascript
{
    "type": "image_url",
    "image_url": {
        "url": "图片链接"
    }
}
```

### 参数说明
- headers.Authorization: Bearer {{apikey}}
- chatId: string  请自行确保 chatId 唯一，长度小于 250。如果希望继续同一会话，则确保使用同一个 chatId。
- customUid: 自定义用户 ID。接口层非强制必填，但业务对接建议必传（建议由用户名与用户 id 组成，示例：`zhangsan_张三`）。传入后会写入会话的 `outLinkUid`，供后续按用户查询历史记录。
- stream: 是否流式响应。
- detail: 是否返回中间值（模块状态，响应的完整结果等），stream 模式下会通过 event 进行区分，非 stream 模式结果保存在 responseData 中。
- messages: 结构与 [GPT 接口](https://platform.openai.com/docs/api-reference/chat/object) chat 模式一致。参考上面示例。

## 响应示例
### detail=true,stream=true 响应
```javascript
event: flowNodeStatus
data: {"status":"running","name":"知识库搜索"}

event: flowNodeStatus
data: {"status":"running","name":"AI 对话"}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"content":"电影"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"content":"《铃"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"content":"芽之旅》"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"content":"的导演是新"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"content":"海诚。"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{},"index":0,"finish_reason":"stop"}]}

event: answer
data: [DONE]

event: flowResponses
data: [{"moduleName":"知识库搜索","moduleType":"datasetSearchNode","runningTime":1.78},{"question":"导演是谁","quoteList":[{"id":"654f2e49b64caef1d9431e8b","q":"电影《铃芽之旅》的导演是谁？","a":"电影《铃芽之旅》的导演是新海诚!","indexes":[{"type":"qa","dataId":"3515487","text":"电影《铃芽之旅》的导演是谁？","_id":"654f2e49b64caef1d9431e8c","defaultIndex":true}],"datasetId":"646627f4f7b896cfd8910e38","collectionId":"653279b16cd42ab509e766e8","sourceName":"data (81).csv","sourceId":"64fd3b6423aa1307b65896f6","score":0.8935586214065552},{"id":"6552e14c50f4a2a8e632af11","q":"导演是谁？","a":"电影《铃芽之旅》的导演是新海诚。","indexes":[{"defaultIndex":true,"type":"qa","dataId":"3644565","text":"导演是谁？\n电影《铃芽之旅》的导演是新海诚。","_id":"6552e14dde5cc7ba3954e417"}],"datasetId":"646627f4f7b896cfd8910e38","collectionId":"653279b16cd42ab509e766e8","sourceName":"data (81).csv","sourceId":"64fd3b6423aa1307b65896f6","score":0.8890955448150635},{"id":"654f34a0b64caef1d946337e","q":"本作的主人公是谁？","a":"本作的主人公是名叫铃芽的少女。","indexes":[{"type":"qa","dataId":"3515541","text":"本作的主人公是谁？","_id":"654f34a0b64caef1d946337f","defaultIndex":true}],"datasetId":"646627f4f7b896cfd8910e38","collectionId":"653279b16cd42ab509e766e8","sourceName":"data (81).csv","sourceId":"64fd3b6423aa1307b65896f6","score":0.8738770484924316},{"id":"654f3002b64caef1d944207a","q":"电影《铃芽之旅》男主角是谁？","a":"电影《铃芽之旅》男主角是宗像草太，由松村北斗配音。","indexes":[{"type":"qa","dataId":"3515538","text":"电影《铃芽之旅》男主角是谁？","_id":"654f3002b64caef1d944207b","defaultIndex":true}],"datasetId":"646627f4f7b896cfd8910e38","collectionId":"653279b16cd42ab509e766e8","sourceName":"data (81).csv","sourceId":"64fd3b6423aa1307b65896f6","score":0.8607980012893677},{"id":"654f2fc8b64caef1d943fd46","q":"电影《铃芽之旅》的编剧是谁？","a":"新海诚是本片的编剧。","indexes":[{"defaultIndex":true,"type":"qa","dataId":"3515550","text":"电影《铃芽之旅》的编剧是谁？22","_id":"654f2fc8b64caef1d943fd47"}],"datasetId":"646627f4f7b896cfd8910e38","collectionId":"653279b16cd42ab509e766e8","sourceName":"data (81).csv","sourceId":"64fd3b6423aa1307b65896f6","score":0.8468944430351257}],"moduleName":"AI 对话","moduleType":"chatNode","runningTime":1.86}]
```
## 响应示例（推理模型）
### detail=true,stream=true 响应
```javascript
event: flowNodeStatus
data: {"status":"running","name":"问题分类"}

event: flowNodeStatus
data: {"status":"running","name":"打招呼"}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"role":"assistant","reasoning_content":"\n好的"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"role":"assistant","reasoning_content":"，"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"role":"assistant","reasoning_content":"用户"},"index":0,"finish_reason":null}]}
………………………………
event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"role":"assistant","reasoning_content":"愉快"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"role":"assistant","reasoning_content":"。"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"role":"assistant","reasoning_content":"\n"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"role":"assistant","content":"\n\n"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"role":"assistant","content":"您好"},"index":0,"finish_reason":null}]}
…………………………
event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"role":"assistant","content":"😊"},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"role":"assistant","content":""},"index":0,"finish_reason":null}]}

event: answer
data: {"id":"","object":"","created":0,"model":"","choices":[{"delta":{"role":"assistant","content":null},"index":0,"finish_reason":"stop"}]}

event: answer
data: [DONE]

event: flowResponses
data: [{"id":"ksEq6m9euiVRypop","nodeId":"workflowStartNodeId","moduleName":"流程开始","moduleType":"workflowStart","runningTime":0},{"id":"dSkLBZJDKwiTvfNn","nodeId":"rvbo634w3AYj","moduleName":"问题分类","moduleType":"classifyQuestion","runningTime":0.51,"totalPoints":0,"model":"THUDM/glm-4-9b-chat","query":"您好！","inputTokens":241,"outputTokens":31,"cqList":[{"value":"打招呼类问题","key":"zmu0MGdsrYT44PrI"}],"cqResult":"打招呼类问题","contextTotalLen":2},{"id":"ryHUvx8apWCT9qGk","nodeId":"zONNaTcKduplO7y5","moduleName":"打招呼","moduleType":"chatNode","runningTime":19.46,"totalPoints":0,"model":"ctyun-DeepSeek-R1","tokens":323,"inputTokens":9,"outputTokens":314,"query":"您好！","reasoningText":"\n好的，用户发来了一句“您好！”，看起来挺友好的，可能是想开始对话或者有什么问题需要帮助。首先，我需要用中文回应，保持礼貌和亲切。然后，要确认用户的需求，可能需要进一步询问他们需要什么帮助。同时要注意保持自然，不要显得机械。可能用户只是打个招呼，也可能有具体的问题，所以需要引导他们说明需求。另外，检查有没有拼写错误，确保回复准确。还要考虑不同的可能性，比如用户可能需要技术支持、信息查询，或者其他服务。这时候应该用开放式的提问，让用户详细说明他们的需求。最后，保持简洁明了，避免冗长，让用户感觉轻松愉快。\n","historyPreview":[{"obj":"Human","value":"您好！"},{"obj":"AI","value":"\n\n您好！很高兴为您提供帮助。请问您有什么问题或需要咨询的事情吗？我会尽力为您解答。😊"}],"contextTotalLen":2}]
```

### event 值
event 取值：

- answer: 返回给客户端的文本（最终会算作回答）
- fastAnswer: 指定回复返回给客户端的文本（最终会算作回答）
- toolCall: 执行工具
- toolParams: 工具参数
- toolResponse: 工具返回
- flowNodeStatus: 运行到的节点状态
- flowNodeResponse: 单个节点响应
- flowResponses: 节点完整响应
- updateVariables: 更新变量
- interactive: 交互节点
- workflowDuration: 工作流耗时
- error: 报错

> 其他如 `plan`、`stepTitle`、`sandboxStatus`、`skillCall` 等事件也可能出现，客户端解析时建议做兼容忽略未知 event。

# 二、对话 CRUD 接口

重要字段
- chatId - 指一个应用下，某一个对话窗口的 ID
- dataId / contentId - 指一个对话窗口下，某一条对话记录的 ID（删除接口参数名为 contentId，其余接口多为 dataId）

## 历史记录

### 获取某个应用的历史记录

正式路径：`POST /api/core/chat/history/getHistories`  
兼容路径：`POST /api/core/chat/getHistories`（仍可用）

#### 请求示例
```javascript
curl --location --request POST 'https://domain.com/lmapp/api/core/chat/history/getHistories' \
--header 'Authorization: Bearer {{apikey}}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "appId": "xxxxxx",
    "source": "api",
    "customUid": "zhangsan_1001",
    "offset": 0,
    "pageSize": 20
}'
```
#### 参数说明
- appId - 应用 Id
- source - 对话来源，**可选，且只能传单个字符串**，不能传数组。合法值：`test` | `online` | `share` | `api` | `cronJob` | `team` | `feishu` | `official_account` | `wecom` | `mcp`。查询 API 创建的对话时传 `api`。不需要按来源过滤时请省略该字段（不要传空字符串或 null）。
- customUid - 对话时传入的自定义用户 ID（对应会话中的 `outLinkUid`），可选。
  - 传了 `appId + customUid`：按该用户过滤；此时 `source` **不会生效**。
  - 只传 `appId`：按当前 apikey 所属成员（`tmbId`）过滤，**不是**该应用下全部用户；此时 `source` 可生效。
- offset - 偏移量，即从第几条数据开始取
- pageSize - 记录数量
- startCreateTime / endCreateTime / startUpdateTime / endUpdateTime - 可选，时间范围过滤（字符串）

#### 响应示例
```javascript
{
    "code": 200,
    "statusText": "",
    "message": "",
    "data": {
        "list": [
            {
                "chatId": "usdAP1GbzSGu",
                "customUid": "zhangsan_1001",
                "updateTime": "2024-10-13T03:29:05.779Z",
                "appId": "66e29b870b24ce35330c0f08",
                "customTitle": "",
                "title": "你好",
                "top": false,
                "chatGenerateStatus": "done",
                "hasBeenRead": true
            },
            {
                "chatId": "lC0uTAsyNBlZ",
                "customUid": "zhangsan_1001",
                "updateTime": "2024-10-13T03:22:19.950Z",
                "appId": "66e29b870b24ce35330c0f08",
                "customTitle": "",
                "title": "测试",
                "top": false,
                "chatGenerateStatus": "done",
                "hasBeenRead": true
            }
        ],
        "total": 2
    }
}
```

## 对话记录

### 获取单个对话初始化信息

#### 请求示例
```javascript
curl --location --request GET 'https://domain.com/lmapp/api/core/chat/init?appId={{appId}}&chatId={{chatId}}' \
--header 'Authorization: Bearer {{apikey}}'
```

#### 参数说明
- appId - 应用 Id（必填）
- chatId - 历史记录 Id（必填）

### 获取对话记录列表

正式路径：`POST /api/core/chat/record/getPaginationRecords`  
兼容路径：`POST /api/core/chat/getPaginationRecords`（仍可用）

#### 请求示例
```javascript
curl --location --request POST 'https://domain.com/lmapp/api/core/chat/record/getPaginationRecords' \
--header 'Authorization: Bearer {{apikey}}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "appId": "appId",
    "chatId": "chatId",
    "offset": 0,
    "pageSize": 10,
    "loadCustomFeedbacks": true
}'
```

#### 参数说明
- appId - 应用 Id
- chatId - 历史记录 Id
- offset - 偏移量
- pageSize - 记录数量
- loadCustomFeedbacks - 是否读取自定义反馈（可选）

#### 响应示例
```javascript
{
    "code": 200,
    "statusText": "",
    "message": "",
    "data": {
        "list": [
            {
                "_id": "670b84e6796057dda04b0fd2",
                "dataId": "jzqdV4Ap1u004rhd2WW8yGLn",
                "obj": "Human",
                "value": [
                    {
                        "type": "text",
                        "text": {
                            "content": "你好"
                        }
                    }
                ],
                "customFeedbacks": [

                ]
            },
            {
                "_id": "670b84e6796057dda04b0fd3",
                "dataId": "x9KQWcK9MApGdDQH7z7bocw1",
                "obj": "AI",
                "value": [
                    {
                        "type": "text",
                        "text": {
                            "content": "你好！有什么我可以帮助你的吗？"
                        }
                    }
                ],
                "customFeedbacks": [

                ],
                "llmModuleAccount": 1,
                "totalQuoteList": [

                ],
                "totalRunningTime": 2.42,
                "historyPreviewLength": 2
            }
        ],
        "total": 2
    }
}
```

### 获取单个对话记录运行详情

正式路径：`GET /api/core/chat/record/getResData`  
兼容路径：`GET /api/core/chat/getResData`（仍可用）

#### 请求示例
```javascript
curl --location --request GET 'https://domain.com/lmapp/api/core/chat/record/getResData?appId={{appId}}&chatId={{chatId}}&dataId={{dataId}}' \
--header 'Authorization: Bearer {{apikey}}'
```

#### 参数说明
- appId - 应用 Id
- chatId - 对话 Id
- dataId - 对话记录 Id

#### 响应示例
```javascript
{
    "code": 200,
    "statusText": "",
    "message": "",
    "data": [
        {
            "id": "mVlxkz8NfyfU",
            "nodeId": "448745",
            "moduleName": "common:core.module.template.work_start",
            "moduleType": "workflowStart",
            "runningTime": 0
        },
        {
            "id": "b3FndAdHSobY",
            "nodeId": "z04w8JXSYjl3",
            "moduleName": "AI 对话",
            "moduleType": "chatNode",
            "runningTime": 1.22,
            "totalPoints": 0.02475,
            "model": "GPT-4o-mini",
            "tokens": 75,
            "query": "测试",
            "maxToken": 2000,
            "historyPreview": [
                {
                    "obj": "Human",
                    "value": "你好"
                },
                {
                    "obj": "AI",
                    "value": "你好！有什么我可以帮助你的吗？"
                },
                {
                    "obj": "Human",
                    "value": "测试"
                },
                {
                    "obj": "AI",
                    "value": "测试成功！请问你有什么具体的问题或者需要讨论的话题吗？"
                }
            ],
            "contextTotalLen": 4
        }
    ]
}
```

### 删除对话记录
正式路径：`DELETE /api/core/chat/record/delete`  
> 旧路径 `/api/core/chat/item/delete` 已失效，请勿再使用。  
> 当前为软删除（写入 `deleteTime`），不会物理删除记录。

#### 请求示例
```javascript
curl --location --request DELETE 'https://domain.com/lmapp/api/core/chat/record/delete?contentId={{contentId}}&chatId={{chatId}}&appId={{appId}}' \
--header 'Authorization: Bearer {{apikey}}'
```

#### 参数说明
- appId - 应用 Id
- chatId - 历史记录 Id
- contentId - 对话记录 Id（即 dataId）

#### 响应示例
```javascript
{
    "code": 200,
    "statusText": "",
    "message": "",
    "data": {}
}
```

### 点赞 / 取消点赞

#### 请求示例
```javascript
curl --location --request POST 'https://domain.com/lmapp/api/core/chat/feedback/updateUserFeedback' \
--header 'Authorization: Bearer {{apikey}}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "appId": "appId",
    "chatId": "chatId",
    "dataId": "dataId",
    "userGoodFeedback": "yes"
}'
```

#### 参数说明
- appId - 应用 Id
- chatId - 历史记录 Id
- dataId - 对话记录 Id
- userGoodFeedback - 用户点赞时的信息（可选），取消点赞时不填此参数即可

#### 响应示例
```javascript
{
    "code": 200,
    "statusText": "",
    "message": "",
    "data": {}
}
```

### 点踩 / 取消点踩

#### 请求示例
```javascript
curl --location --request POST 'https://domain.com/lmapp/api/core/chat/feedback/updateUserFeedback' \
--header 'Authorization: Bearer {{apikey}}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "appId": "appId",
    "chatId": "chatId",
    "dataId": "dataId",
    "userBadFeedback": "yes"
}'
```

#### 参数说明
- appId - 应用 Id
- chatId - 历史记录 Id
- dataId - 对话记录 Id
- userBadFeedback - 用户点踩时的信息（可选），取消点踩时不填此参数即可

#### 响应示例
```javascript
{
    "code": 200,
    "statusText": "",
    "message": "",
    "data": {}
}
```

## 猜你想问
猜你想问，必须包含 appId 和 chatId 的参数才可以进行使用。会自动根据 chatId 去拉取最近 6 轮对话记录作为上下文来引导回答。

### 请求示例
```javascript
curl --location --request POST 'https://domain.com/lmapp/api/core/ai/agent/v2/createQuestionGuide' \
--header 'Authorization: Bearer {{apikey}}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "appId": "appId",
    "chatId": "chatId",
    "questionGuide": {
        "open": true,
        "customPrompt": "你是一个智能助手，请根据用户的问题生成猜你想问。"
    }
}'

```
### 参数说明
- appId - 应用 Id
- chatId - 对话 Id
- questionGuide - 自定义配置
```javascript
type CreateQuestionGuideParams = OutLinkChatAuthProps & {
  appId: string;
  chatId: string;
  questionGuide?: {
    open: boolean;
    model?: string;
    customPrompt?: string;
  };
};
```

### 响应示例
```javascript
{
    "code": 200,
    "statusText": "",
    "message": "",
    "data": [
        "你对AI有什么看法？",
        "想了解AI的应用吗？",
        "你希望AI能做什么？"
    ]
}
```

# web 对话插件
https://www.npmjs.com/package/@56jun/fe-chat
