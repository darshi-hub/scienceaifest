import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  Dna, Upload, FlaskConical, ChevronDown, ChevronUp, Info, Activity,
  Microscope, ShieldAlert, BookOpen, Gauge as GaugeIcon, MapPin,
  Layers, Waves, Target, AlertTriangle, X, Play
} from "lucide-react";

/* ============================================================================
   PROTEIN STRUCTURE & DISEASE INSIGHT ANALYZER
   ----------------------------------------------------------------------------
   An educational bioinformatics dashboard. All "predictions" that are not
   backed by a lightweight real algorithm are clearly labelled SIMULATED or
   EDUCATIONAL ESTIMATE. Nothing in this tool is diagnostic.
   ============================================================================ */

/* ---------------------------------------------------------------------------
   1. SCIENTIFIC REFERENCE DATA
   ------------------------------------------------------------------------- */

// Average residue mass (Da) as it appears inside a peptide chain (free amino
// acid mass minus one water molecule lost in the peptide bond).
const RESIDUE_MASS = {
  G: 57.05, A: 71.08, S: 87.08, P: 97.12, V: 99.13, T: 101.10, C: 103.14,
  L: 113.16, I: 113.16, N: 114.10, D: 115.09, Q: 128.13, K: 128.17,
  E: 129.12, M: 131.19, H: 137.14, F: 147.18, R: 156.19, Y: 163.18, W: 186.21,
};
const WATER_MASS = 18.02;

// Kyte-Doolittle hydrophobicity scale. Positive = hydrophobic.
const KYTE_DOOLITTLE = {
  I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5, M: 1.9, A: 1.8, G: -0.4, T: -0.7,
  S: -0.8, W: -0.9, Y: -1.3, P: -1.6, H: -3.2, E: -3.5, Q: -3.5, D: -3.5,
  N: -3.5, K: -3.9, R: -4.5,
};

// Simplified Chou-Fasman conformational propensities, used only as a classic
// teaching heuristic for secondary-structure tendency -- NOT a modern
// prediction method (real tools use PSI-BLAST profiles + neural nets).
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

// Short linear motif patterns -- these are real, simplified regular
// expressions used in introductory bioinformatics courses.
const MOTIFS = [
  { name: "N-glycosylation site", pattern: /N[^P][ST]/g, note: "Marks where sugar chains may attach to the protein." },
  { name: "Casein Kinase II phosphorylation site", pattern: /[ST]..[DE]/g, note: "A tag an enzyme may use to add a phosphate group." },
  { name: "Protein Kinase C phosphorylation site", pattern: /[ST].[RK]/g, note: "Another common phosphate-attachment tag." },
  { name: "Walker A / P-loop motif", pattern: /[AG]....GK[ST]/g, note: "Often found in proteins that bind ATP or GTP." },
  { name: "RGD cell-attachment motif", pattern: /RGD/g, note: "Helps cells stick to surrounding tissue." },
];

/* ---------------------------------------------------------------------------
   2. EXAMPLE PROTEINS
   Hemoglobin Beta uses its real UniProt sequence (P68871). The other three
   use short illustrative fragments (clearly labelled) so the analyzer stays
   fast and so we never present an unverified full-length sequence as fact.
   ------------------------------------------------------------------------- */
const EXAMPLES = {
  hbb: {
    label: "Hemoglobin Beta (HBB) — real sequence",
    sequence: "MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH",
    isFragment: false,
    disease: {
      title: "Hemoglobin Beta (HBB)",
      associations: [
        {
          disease: "Sickle Cell Disease",
          summary: "A single substitution at position 6 (glutamate → valine) causes hemoglobin to form rigid, sickle-shaped fibers under low oxygen, distorting red blood cells.",
        },
        {
          disease: "Beta-Thalassemia",
          summary: "Various mutations reduce or eliminate beta-globin production, unbalancing the alpha/beta globin ratio and causing anemia.",
        },
      ],
      pathway: "Oxygen transport: hemoglobin tetramer assembly (2 alpha + 2 beta chains), oxygen binding/release in red blood cells.",
      whyItMatters: "Because beta-globin folds into a very precise pocket that cradles the oxygen-binding heme group, even one changed amino acid can alter its shape enough to disrupt oxygen transport throughout the body.",
    },
  },
  p53: {
    label: "p53 Tumor Suppressor — demo fragment",
    sequence: "MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAKSVTCTYSPALNKMFCQLAKTCPVQLW",
    isFragment: true,
    disease: {
      title: "p53 (TP53)",
      associations: [
        {
          disease: "Li-Fraumeni Syndrome",
          summary: "Inherited TP53 mutations sharply raise lifetime risk of many cancer types, since p53 normally halts damaged cells before they divide.",
        },
        {
          disease: "Sporadic cancers (many types)",
          summary: "TP53 is the single most frequently mutated gene across human cancers; losing its function lets damaged cells escape natural checkpoints.",
        },
      ],
      pathway: "Cell-cycle arrest, DNA-damage response, and programmed cell death (apoptosis) — p53 is often called the 'guardian of the genome.'",
      whyItMatters: "p53 works by binding directly to DNA. Mutations concentrated in its DNA-binding region (illustrated as a hotspot in this demo) can prevent it from recognizing damaged genes, silencing its protective function.",
    },
  },
  cftr: {
    label: "CFTR — demo fragment",
    sequence: "MQRSPLEKASVVSKLFFSWTRPILRKGYRQRLELSDIYQIPSVDSADNLSEKLEREWDRELASKKNPKLINALRRCFFWRFMFYGIFLYLGEVTKAVQPLLLGRIIASYDPDNKEERSIAIYLGIGLCLLFIVRTLLLHPAIFGLH",
    isFragment: true,
    disease: {
      title: "CFTR (Cystic Fibrosis Transmembrane Conductance Regulator)",
      associations: [
        {
          disease: "Cystic Fibrosis",
          summary: "Most commonly caused by a deletion (ΔF508) that makes CFTR fold incorrectly, so it never reaches the cell membrane to move chloride ions.",
        },
      ],
      pathway: "Chloride and bicarbonate ion transport across epithelial cell membranes, which controls the thickness of mucus in lungs and other organs.",
      whyItMatters: "CFTR is a channel protein embedded in the cell membrane. If it misfolds even slightly, quality-control systems in the cell destroy it before it can function, so the ion channel is simply missing.",
    },
  },
  brca1: {
    label: "BRCA1 — demo fragment",
    sequence: "MDLSALRVEEVQNVINAMQKILECPICLELIKEPVSTKCDHIFCKFCMLKLLNQKKGPSQCPLCKNDITKRSLQESTRFSQLVEELLKIICAFQLDTGLEYANSYNFAKKENNSPEHLKDEVSIIQSMGYRNRAKRLLQSEPENPS",
    isFragment: true,
    disease: {
      title: "BRCA1",
      associations: [
        {
          disease: "Hereditary Breast and Ovarian Cancer Syndrome",
          summary: "Inherited BRCA1 mutations impair DNA double-strand break repair, allowing genetic damage to accumulate and raising cancer risk substantially.",
        },
      ],
      pathway: "Homologous recombination repair of double-strand DNA breaks, working with partners like BRCA2 and RAD51.",
      whyItMatters: "BRCA1 acts as scaffolding that assembles a DNA-repair team at the site of damage. A misfolded or truncated BRCA1 can't hold that team together, leaving breaks unrepaired.",
    },
  },
};

