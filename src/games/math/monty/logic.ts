/** 三扇门：奖品在一扇后面。主持人打开一扇没奖的门之后，换门赢的机会是 2/3。 */

export function hostOpens(prize: number, pick: number) {
  const goats = [0, 1, 2].filter((door) => door !== pick && door !== prize);
  if (goats.length > 0) return goats[0];
  return [0, 1, 2].find((door) => door !== pick)!;
}

export function switched(pick: number, opened: number) {
  return [0, 1, 2].find((door) => door !== pick && door !== opened)!;
}

export function wins(prize: number, pick: number, stay: boolean) {
  const opened = hostOpens(prize, pick);
  const final = stay ? pick : switched(pick, opened);
  return final === prize;
}

/** 奖品轮流藏在三扇门后，选手总是先选 0 号。换门正好赢 2/3。 */
export function tally(trials: number) {
  let stay = 0;
  let swap = 0;
  for (let i = 0; i < trials; i++) {
    const prize = i % 3;
    if (wins(prize, 0, true)) stay += 1;
    if (wins(prize, 0, false)) swap += 1;
  }
  return { stay, swap };
}
