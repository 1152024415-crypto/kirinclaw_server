# 服务端数据映射文档

> 本文档说明 KirinClaw 客户端上报的数据如何对应到服务端的 JSONL 存储文件中，以及每个字段与 `data_spec_for_rl.md`（RL 模型输入规范）的映射关系。

最近更新：2026-03-18

---

## 1. 数据存储概览

客户端通过 `POST /api/v1/status/report` 上报数据，服务端按类型写入不同的 JSONL 文件：

| 存储文件 | 数据来源 | 内容 | 对应 data_spec 章节 |
|---------|---------|------|-------------------|
| `data/datatray-YYYY-MM-DD.jsonl` | `request.snapshots[]` | 传感器快照（物理+数字世界） | 第一章 7-Tuple + 第三章全部 |
| `data/statechain-YYYY-MM-DD.jsonl` | `request.statechain[]` | 规则引擎决策 + 用户反馈 | 第二章场景定义 |

---

## 2. JSONL 单条记录结构

### datatray 记录

```json
{
  "deviceId": "dev_xxx",
  "timestamp": 1710000000000,
  "receivedAt": 1710000001000,
  "data": {
    // 第一章：7-Tuple 物理状态
    "ps_time": "afternoon",
    "ps_location": "work",
    "ps_motion": "stationary",
    "ps_phone": "on_desk",
    "ps_light": "normal",
    "ps_sound": "quiet",
    "ps_dayType": "workday",

    // 第三章 3.1：基础上下文
    "hour": 14,
    "timeOfDay": "afternoon",
    "dayOfWeek": 2,
    "isWeekend": false,
    "batteryLevel": 72,
    "isCharging": false,
    "networkType": "wifi",

    // 第三章 3.2：位置与围栏
    "mergedGeofenceCategory": "work",
    "geofence": "user_xxx",
    "wifiSsid": "Office_5G",
    "wifiLost": false,
    "wifiLostCategory": "",
    "latitude": "31.258",
    "longitude": "121.618",

    // 第三章 3.3：运动与活动
    "motionState": "stationary",
    "stepCount": 3200,
    "step_count_today": 5800,
    "speed": "0",
    "activityDuration": 1200,
    "isSleeping": false,
    "isLyingDown": false,

    // 第三章 3.4：日历
    "cal_eventCount": 3,
    "cal_hasUpcoming": true,
    "cal_nextTitle": "周会",
    "cal_nextMinutes": 30,
    "cal_nextLocation": "会议室A",
    "cal_inMeeting": false,

    // 第三章 3.5：快递
    "sms_delivery_pending": false,

    // 第三章 3.6：出行
    "hasUpcomingFlight": false,

    // 第三章 3.7：屏幕状态
    "screen_on": true,
    "screen_locked": false,
    "user_active": true,

    // 第三章 3.8：音频与媒体
    "audio_scene": "default",
    "audio_device": "speaker",
    "audio_headphones": false,
    "audio_ringing": false,

    // 第三章 3.9：蓝牙设备
    "bt_enabled": true,
    "bt_connected_count": 1,
    "bt_audio_connected": true,
    "bt_in_vehicle": false,

    // 第三章 3.10：前台应用
    "foreground_app": "com.example.office",
    "app_category": "办公",
    "app_usage_min": 25
  }
}
```

### statechain 记录

```json
{
  "deviceId": "dev_xxx",
  "timestamp": 1710000000000,
  "receivedAt": 1710000001000,
  "data": {
    "chainId": 42,
    "timeNorm": 0.33,

    "transition": {
      "from": "家",
      "to": "公司",
      "durationMin": 35,
      "isRoutine": true,
      "direction": 1
    },

    "matchedRules": [
      { "ruleId": "sc_02", "confidence": 1, "actionType": "card" }
    ],

    "recommendedAction": {
      "ruleId": "sc_02",
      "actionType": "card",
      "confidence": 1
    },

    // 第二章：场景定义
    "scenarios": [
      {
        "scenarioId": "ARRIVE_OFFICE",
        "scenarioName": "到达办公室",
        "category": "work",
        "confidence": 1
      },
      {
        "scenarioId": "EVENING_AT_OFFICE",
        "scenarioName": "傍晚留守办公室",
        "category": "work",
        "confidence": 1
      }
    ],

    "feedback": {
      "actionId": "arrive_office_schedule",
      "feedbackType": "thumbs_up",
      "reward": 1.0
    }
  }
}
```