const GENERIC_DISEASE_NOTE = {
  title: "Custom Sequence",
  associations: [],
  pathway: null,
  whyItMatters: "This sequence isn't one of the curated example proteins, so no illustrative disease association is shown. A production version of this tool would query live databases such as UniProt and ClinVar.",
};

/* ---------------------------------------------------------------------------
   3. PURE ANALYSIS FUNCTIONS (real, lightweight computations)
   ------------------------------------------------------------------------- */

function cleanSequence(raw) {
  return raw
    .split("\n")
    .filter((line) => !line.trim().startsWith(">"))
    .join("")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

// Small deterministic hash so "simulated" values are stable per-sequence
// instead of re-randomizing on every render.
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

  // --- Molecular weight ---
  let mw = WATER_MASS;
  for (const ch of seq) mw += RESIDUE_MASS[ch] ?? 110;

  // --- Composition ---
  const composition = {};
  for (const ch of seq) composition[ch] = (composition[ch] || 0) + 1;
  const compositionList = Object.entries(composition)
    .map(([code, count]) => ({
      code, count, name: AA_FULL_NAME[code] || code,
      pct: (count / length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // --- Hydrophobicity ---
  let hydrophobicCount = 0;
  const kdTrack = [];
  for (const ch of seq) {
    const kd = KYTE_DOOLITTLE[ch] ?? 0;
    kdTrack.push(kd);
    if (kd > 0) hydrophobicCount++;
  }
  const hydrophobicPct = (hydrophobicCount / length) * 100;
  const hydrophilicPct = 100 - hydrophobicPct;

  // --- Secondary structure (Chou-Fasman style heuristic) ---
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

  // --- Motifs ---
  const motifHits = MOTIFS.map((m) => {
    const positions = [];
    let match;
    const re = new RegExp(m.pattern);
    while ((match = re.exec(seq)) && positions.length < 6) {
      positions.push(match.index + 1);
    }
    return { ...m, count: positions.length, positions };
  }).filter((m) => m.count > 0);

  // --- Simulated domain segmentation (windowed hydrophobicity clustering) ---
  const windowSize = Math.max(8, Math.floor(length / 10));
  const domains = [];
  let cursor = 0;
  const domainNames = ["N-terminal region", "Core structural domain", "Functional loop region", "C-terminal region", "Linker segment"];
  let dIdx = 0;
  while (cursor < length) {
    const segLen = Math.min(windowSize + Math.floor(rand() * windowSize), length - cursor);
    domains.push({
      name: domainNames[dIdx % domainNames.length],
      start: cursor + 1,
      end: cursor + segLen,
    });
    cursor += segLen;
    dIdx++;
  }

  // --- Simulated evolutionary conservation track ---
  const conservationTrack = seq.split("").map((ch, i) => {
    const base = 0.4 + rand() * 0.6;
    return Math.round(base * 100) / 100;
  });

  // --- Simulated cellular location estimate ---
  const nTerm = seq.slice(0, 20);
  const nTermHydro = nTerm.split("").filter((c) => (KYTE_DOOLITTLE[c] ?? 0) > 1.5).length / Math.max(1, nTerm.length);
  let location;
  if (nTermHydro > 0.5) location = "Membrane-associated / Secreted (signal-peptide-like N-terminus detected)";
  else if (hydrophobicPct > 45) location = "Membrane-associated (high overall hydrophobicity)";
  else if (rand() > 0.5) location = "Cytoplasmic";
  else location = "Nuclear";

  // --- Simplified stability estimate (illustrative, not a validated index) ---
  const prolinePct = (composition["P"] || 0) / length * 100;
  let stability = 55 + (helixPct - sheetPct) * 0.15 + (hydrophobicPct - 50) * 0.25 - prolinePct * 0.4;
  stability = Math.max(5, Math.min(95, Math.round(stability)));

  // --- Confidence indicator (simulated, stable per sequence) ---
  const confidence = Math.round(58 + rand() * 30);

  // --- Mutation hotspot positions (simulated: top conservation-scoring residues) ---
  const hotspots = conservationTrack
    .map((score, i) => ({ i, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(5, Math.floor(length / 15) + 1))
    .map((h) => h.i + 1)
    .sort((a, b) => a - b);

  return {
    length, mw, compositionList, hydrophobicPct, hydrophilicPct, kdTrack,
    helixPct, sheetPct, coilPct, ssTrack, motifHits, domains,
    conservationTrack, location, stability, confidence, hotspots,
  };
}

/* ---------------------------------------------------------------------------
   4. SMALL UI PRIMITIVES
   ------------------------------------------------------------------------- */

function Disclaimer({ compact }) {
  return (
    <div className={`disclaimer ${compact ? "compact" : ""}`}>
      <ShieldAlert size={compact ? 14 : 16} />
      <span>
        This analysis is generated for educational purposes only and is not intended for medical diagnosis or treatment.
      </span>
    </div>
  );
}

function InfoCard({ icon: Icon, title, accent, badge, children, explain }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          <span className="icon-chip" style={{ "--chip": accent }}><Icon size={16} /></span>
          <h3>{title}</h3>
        </div>
        <div className="card-head-right">
          {badge && <span className="badge">{badge}</span>}
          {explain && (
            <button className="info-btn" onClick={() => setOpen((o) => !o)} aria-label="Explain this metric">
              <Info size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="card-body">{children}</div>
      {explain && open && (
        <div className="card-explain">
          <p>{explain}</p>
        </div>
      )}
    </div>
  );
}

function Gauge({ value, label }) {
  const angle = (value / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const cx = 90, cy = 90, r = 70;
  const needleX = cx - r * Math.cos(rad);
  const needleY = cy - r * Math.sin(rad);
  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 180 110" className="gauge-svg">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="#1E3A54" strokeWidth="12" strokeLinecap="round" />
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 219.9} 219.9`} />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#E6EEF7" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="#22D3EE" />
      </svg>
      <div className="gauge-value">{value}%</div>
      <div className="gauge-label">{label}</div>
    </div>
  );
}

function CompositionDonut({ list, length }) {
  const top = list.slice(0, 6);
  const other = list.slice(6).reduce((s, x) => s + x.count, 0);
  const slices = other > 0 ? [...top, { code: "Other", name: "Other residues", count: other, pct: (other / length) * 100 }] : top;
  const colors = ["#22D3EE", "#3B82F6", "#6366F1", "#34D399", "#F59E0B", "#EC4899", "#64748B"];
  let acc = 0;
  const circumference = 2 * Math.PI * 60;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 160 160" className="donut-svg">
        <circle cx="80" cy="80" r="60" fill="none" stroke="#101E33" strokeWidth="20" />
        {slices.map((s, i) => {
          const frac = s.pct / 100;
          const dash = frac * circumference;
          const el = (
            <circle key={s.code} cx="80" cy="80" r="60" fill="none" stroke={colors[i % colors.length]}
              strokeWidth="20" strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-acc} transform="rotate(-90 80 80)" strokeLinecap="butt" />
          );
          acc += dash;
          return el;
        })}
        <text x="80" y="76" textAnchor="middle" className="donut-center-num">{length}</text>
        <text x="80" y="94" textAnchor="middle" className="donut-center-label">residues</text>
      </svg>
      <div className="donut-legend">
        {slices.map((s, i) => (
          <div className="legend-row" key={s.code}>
            <span className="legend-dot" style={{ background: colors[i % colors.length] }} />
            <span className="legend-name">{s.code === "Other" ? "Other" : `${s.name} (${s.code})`}</span>
            <span className="legend-pct">{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapTrack({ track, colorFn, height = 22 }) {
  return (
    <div className="heatmap-track" style={{ height }}>
      {track.map((v, i) => (
        <div key={i} className="heatmap-cell" style={{ background: colorFn(v) }} title={`Position ${i + 1}: ${v}`} />
      ))}
    </div>
  );
}

function kdColor(v) {
  const t = Math.max(0, Math.min(1, (v + 4.5) / 9));
  const r = Math.round(59 + t * (34 - 59));
  const g = Math.round(90 + t * (211 - 90));
  const b = Math.round(150 + t * (238 - 150));
  return `rgb(${r},${g},${b})`;
}
function conservationColor(v) {
  const t = Math.max(0, Math.min(1, v));
  return `rgba(245,158,11,${0.15 + t * 0.85})`;
}
function ssColor(label) {
  if (label === "H") return "#22D3EE";
  if (label === "E") return "#6366F1";
  return "#334155";
}

function DomainMap({ domains, length, hotspots }) {
  const colors = ["#22D3EE33", "#3B82F633", "#6366F133", "#34D39933"];
  return (
    <div className="domain-map">
      <div className="domain-track">
        {domains.map((d, i) => (
          <div key={i} className="domain-seg" style={{
            left: `${(d.start - 1) / length * 100}%`,
            width: `${(d.end - d.start + 1) / length * 100}%`,
            background: colors[i % colors.length],
            borderColor: colors[i % colors.length].replace("33", "aa"),
          }}>
            <span>{d.name}</span>
          </div>
        ))}
        {hotspots.map((h) => (
          <div key={h} className="hotspot-marker" style={{ left: `${(h - 1) / length * 100}%` }} title={`Hotspot near residue ${h}`} />
        ))}
      </div>
      <div className="domain-ruler">
        <span>1</span><span>{length}</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   5. HERO RIBBON — the signature visual. It redraws itself from the actual
   computed helix / sheet / coil percentages of the loaded sequence.
   ------------------------------------------------------------------------- */
function ProteinRibbon({ helixPct, sheetPct, coilPct, analyzing }) {
  const totalSegments = 24;
  const helixSeg = Math.round((helixPct / 100) * totalSegments);
  const sheetSeg = Math.round((sheetPct / 100) * totalSegments);
  const coilSeg = Math.max(0, totalSegments - helixSeg - sheetSeg);
  const segments = [
    ...Array(helixSeg).fill("H"),
    ...Array(sheetSeg).fill("E"),
    ...Array(coilSeg).fill("C"),
  ];
  // interleave a bit so it doesn't look like 3 flat blocks
  segments.sort(() => 0.5 - (segments.length % 2));

  const width = 900, height = 220;
  const step = width / totalSegments;

  return (
    <div className={`ribbon-hero ${analyzing ? "analyzing" : ""}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="ribbon-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="helixGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#0E7490" />
          </linearGradient>
          <linearGradient id="bgGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#bgGlow)" />
        {segments.map((type, i) => {
          const x = i * step;
          const midY = height / 2;
          if (type === "H") {
            // helix: sine wave coil
            const path = Array.from({ length: 8 }, (_, k) => {
              const px = x + (k / 7) * step;
              const py = midY + Math.sin((k / 7) * Math.PI * 2 + i) * 34;
              return `${k === 0 ? "M" : "L"}${px},${py}`;
            }).join(" ");
            return <path key={i} d={path} stroke="url(#helixGrad)" strokeWidth="6" fill="none" strokeLinecap="round" className="seg seg-h" />;
          }
          if (type === "E") {
            // sheet: flat arrow
            const y1 = midY - 14, y2 = midY + 14;
            return (
              <g key={i} className="seg seg-e">
                <polygon
                  points={`${x},${y1} ${x + step * 0.75},${y1} ${x + step},${midY} ${x + step * 0.75},${y2} ${x},${y2}`}
                  fill="#6366F1" opacity="0.85"
                />
              </g>
            );
          }
          // coil: dotted line
          return (
            <line key={i} x1={x} y1={midY} x2={x + step} y2={midY + Math.sin(i) * 6}
              stroke="#475569" strokeWidth="3" strokeDasharray="2 5" strokeLinecap="round" className="seg seg-c" />
          );
        })}
        {analyzing && <rect className="scan-line" x="0" y="0" width="6" height={height} fill="#22D3EE" opacity="0.8" />}
      </svg>
      <div className="ribbon-legend">
        <span><i style={{ background: "#22D3EE" }} /> Alpha Helix {helixPct.toFixed(0)}%</span>
        <span><i style={{ background: "#6366F1" }} /> Beta Sheet {sheetPct.toFixed(0)}%</span>
        <span><i style={{ background: "#475569" }} /> Coil {coilPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   6. MAIN APP
   ------------------------------------------------------------------------- */
export default function App() {
  const [sequence, setSequence] = useState("");
  const [exampleKey, setExampleKey] = useState("");
  const [stage, setStage] = useState("input"); // input | analyzing | results
  const [analysis, setAnalysis] = useState(null);
  const [diseaseInfo, setDiseaseInfo] = useState(null);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);

  const cleaned = useMemo(() => cleanSequence(sequence), [sequence]);

  const handleExampleChange = (e) => {
    const key = e.target.value;
    setExampleKey(key);
    setFileError("");
    if (key && EXAMPLES[key]) setSequence(EXAMPLES[key].sequence);
    else setSequence("");
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(txt|fasta|fa)$/i.test(file.name)) {
      setFileError("Please upload a .txt or .fasta file.");
      return;
    }
    setFileError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSequence(String(ev.target.result || ""));
      setExampleKey("");
    };
    reader.readAsText(file);
  };

  const runAnalysis = useCallback(() => {
    const seq = cleanSequence(sequence);
    if (!seq || seq.length < 5) {
      setFileError("Enter a valid amino acid sequence (at least 5 residues).");
      return;
    }
    setFileError("");
    setStage("analyzing");
    setTimeout(() => {
      const result = analyzeSequence(seq);
      setAnalysis(result);
      setDiseaseInfo(exampleKey && EXAMPLES[exampleKey] ? EXAMPLES[exampleKey].disease : GENERIC_DISEASE_NOTE);
      setStage("results");
    }, 2000);
  }, [sequence, exampleKey]);

  const reset = () => {
    setStage("input");
    setAnalysis(null);
    setDiseaseInfo(null);
  };

  return (
    <div className="app-root">
      <style>{CSS}</style>

      {/* HEADER */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon"><Dna size={22} /></div>
          <div>
            <h1>Protein Structure &amp; Disease Insight Analyzer</h1>
            <p>Educational bioinformatics dashboard · not a diagnostic tool</p>
          </div>
        </div>
        {stage === "results" && (
          <button className="btn-ghost" onClick={reset}><X size={14} /> New analysis</button>
        )}
      </header>

      <Disclaimer />

      {/* INPUT STAGE */}
      {stage !== "results" && (
        <main className="input-stage">
          <div className="input-panel">
            <div className="panel-label"><FlaskConical size={16} /> 1. Choose an example protein</div>
            <select className="select" value={exampleKey} onChange={handleExampleChange}>
              <option value="">— Select an example —</option>
              {Object.entries(EXAMPLES).map(([key, v]) => (
                <option key={key} value={key}>{v.label}</option>
              ))}
            </select>

            <div className="panel-label" style={{ marginTop: 18 }}><Layers size={16} /> 2. Or paste a FASTA / raw sequence</div>
            <textarea
              className="textarea"
              placeholder={">sp|EXAMPLE|My_Protein\nMSTNPKPQRKTKRNTNRRPQDVKFPGGGQIVGGVY..."}
              value={sequence}
              onChange={(e) => { setSequence(e.target.value); setExampleKey(""); }}
              rows={7}
            />

            <div className="panel-label" style={{ marginTop: 18 }}><Upload size={16} /> 3. Or upload a .txt / .fasta file</div>
            <div className="upload-row">
              <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> Choose file
              </button>
              <input ref={fileInputRef} type="file" accept=".txt,.fasta,.fa" hidden onChange={handleFile} />
              <span className="hint">FASTA headers (lines starting with &gt;) are ignored automatically.</span>
            </div>

            {fileError && <div className="error-msg"><AlertTriangle size={14} /> {fileError}</div>}

            <div className="seq-meta">
              {cleaned.length > 0 ? `${cleaned.length} valid residues detected` : "No sequence loaded yet"}
            </div>

            <button className="btn-primary" onClick={runAnalysis} disabled={stage === "analyzing"}>
              <Play size={16} /> Analyze Protein
            </button>
          </div>

          <div className="about-panel">
            <h3><Microscope size={16} /> What this tool demonstrates</h3>
            <p>This dashboard shows how AI and computational biology accelerate protein analysis — from basic physicochemical properties to structure prediction concepts inspired by tools like AlphaFold.</p>
            <ul>
              <li>Real calculations: molecular weight, composition, hydrophobicity, motif search</li>
              <li>Classic teaching heuristics: Chou-Fasman secondary structure tendency</li>
              <li>Simulated/illustrative: domain boundaries, conservation, cellular location, disease confidence</li>
            </ul>
            <Disclaimer compact />
          </div>
        </main>
      )}

      {/* ANALYZING STAGE */}
      {stage === "analyzing" && (
        <div className="analyzing-overlay">
          <div className="scanner">
            <Dna size={40} className="spin-dna" />
          </div>
          <p className="analyzing-text">Analyzing Protein<span className="dots"><span>.</span><span>.</span><span>.</span></span></p>
          <div className="analyzing-bar"><div className="analyzing-bar-fill" /></div>
        </div>
      )}

      {/* RESULTS STAGE */}
      {stage === "results" && analysis && (
        <main className="results-stage">
          <ProteinRibbon helixPct={analysis.helixPct} sheetPct={analysis.sheetPct} coilPct={analysis.coilPct} analyzing={false} />

          <section className="stat-grid">
            <InfoCard icon={Layers} title="Sequence Length" accent="#22D3EE"
              explain="This is simply the number of amino acid building blocks in the chain, counted directly from your input.">
              <div className="big-stat">{analysis.length}<span> residues</span></div>
            </InfoCard>

            <InfoCard icon={Activity} title="Molecular Weight" accent="#3B82F6"
              explain="Calculated by adding the average mass of each amino acid in the chain, plus one water molecule for the finished protein.">
              <div className="big-stat">{(analysis.mw / 1000).toFixed(2)}<span> kDa</span></div>
              <div className="sub-stat">{analysis.mw.toFixed(1)} Da exact</div>
            </InfoCard>

            <InfoCard icon={GaugeIcon} title="Stability Estimate" badge="Simplified heuristic" accent="#34D399"
              explain="A simplified illustrative score combining helix content, hydrophobicity, and proline content. It is not the validated instability index used in real lab software (e.g. ProtParam).">
              <div className="big-stat">{analysis.stability}<span> / 100</span></div>
            </InfoCard>

            <InfoCard icon={MapPin} title="Predicted Cellular Location" badge="Educational estimate" accent="#F59E0B"
              explain="Estimated from hydrophobicity patterns near the start of the chain — real localization prediction uses much larger, trained models (e.g. signal peptide detectors, PSORT).">
              <div className="location-stat">{analysis.location}</div>
            </InfoCard>
          </section>

          <section className="chart-row">
            <InfoCard icon={Waves} title="Amino Acid Composition" accent="#22D3EE"
              explain="Each amino acid in the sequence is counted and shown as a percentage of the total — this is a direct, exact calculation.">
              <CompositionDonut list={analysis.compositionList} length={analysis.length} />
            </InfoCard>

            <InfoCard icon={Target} title="Hydrophobic vs Hydrophilic" accent="#3B82F6"
              explain="Each residue is classified using the Kyte-Doolittle hydrophobicity scale. Warmer / brighter cells are more hydrophobic (water-avoiding); cooler cells are more hydrophilic (water-attracting).">
              <div className="hydro-summary">
                <div className="hydro-bar">
                  <div className="hydro-fill hydrophobic" style={{ width: `${analysis.hydrophobicPct}%` }} />
                </div>
                <div className="hydro-labels">
                  <span>Hydrophobic {analysis.hydrophobicPct.toFixed(1)}%</span>
                  <span>Hydrophilic {analysis.hydrophilicPct.toFixed(1)}%</span>
                </div>
              </div>
              <HeatmapTrack track={analysis.kdTrack} colorFn={kdColor} />
            </InfoCard>

            <InfoCard icon={GaugeIcon} title="Overall Confidence" badge="Educational Estimate" accent="#22D3EE"
              explain="A simulated confidence indicator representing how a real structure-prediction pipeline (like AlphaFold's pLDDT score) communicates uncertainty. It is generated for demonstration only.">
              <Gauge value={analysis.confidence} label="Simulated model confidence" />
            </InfoCard>
          </section>

          <section className="wide-row">
            <InfoCard icon={Dna} title="Predicted Secondary Structure Distribution" badge="Chou-Fasman heuristic" accent="#6366F1"
              explain="Each residue's tendency to form a helix, sheet, or coil is scored with the classic Chou-Fasman propensity table from 1978 — a real, simplified teaching method, not a modern deep-learning predictor.">
              <div className="ss-bars">
                <div className="ss-bar-row"><span>Alpha Helix</span><div className="ss-bar"><div style={{ width: `${analysis.helixPct}%`, background: "#22D3EE" }} /></div><b>{analysis.helixPct.toFixed(1)}%</b></div>
                <div className="ss-bar-row"><span>Beta Sheet</span><div className="ss-bar"><div style={{ width: `${analysis.sheetPct}%`, background: "#6366F1" }} /></div><b>{analysis.sheetPct.toFixed(1)}%</b></div>
                <div className="ss-bar-row"><span>Coil</span><div className="ss-bar"><div style={{ width: `${analysis.coilPct}%`, background: "#475569" }} /></div><b>{analysis.coilPct.toFixed(1)}%</b></div>
              </div>
              <HeatmapTrack track={analysis.ssTrack} colorFn={ssColor} height={14} />
            </InfoCard>
          </section>

          <section className="wide-row">
            <InfoCard icon={Layers} title="Functional Domain Map" badge="Simulated" accent="#3B82F6"
              explain="Domain boundaries here are generated from windowed hydrophobicity clustering as a stand-in for real domain-prediction databases like Pfam or InterPro.">
              <DomainMap domains={analysis.domains} length={analysis.length} hotspots={analysis.hotspots} />
            </InfoCard>
          </section>

          <section className="wide-row">
            <InfoCard icon={Target} title="Evolutionary Conservation & Mutation Hotspots" badge="Simulated" accent="#F59E0B"
              explain="This illustrative track stands in for a real multiple-sequence-alignment conservation score. Brighter amber marks residues shown here as more 'conserved' / hotspot-like for demonstration.">
              <HeatmapTrack track={analysis.conservationTrack} colorFn={conservationColor} />
              <p className="hotspot-caption">Simulated hotspot positions: {analysis.hotspots.join(", ")}</p>
            </InfoCard>
          </section>

          <section className="wide-row">
            <InfoCard icon={BookOpen} title="Conserved Motif Detection" badge="Pattern search" accent="#34D399"
              explain="These are real, simplified regular-expression searches for short linear motifs commonly taught in introductory bioinformatics — not a full PROSITE/InterPro scan.">
              {analysis.motifHits.length === 0 && <p className="muted">No matches found for the demonstration motif set.</p>}
              {analysis.motifHits.map((m) => (
                <div key={m.name} className="motif-row">
                  <div><b>{m.name}</b><span className="muted"> — {m.note}</span></div>
                  <div className="motif-positions">{m.count} match(es) at {m.positions.join(", ")}</div>
                </div>
              ))}
            </InfoCard>
          </section>

          {/* DISEASE ASSOCIATION SECTION */}
          <section className="disease-section">
            <h2><ShieldAlert size={20} /> Disease Association — {diseaseInfo.title}</h2>
            <div className="confidence-chip">Educational Estimate</div>

            {diseaseInfo.associations.length > 0 ? (
              <div className="disease-grid">
                {diseaseInfo.associations.map((d) => (
                  <div key={d.disease} className="disease-card">
                    <h4>{d.disease}</h4>
                    <p>{d.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">{diseaseInfo.whyItMatters}</p>
            )}

            {diseaseInfo.pathway && (
              <div className="pathway-box">
                <b>Biological pathway involved:</b> {diseaseInfo.pathway}
              </div>
            )}
            {diseaseInfo.associations.length > 0 && (
              <div className="pathway-box">
                <b>Why mutations can matter here:</b> {diseaseInfo.whyItMatters}
              </div>
            )}

            <div className="references-box">
              <b>References (placeholder):</b>
              <ul>
                <li>UniProt Knowledgebase — www.uniprot.org</li>
                <li>ClinVar (NCBI) — www.ncbi.nlm.nih.gov/clinvar</li>
                <li>Chou &amp; Fasman, Biochemistry (1978) — secondary structure propensities</li>
              </ul>
            </div>
          </section>

          <Disclaimer />
        </main>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   7. STYLES
   ------------------------------------------------------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  --bg-void: #050B14;
  --bg-panel: #0B1526;
  --bg-raised: #101E33;
  --border: #1E3A5480;
  --cyan: #22D3EE;
  --blue: #3B82F6;
  --indigo: #6366F1;
  --text: #E6EEF7;
  --muted: #7C93B3;
  --amber: #F59E0B;
  --green: #34D399;
}

.app-root {
  background: radial-gradient(ellipse at top, #0A1930 0%, var(--bg-void) 55%);
  min-height: 100vh;
  color: var(--text);
  font-family: 'IBM Plex Sans', sans-serif;
  padding: 24px clamp(16px, 4vw, 56px) 60px;
}

.app-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
}
.brand { display: flex; align-items: center; gap: 14px; }
.brand-icon {
  width: 46px; height: 46px; border-radius: 12px;
  background: linear-gradient(135deg, var(--blue), var(--cyan));
  display: flex; align-items: center; justify-content: center;
  color: #001018; flex-shrink: 0;
  box-shadow: 0 0 24px #22D3EE55;
}
.brand h1 { font-family: 'Space Grotesk', sans-serif; font-size: 1.35rem; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
.brand p { margin: 2px 0 0; color: var(--muted); font-size: 0.82rem; }

.disclaimer {
  display: flex; align-items: center; gap: 10px;
  background: #1C130480; border: 1px solid #F59E0B44; color: #FCD9A0;
  padding: 10px 16px; border-radius: 10px; font-size: 0.82rem; margin-bottom: 20px;
}
.disclaimer.compact { padding: 8px 12px; font-size: 0.74rem; margin-top: 16px; margin-bottom: 0; }

.input-stage {
  display: grid; grid-template-columns: 1.3fr 1fr; gap: 20px;
}
@media (max-width: 880px) { .input-stage { grid-template-columns: 1fr; } }

.input-panel, .about-panel {
  background: var(--bg-panel); border: 1px solid var(--border);
  border-radius: 16px; padding: 24px;
}
.panel-label {
  display: flex; align-items: center; gap: 8px; font-size: 0.82rem;
  color: var(--cyan); font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;
}
.select, .textarea {
  width: 100%; background: var(--bg-raised); border: 1px solid var(--border);
  color: var(--text); border-radius: 10px; padding: 12px 14px; font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem; resize: vertical;
}
.select { font-family: 'IBM Plex Sans', sans-serif; cursor: pointer; }
.textarea:focus, .select:focus { outline: 2px solid var(--cyan); }
.upload-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.hint { color: var(--muted); font-size: 0.76rem; }
.error-msg { display: flex; gap: 8px; align-items: center; color: #FCA5A5; font-size: 0.8rem; margin-top: 10px; }
.seq-meta { margin: 14px 0; color: var(--muted); font-size: 0.8rem; font-family: 'IBM Plex Mono', monospace; }

.btn-primary, .btn-secondary, .btn-ghost {
  display: inline-flex; align-items: center; gap: 8px; font-weight: 600;
  border-radius: 10px; border: none; cursor: pointer; font-family: 'IBM Plex Sans', sans-serif;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.btn-primary {
  background: linear-gradient(135deg, var(--blue), var(--cyan)); color: #001018;
  padding: 12px 22px; font-size: 0.92rem; width: 100%; justify-content: center;
  box-shadow: 0 0 20px #22D3EE33;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 24px #22D3EE55; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: var(--bg-raised); color: var(--text); border: 1px solid var(--border); padding: 10px 16px; font-size: 0.85rem; }
.btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); padding: 8px 14px; font-size: 0.8rem; }
.btn-ghost:hover { color: var(--text); border-color: var(--cyan); }

.about-panel h3 { display: flex; gap: 8px; align-items: center; font-family: 'Space Grotesk', sans-serif; font-size: 1rem; margin-top: 0; }
.about-panel p { color: var(--muted); font-size: 0.87rem; line-height: 1.55; }
.about-panel ul { color: var(--muted); font-size: 0.83rem; line-height: 1.7; padding-left: 18px; }

.analyzing-overlay {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 90px 20px; gap: 20px;
}
.scanner { width: 90px; height: 90px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle, #22D3EE22, transparent 70%); border: 1px solid var(--border); }
.spin-dna { color: var(--cyan); animation: spin 2.2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.analyzing-text { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; color: var(--text); }
.dots span { animation: blink 1.4s infinite; opacity: 0; }
.dots span:nth-child(2) { animation-delay: 0.2s; }
.dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%,100%{opacity:0;} 50%{opacity:1;} }
.analyzing-bar { width: 280px; height: 4px; background: var(--bg-raised); border-radius: 4px; overflow: hidden; }
.analyzing-bar-fill { height: 100%; width: 40%; background: linear-gradient(90deg, var(--blue), var(--cyan)); animation: loadbar 2s ease-in-out infinite; }
@keyframes loadbar { 0%{transform:translateX(-100%);} 100%{transform:translateX(350%);} }

.results-stage { display: flex; flex-direction: column; gap: 20px; }

.ribbon-hero { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
.ribbon-svg { width: 100%; height: 200px; display: block; }
.ribbon-legend { display: flex; gap: 22px; margin-top: 6px; font-size: 0.8rem; color: var(--muted); flex-wrap: wrap; }
.ribbon-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: middle; }
.seg-h, .seg-e, .seg-c { transition: opacity 0.3s; }

.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.chart-row { display: grid; grid-template-columns: 1.1fr 1.1fr 0.8fr; gap: 16px; }
.wide-row { display: grid; grid-template-columns: 1fr; }
@media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2,1fr); } .chart-row { grid-template-columns: 1fr; } }
@media (max-width: 560px) { .stat-grid { grid-template-columns: 1fr; } }

.card { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; }
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.card-title { display: flex; align-items: center; gap: 10px; }
.card-title h3 { font-family: 'Space Grotesk', sans-serif; font-size: 0.88rem; margin: 0; font-weight: 600; }
.icon-chip { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--chip) 18%, transparent); color: var(--chip); flex-shrink: 0; }
.card-head-right { display: flex; align-items: center; gap: 8px; }
.badge { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; background: #F59E0B22; color: var(--amber); padding: 4px 8px; border-radius: 6px; white-space: nowrap; }
.info-btn { background: var(--bg-raised); border: 1px solid var(--border); border-radius: 6px; width: 26px; height: 26px; color: var(--muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.info-btn:hover { color: var(--cyan); border-color: var(--cyan); }
.card-body { flex: 1; }
.card-explain { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border); }
.card-explain p { color: var(--muted); font-size: 0.82rem; line-height: 1.55; margin: 0; }

.big-stat { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; font-weight: 700; color: var(--text); }
.big-stat span { font-size: 0.9rem; color: var(--muted); font-weight: 500; margin-left: 4px; }
.sub-stat { color: var(--muted); font-size: 0.78rem; margin-top: 4px; }
.location-stat { font-size: 1rem; font-weight: 600; color: var(--cyan); line-height: 1.4; }

.donut-wrap { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.donut-svg { width: 140px; height: 140px; flex-shrink: 0; }
.donut-center-num { fill: var(--text); font-size: 22px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; }
.donut-center-label { fill: var(--muted); font-size: 10px; }
.donut-legend { flex: 1; min-width: 140px; }
.legend-row { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; padding: 3px 0; }
.legend-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.legend-name { color: var(--text); flex: 1; }
.legend-pct { color: var(--muted); font-family: 'IBM Plex Mono', monospace; }

.hydro-summary { margin-bottom: 12px; }
.hydro-bar { height: 10px; border-radius: 6px; background: #1E3A54; overflow: hidden; margin-bottom: 6px; }
.hydro-fill.hydrophobic { height: 100%; background: linear-gradient(90deg, var(--blue), var(--cyan)); }
.hydro-labels { display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--muted); }
.heatmap-track { display: flex; border-radius: 6px; overflow: hidden; margin-top: 6px; }
.heatmap-cell { flex: 1; min-width: 2px; }

.gauge-wrap { display: flex; flex-direction: column; align-items: center; }
.gauge-svg { width: 160px; }
.gauge-value { font-family: 'Space Grotesk', sans-serif; font-size: 1.4rem; font-weight: 700; margin-top: -6px; }
.gauge-label { color: var(--muted); font-size: 0.74rem; }

.ss-bars { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.ss-bar-row { display: grid; grid-template-columns: 90px 1fr 50px; align-items: center; gap: 10px; font-size: 0.8rem; }
.ss-bar { height: 9px; background: #1E3A54; border-radius: 5px; overflow: hidden; }
.ss-bar div { height: 100%; }

.domain-map { padding: 8px 0; }
.domain-track { position: relative; height: 46px; background: var(--bg-raised); border-radius: 8px; margin-bottom: 6px; }
.domain-seg { position: absolute; top: 0; bottom: 0; border: 1px solid; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.domain-seg span { font-size: 0.62rem; color: var(--text); white-space: nowrap; padding: 0 4px; }
.hotspot-marker { position: absolute; top: -4px; width: 2px; height: 54px; background: var(--amber); box-shadow: 0 0 8px var(--amber); }
.domain-ruler { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--muted); font-family: 'IBM Plex Mono', monospace; }
.hotspot-caption { font-size: 0.78rem; color: var(--muted); margin-top: 8px; }

.motif-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 0.82rem; flex-wrap: wrap; }
.motif-row:last-child { border-bottom: none; }
.motif-positions { color: var(--cyan); font-family: 'IBM Plex Mono', monospace; font-size: 0.76rem; }
.muted { color: var(--muted); font-size: 0.82rem; }

.disease-section { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
.disease-section h2 { display: flex; align-items: center; gap: 10px; font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; margin: 0 0 6px; }
.confidence-chip { display: inline-block; background: #F59E0B22; color: var(--amber); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; padding: 4px 10px; border-radius: 6px; margin-bottom: 16px; }
.disease-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 16px; }
.disease-card { background: var(--bg-raised); border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
.disease-card h4 { margin: 0 0 6px; color: var(--cyan); font-size: 0.9rem; }
.disease-card p { margin: 0; color: var(--muted); font-size: 0.82rem; line-height: 1.5; }
.pathway-box { background: #0E223A; border-left: 3px solid var(--blue); padding: 10px 14px; border-radius: 8px; font-size: 0.83rem; color: var(--text); margin-bottom: 12px; line-height: 1.5; }
.references-box { font-size: 0.78rem; color: var(--muted); border-top: 1px dashed var(--border); padding-top: 14px; margin-top: 6px; }
.references-box ul { padding-left: 18px; margin: 8px 0 0; line-height: 1.7; }
`;
