"use strict";

window.UNLOCK_DATA = Object.freeze({
  storageKey: "unlock-series-progress-v2",
  puzzles: [
    { id: "puzzle-1", label: "ひとつめの謎", length: 4, answer: "EGAO", locks: { 0: "4", 3: "0" }, hints: ["色に注目", "色を英語にしてみよう"] },
    { id: "puzzle-2", label: "ふたつめの謎", length: 6, answer: "MIKATA", locks: { 0: "2", 2: "3", 4: "1" }, hints: ["「NO」がない→「N」と「O」がない", "「おもいのかおたの」をローマ字にしてみよう"] },
    { id: "puzzle-3", label: "みっつめの謎", length: 6, answer: "SAIKAI", locks: { 0: "6", 5: "7" }, hints: ["一番左はアルファベットの「S」", "星を繋げると、アルファベットの形になります"] },
    { id: "puzzle-4", label: "よっつめの謎", length: 6, answer: "KIZUNA", locks: { 4: "5" }, hints: ["全部で26こあるものは？", "左の数字は、26個あるうちの何番目のワードになるだろうか"] }
  ],
  finalReveal: "OTMKENSI",
  third: { answer: "MOMENT", label: "最後の謎", hints: ["３つの星に囲まれた数字のものをあなたは受け取っている", "消印には2024.5.16とあるので、これを変換すると・・・"] },
  page4Answer: "いえにいけ"
});
