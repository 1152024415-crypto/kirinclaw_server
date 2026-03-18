/**
 * shared/types.ts — 共享类型定义
 *
 * 与 KirinClaw 客户端 (ArkTS) 的 ContextEngine.ets / ContextModels.ets 对齐。
 * 服务端用于规则校验、存储、分发。
 */

// ── 规则定义 ──

/** 规则条件 */
export interface ContextCondition {
  key: string;       // 信号 key (如 "mergedGeofenceCategory", "ps_time")
  op: string;        // 操作符: eq, neq, gt, lt, gte, lte, in, range
  value: string;     // 匹配值
}

/** 前置条件 — 历史状态条件 */
export interface PreconditionDef {
  key: string;
  op: string;
  value: string;
  withinMs: number;  // 在多少毫秒内必须满足过
}

/** 规则动作 */
export interface ContextAction {
  id: string;
  type: string;      // suggestion, automation, notification, service, card
  payload: string;   // JSON 字符串
}

/** 场景建议动作 */
export interface ScenarioSuggestion {
  id: string;
  type: string;
  payload: string;
  trigger?: string;  // "enter" | "exit" | "duration:N"
}

/** 完整的规则定义 — 对齐 default_rules.json */
export interface ContextRule {
  id: string;                              // 规则 ID (sc_XX, llm_XX, desc_XX, user_XX)
  name: string;                            // 规则名称
  conditions: ContextCondition[];          // 触发条件
  excludeConditions?: ContextCondition[][]; // 排除条件组
  preconditions?: PreconditionDef[];       // 前置条件
  action?: ContextAction;                  // 规则动作 (无场景时使用)
  priority: number;                        // 优先级 (0-10)
  cooldownMs: number;                      // 冷却时间 (毫秒)
  enabled: boolean;                        // 是否启用
  tier?: number;                           // 层级: 0=zero-config, 1=WiFi-aware, 2=BT+step+screen

  // 场景扩展字段
  scenarioId?: string;                     // 场景 ID (如 "ARRIVE_OFFICE")
  scenarioName?: string;                   // 场景中文名
  scenarioNameEn?: string;                 // 场景英文名
  category?: string;                       // 场景类别: work, commute, home, life, study, dining, ...
  stepIndex?: number;                      // 场景步骤索引 (当前全为 0)
  totalSteps?: number;                     // 总步骤数 (当前全为 1)
  timeoutMs?: number;                      // 场景超时 (毫秒)
  suggestions?: ScenarioSuggestion[];      // 场景建议动作列表

  // 服务端管理字段 (客户端无)
  source?: 'default' | 'discovered' | 'described' | 'user';  // 规则来源
  createdBy?: string;                      // 创建者 deviceId
  auditTags?: string[];                    // 审核标签
  createdAt?: number;                      // 创建时间
  updatedAt?: number;                      // 更新时间
}

// ── 信号定义 ──

/** 信号快照 — 对齐 POST /api/v1/status/report 的 snapshots[] 格式 */
export interface SignalSnapshot {
  timestamp: number;
  signals: Record<string, string | number | boolean>;
}

/** 状态链条目 — 对齐 statechain[] 格式 */
export interface StateChainEntry {
  timestamp: number;
  chain: {
    chainId: number;
    timeNorm: number;
    transition: {
      from: string;
      to: string;
      durationMin: number;
      isRoutine: boolean;
      direction: number;
    };
    matchedRules: Array<{
      ruleId: string;
      confidence: number;
      actionType: string;
    }>;
    recommendedAction?: {
      ruleId: string;
      actionType: string;
      confidence: number;
    };
    scenarios: Array<{
      scenarioId: string;
      scenarioName: string;
      category: string;
      confidence: number;
    }>;
    feedback?: {
      actionId: string;
      feedbackType: string;
      reward: number;
    };
  };
}

// ── 已知信号 key 列表 (用于规则校验) ──

/** 可用于规则条件的合法信号 key */
export const KNOWN_SIGNAL_KEYS: string[] = [
  // 时间
  'timeOfDay', 'hour', 'dayOfWeek', 'isWeekend',
  // 7 元组物理状态
  'ps_time', 'ps_location', 'ps_motion', 'ps_phone', 'ps_light', 'ps_sound', 'ps_dayType',
  // 运动
  'motionState', 'activityDuration', 'step_count_today', 'isSleeping',
  // 位置
  'latitude', 'longitude', 'geofence', 'mergedGeofenceCategory',
  'wifiSsid', 'wifiGeofence', 'wifiLost', 'wifiLostCategory', 'wifiLostWork', 'cellId',
  // 设备
  'batteryLevel', 'isCharging', 'networkType', 'sensorTier',
  'screen_on', 'screen_locked', 'user_active',
  'phone_posture', 'isHolding', 'isLyingDown',
  // 蓝牙
  'bt_enabled', 'bt_in_vehicle', 'bt_connected_count', 'bt_audio_connected',
  'bt_device_names', 'bt_fixed_devices', 'bt_portable_devices', 'bt_vehicle_devices',
  // 音频
  'audio_scene', 'audio_device', 'audio_inCall', 'audio_ringing', 'audio_headphones',
  // 日历
  'cal_eventCount', 'cal_hasUpcoming', 'cal_nextMinutes', 'cal_inMeeting',
  'cal_nextTitle', 'cal_nextLocation', 'cal_currentTitle',
  // 应用
  'foreground_app', 'app_category', 'app_usage_min',
  'app_isForeground', 'app_sessionMinutes', 'app_sessionsToday',
  // 通知
  'notif_enabled', 'notif_lastSentMinutes',
  // 快递
  'sms_delivery_pending', 'sms_delivery_courier', 'sms_delivery_code',
  'sms_delivery_location', 'sms_delivery_count',
  // 航班
  'hasUpcomingFlight', 'flightNumber', 'flightCountdownMin', 'flightArrivalMin',
  // 穿戴
  'heart_rate', 'heart_rate_status', 'wearing_state',
  // 状态转移 (C++ 注入)
  'prev_geofence', 'geofence_changed', 'prev_motionState_stationary', 'prev_motionState_moving',
  'transition_duration_min', 'time_in_current_state_min', 'transitions_last_hour',
  'is_routine_transition', 'transition_direction',
];

/** 合法的条件操作符 */
export const VALID_OPS: string[] = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'range'];

/** 合法的动作类型 */
export const VALID_ACTION_TYPES: string[] = ['suggestion', 'automation', 'notification', 'service', 'card'];

/** 合法的场景类别 */
export const VALID_CATEGORIES: string[] = [
  'work', 'commute', 'home', 'life', 'study', 'dining', 'fitness', 'transit', 'travel', 'health',
];

/** 规则 ID 前缀命名空间 */
export const RULE_ID_PREFIXES = {
  default: 'sc_',       // 默认规则
  user: 'user_',        // 用户手动创建
  discovered: 'llm_',   // LLM 自动发现
  described: 'desc_',   // 用户描述转译
} as const;
