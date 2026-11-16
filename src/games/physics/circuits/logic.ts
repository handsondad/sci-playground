export type CircuitTopology = "open" | "single" | "series" | "parallel" | "short";

export type SwitchState = {
  s1: boolean;
  s2?: boolean;
};

export type CircuitEvaluation = {
  voltageV: number;
  l1Brightness: number;
  l2Brightness: number;
  l1VoltageV: number;
  l2VoltageV: number;
  totalCurrentA: number;
  isShortCircuit: boolean;
  isClosedLoop: boolean;
};

export type CircuitLevel = {
  id: number;
  title: string;
  startTopology: CircuitTopology;
  startSwitches: SwitchState;
  allowedTopologies: readonly CircuitTopology[];
  targetTopology: CircuitTopology;
  story: string;
  hint: string;
  win: string;
};

export const TOPOLOGY_LABELS: Record<CircuitTopology, string> = {
  open: "🔌 断路（导线未闭合）",
  single: "💡 单灯基础回路",
  series: "🔗 双灯串联电路",
  parallel: "🌿 双灯并联支路",
  short: "⚡ 跨接短路（危险！）"
};

/**
 * 纯电路求解器（电池电压 E = 6.0V，每只小灯泡电阻 R = 10Ω）：
 * 根据当前接线拓扑与开关状态 S1/S2 计算各灯分压、亮度百分比、干路电流及短路报警。
 */
export function evaluateCircuit(
  topology: CircuitTopology,
  switches: SwitchState = { s1: true, s2: true }
): CircuitEvaluation {
  const voltageV = 6.0;
  const s1 = Boolean(switches?.s1);
  const s2 = Boolean(switches?.s2);

  if (topology === "open") {
    return {
      voltageV,
      l1Brightness: 0,
      l2Brightness: 0,
      l1VoltageV: 0,
      l2VoltageV: 0,
      totalCurrentA: 0,
      isShortCircuit: false,
      isClosedLoop: false
    };
  }

  if (topology === "short") {
    // 跨接在电池正负极之间的零电阻导线造成电源直接短路，保险丝报警切断/抢走全部电流
    return {
      voltageV,
      l1Brightness: 0,
      l2Brightness: 0,
      l1VoltageV: 0,
      l2VoltageV: 0,
      totalCurrentA: 9.9,
      isShortCircuit: true,
      isClosedLoop: true
    };
  }

  if (topology === "single") {
    if (!s1) {
      return {
        voltageV,
        l1Brightness: 0,
        l2Brightness: 0,
        l1VoltageV: 0,
        l2VoltageV: 0,
        totalCurrentA: 0,
        isShortCircuit: false,
        isClosedLoop: false
      };
    }
    return {
      voltageV,
      l1Brightness: 100,
      l2Brightness: 0,
      l1VoltageV: 6.0,
      l2VoltageV: 0,
      totalCurrentA: 0.6,
      isShortCircuit: false,
      isClosedLoop: true
    };
  }

  if (topology === "series") {
    // 串联回路只有一条通路：开关 S1 控制整条回路，两灯各分得一半电压 (3.0V -> 50% 亮度)
    if (!s1) {
      return {
        voltageV,
        l1Brightness: 0,
        l2Brightness: 0,
        l1VoltageV: 0,
        l2VoltageV: 0,
        totalCurrentA: 0,
        isShortCircuit: false,
        isClosedLoop: false
      };
    }
    return {
      voltageV,
      l1Brightness: 50,
      l2Brightness: 50,
      l1VoltageV: 3.0,
      l2VoltageV: 3.0,
      totalCurrentA: 0.3,
      isShortCircuit: false,
      isClosedLoop: true
    };
  }

  // parallel: 支路 1 (S1 + L1) 与 支路 2 (S2 + L2) 独立跨接在 6.0V 电源两端
  const l1On = s1;
  const l2On = s2;
  const i1 = l1On ? 0.6 : 0;
  const i2 = l2On ? 0.6 : 0;
  return {
    voltageV,
    l1Brightness: l1On ? 100 : 0,
    l2Brightness: l2On ? 100 : 0,
    l1VoltageV: l1On ? 6.0 : 0,
    l2VoltageV: l2On ? 6.0 : 0,
    totalCurrentA: Math.round((i1 + i2) * 100) / 100,
    isShortCircuit: false,
    isClosedLoop: l1On || l2On
  };
}

