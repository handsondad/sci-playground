export type GateType = "AND" | "OR" | "NOT" | "XOR";
export type Bit = 0 | 1;

export const TRUTH_INPUTS: readonly (readonly [Bit, Bit])[] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1]
];

export const GATE_META: Record<GateType, { name: string; short: string; rule: string; color: string }> = {
  AND: { name: "AND 与门", short: "与 AND", rule: "全 1 才出 1", color: "#0ea5e9" },
  OR: { name: "OR 或门", short: "或 OR", rule: "有 1 就出 1", color: "#f59e0b" },
  NOT: { name: "NOT 非门", short: "非 NOT", rule: "0 变 1 · 1 变 0", color: "#ec4899" },
  XOR: { name: "XOR 异或门", short: "异或 XOR", rule: "不同才出 1", color: "#8b5cf6" }
};

export type GateSlotSpec = {
  id: number;
  label: string;
  unary?: boolean;
  x: number;
  y: number;
};

export type GateLevel = {
  id: number;
  title: string;
  inputALabel: string;
  inputBLabel: string;
  outputLabel: string;
  topology: "single" | "notB_then_combine" | "xor_combo";
  slots: readonly GateSlotSpec[];
  palette: readonly GateType[];
  expectedOutputs: readonly [Bit, Bit, Bit, Bit];
  solution: readonly GateType[];
  story: string;
  hint: string;
  win: string;
};

/** 计算单个逻辑门的输出（NOT 非门只读取第一个输入 a 并取反）。 */
export function evalGate(gate: GateType, a: number | boolean, b: number | boolean = 0): Bit {
  const ba = Boolean(a);
  const bb = Boolean(b);
  switch (gate) {
    case "AND":
      return ba && bb ? 1 : 0;
    case "OR":
      return ba || bb ? 1 : 0;
    case "NOT":
      return ba ? 0 : 1;
    case "XOR":
      return ba !== bb ? 1 : 0;
  }
}

/**
 * 按槽位拓扑计算电路输出：
 * - 1 个门 [g0]：out = g0(A, B)
 * - 2 个门 [g0, g1]：B 先经过单输入槽 g0 得到 w0，再与 A 一起进入 g1(A, w0)
 * - 4 个门 [g0, g1, g2, g3]：上支路 w0 = g0(A, B)，下支路 w1 = g1(A, B) -> w2 = g2(w1)，汇总 out = g3(w0, w2)
 */
export function evalCircuitDetails(
  circuitGates: readonly (GateType | null | undefined)[],
  a: Bit,
  b: Bit
): { wires: (Bit | null)[]; out: Bit | null } {
  if (circuitGates.length === 1) {
    const g0 = circuitGates[0];
    if (!g0) return { wires: [null], out: null };
    const out = evalGate(g0, a, b);
    return { wires: [out], out };
  }
  if (circuitGates.length === 2) {
    const [g0, g1] = circuitGates;
    const w0 = g0 ? evalGate(g0, b, b) : null;
    const out = g1 && w0 !== null ? evalGate(g1, a, w0) : null;
    return { wires: [w0, out], out };
  }
  if (circuitGates.length === 4) {
    const [g0, g1, g2, g3] = circuitGates;
    const w0 = g0 ? evalGate(g0, a, b) : null;
    const w1 = g1 ? evalGate(g1, a, b) : null;
    const w2 = g2 && w1 !== null ? evalGate(g2, w1, w1) : null;
    const out = g3 && w0 !== null && w2 !== null ? evalGate(g3, w0, w2) : null;
    return { wires: [w0, w1, w2, out], out };
  }
  return { wires: [], out: null };
}

/** 验证当前电路在 (0,0),(0,1),(1,0),(1,1) 四种输入下是否与目标真值表 100% 匹配。 */
export function truthTableMatches(
  circuitGates: readonly (GateType | null | undefined)[],
  expectedOutputs: readonly (number | boolean)[]
): boolean {
  if (expectedOutputs.length !== TRUTH_INPUTS.length) return false;
  if (circuitGates.length === 0 || circuitGates.some((g) => !g)) return false;
  return TRUTH_INPUTS.every(([a, b], idx) => {
    const { out } = evalCircuitDetails(circuitGates, a, b);
    const exp: Bit = expectedOutputs[idx] ? 1 : 0;
    return out === exp;
  });
}

