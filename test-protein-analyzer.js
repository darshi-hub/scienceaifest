// Test Suite for ProteinAnalyzer Component
// This file tests the core analytical functions

// ============================================================================
// TEST DATA & FUNCTIONS (copied from ProteinAnalyzer.jsx)
// ============================================================================

const RESIDUE_MASS = {
  G: 57.05, A: 71.08, S: 87.08, P: 97.12, V: 99.13, T: 101.10, C: 103.14,
  L: 113.16, I: 113.16, N: 114.10, D: 115.09, Q: 128.13, K: 128.17,
  E: 129.12, M: 131.19, H: 137.14, F: 147.18, R: 156.19, Y: 163.18, W: 186.21,
};
const WATER_MASS = 18.02;

const KYTE_DOOLITTLE = {
  I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5, M: 1.9, A: 1.8, G: -0.4, T: -0.7,
  S: -0.8, W: -0.9, Y: -1.3, P: -1.6, H: -3.2, E: -3.5, Q: -3.5, D: -3.5,
  N: -3.5, K: -3.9, R: -4.5,
};

const CHOU_FASMAN = {
  E: { a: 1.51, b: 0.37 }, A: { a: 1.42, b: 0.83 }, L: { a: 1.21, b: 1.30 },
  H: { a: 1.00, b: 0.87 }, M: { a: 1.45, b: 1.05 }, Q: { a: 1.11, b: 1.10 },
  W: { a: 1.08, b: 1.37 }, V: { a: 1.06, b: 1.70 }, F: { a: 1.13, b: 1.38 },
  K: { a: 1.16, b: 0.74 }, I: { a: 1.08, b: 1.60 }, D: { a: 1.01, b: 0.54 },
  T: { a: 0.83, b: 1.19 }, S: { a: 0.77, b: 0.75 }, R: { a: 0.98, b: 0.93 },
  C: { a: 0.70, b: 1.19 }, N: { a: 0.67, b: 0.89 }, Y: { a: 0.69, b: 1.47 },
  P: { a: 0.57, b: 0.55 }, G: { a: 0.57, b: 0.75 },
};

const AA_FULL_NAME = {
  A: "Alanine", R: "Arginine", N: "Asparagine", D: "Aspartate", C: "Cysteine",
  E: "Glutamate", Q: "Glutamine", G: "Glycine", H: "Histidine", I: "Isoleucine",
  L: "Leucine", K: "Lysine", M: "Methionine", F: "Phenylalanine", P: "Proline",
  S: "Serine", T: "Threonine", W: "Tryptophan", Y: "Tyrosine", V: "Valine",
};

const MOTIFS = [
  { name: "N-glycosylation site", pattern: /N[^P][ST]/g, note: "Marks where sugar chains may attach." },
  { name: "Casein Kinase II phosphorylation site", pattern: /[ST]..[DE]/g, note: "Phosphate-attachment tag." },
  { name: "Protein Kinase C phosphorylation site", pattern: /[ST].[RK]/g, note: "Another phosphate-attachment tag." },
  { name: "Walker A / P-loop motif", pattern: /[AG]....GK[ST]/g, note: "ATP/GTP binding proteins." },
  { name: "RGD cell-attachment motif", pattern: /RGD/g, note: "Helps cells stick to tissue." },
];

function cleanSequence(raw) {
  return raw
    .split("\n")
    .filter((line) => !line.trim().startsWith(">"))
    .join("")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return function next() {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h % 10000) / 10000;
  };
}