---

## 3. 字段级映射：data_spec → 服务端存储

### 第一章：7-Tuple 物理状态 → `datatray.data.ps_*`

| data_spec 定义 | 服务端字段路径 | 枚举值 |
|---|---|---|
| TimeSlot（9 值） | `datatray.data.ps_time` | sleeping, dawn, morning, forenoon, lunch, afternoon, evening, night, late_night |
| LocationCategory（14 值） | `datatray.data.ps_location` | home, work, restaurant, cafe, gym, transit, shopping, outdoor, health, social, education, custom, en_route, unknown |
| MotionCategory（7 值） | `datatray.data.ps_motion` | stationary, walking, running, cycling, driving, transit, unknown |
| PhoneCategory（8 值） | `datatray.data.ps_phone` | in_use, holding_lying, on_desk, face_up, in_pocket, face_down, charging, unknown |
| LightCategory（4 值） | `datatray.data.ps_light` | dark, dim, normal, bright |
| SoundCategory（5 值） | `datatray.data.ps_sound` | silent, quiet, normal, noisy, unknown |
| DayType（3 值） | `datatray.data.ps_dayType` | workday, weekend, holiday |

### 第二章：场景定义 → `statechain.data.scenarios[]`

| data_spec 定义 | 服务端字段路径 |
|---|---|
| scenarioId | `statechain.data.scenarios[].scenarioId` |
| scenarioName | `statechain.data.scenarios[].scenarioName` |
| category | `statechain.data.scenarios[].category` |
| （置信度，spec 未定义） | `statechain.data.scenarios[].confidence` |

46 个场景 ID 完整列表见 `data_spec_for_rl.md` 第二章。

### 第三章 3.1：基础上下文 → `datatray.data.*`

| data_spec 字段 | 服务端字段路径 | 原始类型 | 上传类型 |
|---|---|---|---|
| `hour` | `datatray.data.hour` | string | → number |
| `dayOfWeek` | `datatray.data.dayOfWeek` | string | → number |
| `isWeekend` | `datatray.data.isWeekend` | string | → boolean |
| `batteryLevel` | `datatray.data.batteryLevel` | string | → number |
| `isCharging` | `datatray.data.isCharging` | string | → boolean |
| `networkType` | `datatray.data.networkType` | string | string |

### 第三章 3.2：位置与围栏 → `datatray.data.*`

| data_spec 字段 | 服务端字段路径 | 说明 |
|---|---|---|
| `mergedGeofenceCategory` | `datatray.data.mergedGeofenceCategory` | 围栏分类 (home/work/cafe/...) |
| `geofence` | `datatray.data.geofence` | 围栏 ID |
| `wifiSsid` | `datatray.data.wifiSsid` | WiFi SSID |
| `wifiLost` | `datatray.data.wifiLost` | → boolean |
| `wifiLostCategory` | `datatray.data.wifiLostCategory` | 围栏分类 |
| `latitude` | `datatray.data.latitude` | string (纬度) |
| `longitude` | `datatray.data.longitude` | string (经度) |

### 第三章 3.3：运动与活动 → `datatray.data.*`

| data_spec 字段 | 服务端字段路径 | 上传类型 |
|---|---|---|
| `motionState` | `datatray.data.motionState` | string |
| `stepCount` | `datatray.data.stepCount` | → number |
| `step_count_today` | `datatray.data.step_count_today` | → number |
| `speed` | `datatray.data.speed` | → number |
| `transportMode` | `datatray.data.transportMode` | string |
| `activityState` | `datatray.data.activityState` | string |
| `activityDuration` | `datatray.data.activityDuration` | → number |
| `isSleeping` | `datatray.data.isSleeping` | → boolean |
| `isLyingDown` | `datatray.data.isLyingDown` | → boolean |