export const gateLevels: readonly GateLevel[] = [
  {
    id: 1,
    title: "保险箱双人钥匙",
    inputALabel: "爸爸钥匙 A",
    inputBLabel: "小念钥匙 B",
    outputLabel: "金库电磁锁",
    topology: "single",
    slots: [{ id: 0, label: "1 号门槽", x: 182, y: 142 }],
    palette: ["AND", "OR", "NOT", "XOR"],
    expectedOutputs: [0, 0, 0, 1],
    solution: ["AND"],
    story: "家庭科学金库装了双人保险机关：只有爸爸转动钥匙 A（1）【并且】小念同时转动钥匙 B（1）时，电磁锁才通电打开（1）！该插哪颗逻辑门芯片？",
    hint: "看真值表最后一行：只有 (1, 1) 才输出 1，其余全是 0——选『AND 与门（全 1 才出 1）』插进 1 号门槽！",
    win: "咔哒！双人钥匙同时到位，与门（AND）输出高电平打开金库！银行金库和发射按钮都靠『与逻辑』防止误触！"
  },
  {
    id: 2,
    title: "前后门双响门铃",
    inputALabel: "前门按钮 A",
    inputBLabel: "后门按钮 B",
    outputLabel: "客厅叮咚铃",
    topology: "single",
    slots: [{ id: 0, label: "1 号门槽", x: 182, y: 142 }],
    palette: ["AND", "OR", "NOT", "XOR"],
    expectedOutputs: [0, 1, 1, 1],
    solution: ["OR"],
    story: "小院有前门按钮 A 和后门按钮 B：快递员按前门【或者】邻居按后门，哪怕两个人碰巧同时按，客厅门铃都要响起来！试试看异或门和或门有什么区别？",
    hint: "如果错装成 XOR 异或门，前后门同时按 (1, 1) 反而会哑火变 0！要让 (0,1)、(1,0)、(1,1) 全都响铃，必须装『OR 或门（有 1 就出 1）』！",
    win: "叮咚！或门（OR）让前后两扇门都能顺利叫响门铃，就算两边同时按也稳稳通电！"
  },
  {
    id: 3,
    title: "天黑自动感应路灯",
    inputALabel: "红外有人 A",
    inputBLabel: "白天光线 B",
    outputLabel: "节能路灯",
    topology: "notB_then_combine",
    slots: [
      { id: 0, label: "① 光线反转槽", unary: true, x: 132, y: 196 },
      { id: 1, label: "② 亮灯汇总槽", x: 238, y: 142 }
    ],
    palette: ["AND", "OR", "NOT", "XOR"],
    expectedOutputs: [0, 0, 1, 0],
    solution: ["NOT", "AND"],
    story: "小区节能路灯很聪明：白天太阳亮时（光线 B = 1）绝不浪费电；只有天黑光线暗（B = 0）且正好有行人经过（A = 1）时才自动亮灯！两步机关怎么搭？",
    hint: "先把 B = 0（天黑）送进 ① 号槽用『NOT 非门』反成高电平 1，再在 ② 号槽用『AND 与门』和行人信号 A = 1 汇合！",
    win: "绝妙配合！非门把『没阳光 0』翻译成『天黑了 1』，再交给与门把关行人信号——全自动智慧路灯诞生啦！"
  },
  {
    id: 4,
    title: "楼梯双控开关",
    inputALabel: "楼下开关 A",
    inputBLabel: "楼上开关 B",
    outputLabel: "楼梯顶灯",
    topology: "xor_combo",
    slots: [
      { id: 0, label: "① 至少开一头", x: 126, y: 84 },
      { id: 1, label: "② 两头全拨开", x: 126, y: 198 },
      { id: 2, label: "③ 排除全开", unary: true, x: 208, y: 198 },
      { id: 3, label: "④ 汇总顶灯", x: 278, y: 138 }
    ],
    palette: ["AND", "OR", "NOT"],
    expectedOutputs: [0, 1, 1, 0],
    solution: ["OR", "AND", "NOT", "AND"],
    story: "楼梯上下各有一个开关：状态不同时亮灯（0,1 或 1,0 → 1），相同时灭灯（0,0 或 1,1 → 0），这就是『异或逻辑』！今天现成的 XOR 芯片用完了，只用与、或、非三种基础门能拼出来吗？",
    hint: "拆成两句话：『A 或 B 至少有一个 1』（① 装 OR），【并且】『不能 A 与 B 同时为 1』（② 装 AND，③ 装 NOT 反转），最后 ④ 用 AND 汇总两路！",
    win: "太硬核啦！(A OR B) AND NOT(A AND B) 完美复刻出异或门（XOR）！计算机 CPU 里的加法器就是靠这组电路一位一位算加法的！"
  }
];