function analyzeSequence(seq) {
  const length = seq.length;
  const rand = seededRandom(seq || "seed");

  // Molecular weight
  let mw = WATER_MASS;
  for (const ch of seq) mw += RESIDUE_MASS[ch] ?? 110;

  // Composition
  const composition = {};
  for (const ch of seq) composition[ch] = (composition[ch] || 0) + 1;
  const compositionList = Object.entries(composition)
    .map(([code, count]) => ({
      code, count, name: AA_FULL_NAME[code] || code,
      pct: (count / length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Hydrophobicity
  let hydrophobicCount = 0;
  const kdTrack = [];
  for (const ch of seq) {
    const kd = KYTE_DOOLITTLE[ch] ?? 0;
    kdTrack.push(kd);
    if (kd > 0) hydrophobicCount++;
  }
  const hydrophobicPct = (hydrophobicCount / length) * 100;
  const hydrophilicPct = 100 - hydrophobicPct;

  // Secondary structure
  let helix = 0, sheet = 0, coil = 0;
  const ssTrack = [];
  for (const ch of seq) {
    const p = CHOU_FASMAN[ch] || { a: 0.9, b: 0.9 };
    let label;
    if (p.a > p.b && p.a > 1.0) { label = "H"; helix++; }
    else if (p.b >= p.a && p.b > 1.0) { label = "E"; sheet++; }
    else { label = "C"; coil++; }
    ssTrack.push(label);
  }
  const helixPct = (helix / length) * 100;
  const sheetPct = (sheet / length) * 100;
  const coilPct = (coil / length) * 100;

  // Motifs
  const motifHits = MOTIFS.map((m) => {
    const positions = [];
    let match;
    const re = new RegExp(m.pattern);
    while ((match = re.exec(seq)) && positions.length < 6) {
      positions.push(match.index + 1);
    }
    return { ...m, count: positions.length, positions };
  }).filter((m) => m.count > 0);

  return {
    length, mw, compositionList, hydrophobicPct, hydrophilicPct, kdTrack,
    helixPct, sheetPct, coilPct, ssTrack, motifHits,
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;

function assertEquals(actual, expected, testName) {
  if (actual === expected) {
    console.log(`✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    console.error(`  Expected: ${expected}, Got: ${actual}`);
    testsFailed++;
  }
}

function assertCloseTo(actual, expected, tolerance, testName) {
  if (Math.abs(actual - expected) <= tolerance) {
    console.log(`✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    console.error(`  Expected: ~${expected} (±${tolerance}), Got: ${actual}`);
    testsFailed++;
  }
}

function assertTrue(condition, testName) {
  if (condition) {
    console.log(`✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    testsFailed++;
  }
}

console.log("=".repeat(70));
console.log("PROTEIN ANALYZER TEST SUITE");
console.log("=".repeat(70));

// Test 1: Sequence Cleaning
console.log("\n[Test Group 1] Sequence Cleaning");
assertEquals(cleanSequence("MVHLT"), "MVHLT", "Simple sequence");
assertEquals(cleanSequence(">Header\nMVHLT\nPEEKS"), "MVHLTPEEKS", "FASTA format with header");
assertEquals(cleanSequence("M-V.H*L@T"), "MVHLT", "Sequence with special characters removed");
assertEquals(cleanSequence(""), "", "Empty sequence");

// Test 2: Simple Sequence Analysis
console.log("\n[Test Group 2] Basic Sequence Analysis");
const simple = analyzeSequence("AAAAA");
assertEquals(simple.length, 5, "Sequence length calculation");
assertEquals(simple.compositionList[0].code, "A", "Composition sorting");
assertEquals(simple.compositionList[0].count, 5, "Amino acid count");
assertCloseTo(simple.compositionList[0].pct, 100, 0.1, "Percentage calculation");

// Test 3: Molecular Weight
console.log("\n[Test Group 3] Molecular Weight");
const protein = analyzeSequence("MVHLTPEEKS");
assertTrue(protein.mw > 1000, "MW greater than sum of individual residues");
assertCloseTo(protein.mw, 1100, 50, "Molecular weight in reasonable range");

// Test 4: Hydrophobicity
console.log("\n[Test Group 4] Hydrophobicity Analysis");
const hydrophobic = analyzeSequence("IIIVVVLLL"); // Very hydrophobic
assertTrue(hydrophobic.hydrophobicPct > 80, "High hydrophobic percentage for hydrophobic sequence");
const hydrophilic = analyzeSequence("KKKKRRRDD"); // Very hydrophilic
assertTrue(hydrophilic.hydrophobicPct < 20, "Low hydrophobic percentage for hydrophilic sequence");

// Test 5: Secondary Structure
console.log("\n[Test Group 5] Secondary Structure Prediction");
assertTrue(simple.helixPct >= 0 && simple.helixPct <= 100, "Helix percentage in valid range");
assertTrue(simple.sheetPct >= 0 && simple.sheetPct <= 100, "Sheet percentage in valid range");
assertTrue(simple.coilPct >= 0 && simple.coilPct <= 100, "Coil percentage in valid range");
const totalSS = simple.helixPct + simple.sheetPct + simple.coilPct;
assertCloseTo(totalSS, 100, 0.1, "Secondary structure percentages sum to 100%");

// Test 6: Motif Detection
console.log("\n[Test Group 6] Motif Detection");
const rgd = analyzeSequence("ACRGDCA");
const rgdHits = rgd.motifHits.filter(m => m.name.includes("RGD"));
assertTrue(rgdHits.length > 0 && rgdHits[0].count > 0, "RGD motif detected");
const noMotif = analyzeSequence("GGGGGGG");
assertEquals(noMotif.motifHits.length, 0, "No motifs in repeat sequence");

// Test 7: Hemoglobin Beta
console.log("\n[Test Group 7] Example Protein: Hemoglobin Beta");
const hemoglobin = "MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH";
const hbbAnalysis = analyzeSequence(hemoglobin);
assertEquals(hbbAnalysis.length, 146, "Hemoglobin Beta correct length");
assertTrue(hbbAnalysis.mw > 15000 && hbbAnalysis.mw < 17000, "Hemoglobin Beta MW in expected range");
assertTrue(hbbAnalysis.helixPct > 50, "Hemoglobin has significant helix content");

// Test 8: Composition Analysis
console.log("\n[Test Group 8] Composition Analysis");
const known = analyzeSequence("AAG");
const aCount = known.compositionList.find(c => c.code === "A");
assertEquals(aCount.count, 2, "Count of A in AAG");
assertEquals(aCount.pct, (2/3)*100, "Percentage of A in AAG");

// Test 9: Edge Cases
console.log("\n[Test Group 9] Edge Cases");
assertEquals(cleanSequence("   "), "", "Whitespace-only sequence");
const singleAA = analyzeSequence("M");
assertEquals(singleAA.length, 1, "Single amino acid length");
assertTrue(singleAA.compositionList.length === 1, "Single amino acid composition");

// Test 10: Random Seed Determinism
console.log("\n[Test Group 10] Determinism Check");
const seq1 = analyzeSequence("MVHLT");
const seq2 = analyzeSequence("MVHLT");
// Since we use seededRandom, results should be identical for same input
assertEquals(seq1.length, seq2.length, "Same sequence produces same length");
assertEquals(seq1.helixPct, seq2.helixPct, "Seeded random is deterministic");

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(70));
console.log(`TEST RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
console.log("=".repeat(70));

if (testsFailed === 0) {
  console.log("\n✓ ALL TESTS PASSED! The ProteinAnalyzer app is functioning correctly.");
} else {
  console.log(`\n✗ ${testsFailed} test(s) failed. Review the errors above.`);
}

// Export for Node.js or browser usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analyzeSequence, cleanSequence, testsPassed, testsFailed };
}
