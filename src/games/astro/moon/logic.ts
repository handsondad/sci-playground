export function wrap(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function angleDiff(a: number, b: number) {
  const d = Math.abs(wrap(a - b));
  return Math.min(d, 360 - d);
}

/** 0 新月，90 上弦，180 满月，270 下弦。太阳在右侧。 */
export const phases = [
  { id: "new", name: "新月", deg: 0, why: "月亮跑到太阳那一侧，亮着的一面背对地球。" },
  { id: "crescent", name: "蛾眉月", deg: 45, why: "月亮刚离开太阳一点点，只能看见一弯细亮边。" },
  { id: "first", name: "上弦月", deg: 90, why: "月亮、地球、太阳成直角，我们看见半边亮。" },
  { id: "full", name: "满月", deg: 180, why: "月亮跑到太阳的对面，亮着的一整面都朝向地球。" },
  { id: "third", name: "下弦月", deg: 270, why: "又是一个直角，不过亮的是另一半。" }
] as const;

export function hitPhase(angle: number, target: number, tolerance = 12) {
  return angleDiff(angle, target) <= tolerance;
}