### 第三章 3.4：日历 → `datatray.data.*`

| data_spec 字段 | 服务端字段路径 | 上传类型 |
|---|---|---|
| `cal_eventCount` | `datatray.data.cal_eventCount` | → number |
| `cal_hasUpcoming` | `datatray.data.cal_hasUpcoming` | → boolean |
| `cal_nextTitle` | `datatray.data.cal_nextTitle` | string |
| `cal_nextMinutes` | `datatray.data.cal_nextMinutes` | → number |
| `cal_nextLocation` | `datatray.data.cal_nextLocation` | string |
| `cal_inMeeting` | `datatray.data.cal_inMeeting` | → boolean |
| `cal_currentTitle` | `datatray.data.cal_currentTitle` | string |

### 第三章 3.5：快递 → `datatray.data.*`

| data_spec 字段 | 服务端字段路径 | 上传类型 |
|---|---|---|
| `sms_delivery_pending` | `datatray.data.sms_delivery_pending` | → boolean |
| `sms_delivery_courier` | `datatray.data.sms_delivery_courier` | string |
| `sms_delivery_code` | `datatray.data.sms_delivery_code` | string |
| `sms_delivery_location` | `datatray.data.sms_delivery_location` | string |
| `sms_delivery_time` | `datatray.data.sms_delivery_time` | string |
| `sms_delivery_count` | `datatray.data.sms_delivery_count` | → number |

### 第三章 3.6：出行 → `datatray.data.*`

| data_spec 字段 | 服务端字段路径 | 上传类型 |
|---|---|---|
| `hasUpcomingFlight` | `datatray.data.hasUpcomingFlight` | → boolean |
| `flightCountdownMin` | `datatray.data.flightCountdownMin` | → number |
| `flightArrivalMin` | `datatray.data.flightArrivalMin` | → number |
| `flightNumber` | `datatray.data.flightNumber` | string |

### 第三章 3.7：屏幕状态 → `datatray.data.*`

| data_spec 字段 | 服务端字段路径 | 上传类型 |
|---|---|---|
| `screen_locked` | `datatray.data.screen_locked` | → boolean |
| `screen_on` | `datatray.data.screen_on` | → boolean |
| `user_active` | `datatray.data.user_active` | → boolean |

### 第三章 3.8：音频与媒体 → `datatray.data.*`

| data_spec 字段 | 服务端字段路径 | 上传类型 |
|---|---|---|
| `audio_scene` | `datatray.data.audio_scene` | string |
| `audio_device` | `datatray.data.audio_device` | string |
| `audio_inCall` | `datatray.data.audio_inCall` | → boolean |
| `audio_ringing` | `datatray.data.audio_ringing` | → boolean |
| `audio_headphones` | `datatray.data.audio_headphones` | → boolean |

### 第三章 3.9：蓝牙设备 → `datatray.data.*`

| data_spec 字段 | 服务端字段路径 | 上传类型 |
|---|---|---|
| `bt_enabled` | `datatray.data.bt_enabled` | → boolean |
| `bt_connected_count` | `datatray.data.bt_connected_count` | → number |
| `bt_audio_connected` | `datatray.data.bt_audio_connected` | → boolean |
| `bt_device_names` | `datatray.data.bt_device_names` | string |
| `bt_fixed_devices` | `datatray.data.bt_fixed_devices` | string |
| `bt_portable_devices` | `datatray.data.bt_portable_devices` | string |
| `bt_vehicle_devices` | `datatray.data.bt_vehicle_devices` | string |
| `bt_in_vehicle` | `datatray.data.bt_in_vehicle` | → boolean |

### 第三章 3.10：前台应用 → `datatray.data.*`