export function checkCircuitGoal(
  level: CircuitLevel,
  topology: CircuitTopology,
  switches: SwitchState
): boolean {
  const res = evaluateCircuit(topology, switches);
  if (res.isShortCircuit) return false;

  if (level.id === 1) {
    return topology === "single" && res.l1Brightness === 100;
  }
  if (level.id === 2) {
    return topology === "series" && res.l1Brightness === 50 && res.l2Brightness === 50;
  }
  if (level.id === 3) {
    // 客厅卧室并联双控：搭建并联支路，关掉 S1 时 L1 灭而 L2 依然 100% 满亮
    return topology === "parallel" && !switches.s1 && Boolean(switches.s2) && res.l1Brightness === 0 && res.l2Brightness === 100;
  }
  if (level.id === 4) {
    // 短路排险后恢复双灯安全点亮（并联满亮或串联同亮均安全无短路，且两灯均亮）
    return !res.isShortCircuit && res.l1Brightness > 0 && res.l2Brightness > 0;
  }
  return false;
}

export const circuitLevels: readonly CircuitLevel[] = [
  {
    id: 1,
    title: "闭合回路点亮",
    startTopology: "open",
    startSwitches: { s1: false, s2: false },
    allowedTopologies: ["open", "single"],
    targetTopology: "single",
    story: "电流就像顺着水管奔跑的水流，必须从电池正极（＋）出发、穿过小灯泡 L1、再完整回到负极（－）才会发光！请接好『单灯基础回路』并合上开关 S1！",
    hint: "先点『💡 单灯基础回路』把断开的回流导线接通，再点电路图或面板上的开关 S1 把它合上！",
    win: "亮起来啦！6V 电池穿过 10Ω 灯泡产生 0.60A 电流——只要有一处断口，电子就寸步难行！"
  },
  {
    id: 2,
    title: "串联同亮同灭",
    startTopology: "single",
    startSwitches: { s1: true, s2: true },
    allowedTopologies: ["open", "single", "series"],
    targetTopology: "series",
    story: "把 L1 和 L2 首尾相连串在一条路上叫『串联』！请搭建双灯串联电路并合上开关 S1，观察两盏灯怎样平分 6V 电压、同亮同灭！",
    hint: "选择『🔗 双灯串联电路』并确保 S1 闭合。两只 10Ω 灯泡加起来总电阻变成 20Ω，每只分到 3.0V（50% 亮度）！",
    win: "观察得真准！串联电路只有一条独木桥：两灯各分一半电压变暗成 50%，而且只要断开 S1，两盏灯立刻一起熄灭！"
  },
  {
    id: 3,
    title: "客厅卧室并联双控",
    startTopology: "series",
    startSwitches: { s1: true, s2: true },
    allowedTopologies: ["series", "parallel"],
    targetTopology: "parallel",
    story: "家里关掉客厅灯，卧室灯可不会跟着黑！请改搭『双灯并联支路』让两盏灯都能拿满 6V 电压，然后【关掉 S1、保留 S2 闭合】，验证 L1 灭而 L2 依然 100% 满亮！",
    hint: "第一步选『🌿 双灯并联支路』；第二步点开关 S1 把它断开（S1 关、S2 开），看到 L1 熄灭、L2 依然 100% 满亮就点检验！",
    win: "这就是家里所有电灯和插座的秘密！并联支路互不干扰，每条支路都直接跨在满额电源上，各自拥有独立开关！"
  },
  {
    id: 4,
    title: "短路警报排险",
    startTopology: "short",
    startSwitches: { s1: true, s2: true },
    allowedTopologies: ["short", "parallel", "series"],
    targetTopology: "parallel",
    story: "警报拉响！有人误把一根零电阻铜线直接跨接在电池正负极上，电流全走近道引发『电源短路』，保险丝发烫跳闸、两盏灯全灭！快拆掉短路导线恢复双灯安全发光！",
    hint: "点电路图上冒红光的『⚡ 跨接短路导线』（或切换成『🌿 双灯并联支路』），同时闭合 S1 和 S2 让两盏灯安全点亮！",
    win: "排险成功！电流最爱走阻力最小的路——绝不能拿导线直接把电池正负极连起来，否则瞬间大电流会烧坏电池甚至起火！"
  }
];