| data_spec 字段 | 服务端字段路径 | 上传类型 |
|---|---|---|
| `foreground_app` | `datatray.data.foreground_app` | string |
| `app_category` | `datatray.data.app_category` | string |
| `app_usage_min` | `datatray.data.app_usage_min` | → number |

---

## 4. statechain 独有字段（data_spec 未覆盖）

以下字段是上传服务新增的，用于 RL 训练的决策上下文，`data_spec_for_rl.md` 中暂未定义：

| 服务端字段路径 | 类型 | 说明 |
|---|---|---|
| `statechain.data.chainId` | number | 连续链 ID，用于还原时序序列 |
| `statechain.data.timeNorm` | number | 状态停留归一化 (0/0.33/0.67/1.0) |
| `statechain.data.transition.from` | string | 前序围栏标签 |
| `statechain.data.transition.to` | string | 当前围栏标签 |
| `statechain.data.transition.durationMin` | number | 转移持续时间（分钟） |
| `statechain.data.transition.isRoutine` | boolean | 是否常规路线 |
| `statechain.data.transition.direction` | number | 转移方向 (-1/0/1) |
| `statechain.data.matchedRules[]` | array | 命中的规则列表 (ruleId, confidence, actionType) |
| `statechain.data.recommendedAction` | object/无 | 实际推荐给用户的动作 |
| `statechain.data.feedback` | object/无 | 用户反馈 (actionId, feedbackType, reward) |

---

## 5. datatray 额外字段（data_spec 未覆盖）

以下字段存在于 DataTray 中并会上传，但 `data_spec_for_rl.md` 未列出：

| 服务端字段路径 | 说明 |
|---|---|
| `datatray.data.timeOfDay` | 时段 (dawn/morning/...) — 与 ps_time 类似但枚举值不同 |
| `datatray.data.sensorTier` | 传感器采集层级 (0-3) |
| `datatray.data.heart_rate` | 心率 |
| `datatray.data.heart_rate_status` | 心率状态 |
| `datatray.data.wearing_state` | 穿戴状态 |
| `datatray.data.wifi_connected` | 是否连接 WiFi |
| `datatray.data.wifi_rssi` | WiFi 信号强度 |
| `datatray.data.wifi_frequency` | WiFi 频段 |
| `datatray.data.notif_enabled` | 通知是否启用 |
| `datatray.data.notif_lastSentMinutes` | 距上次通知分钟数 |
| `datatray.data.app_isForeground` | 应用是否在前台 |
| `datatray.data.app_sessionMinutes` | 当前会话时长 |
| `datatray.data.app_sessionsToday` | 今日会话次数 |
| `datatray.data.cellId` | 基站 ID |
| `datatray.data.wifiGeofence` | WiFi 匹配的围栏分类 |
| `datatray.data.wifiLostWork` | 是否丢失办公 WiFi |
| `datatray.data.phone_posture` | 手机姿态原始值 |
| `datatray.data.isHolding` | 是否手持 |
| `datatray.data.screenTime` | 屏幕使用时长（分钟） |

---

## 6. RL 训练样本重建

服务端拿到 datatray + statechain 后，按以下方式重建 RL 样本：

```
对于 statechain 中 recommendedAction 不为空 且 feedback 不为空的记录：

  s_t   = datatray[timestamp ≈ statechain.timestamp]     → 环境状态（7-Tuple + 扩展字段）
  a_t   = statechain.recommendedAction                    → 系统动作
  r_t   = statechain.feedback.reward                      → 用户奖励
  s_t+1 = datatray[timestamp ≈ next statechain.timestamp] → 下一状态

关联方式：
  datatray 和 statechain 通过 timestamp（毫秒）匹配同一时刻
  同一设备通过 deviceId 区分
```

---

## 7. 脱敏说明

上传数据中的字符串值经过内容级脱敏：

| 敏感信息 | 替换为 | 影响的字段 |
|---------|--------|----------|
| 身份证号（18 位） | `[ID_CARD]` | 所有 string 字段 |
| 工资金额（关键词+数字） | `关键词[SALARY]` | 所有 string 字段 |
