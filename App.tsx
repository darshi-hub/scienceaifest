import React, { useState, useEffect, useRef } from 'react';
import { 
  Beaker, Atom, Dna, Zap, Sliders, Shield, Leaf, DollarSign, 
  Droplet, CheckCircle2, ChevronRight, ChevronDown, Info, HelpCircle, 
  Cpu, Activity, Database, FlaskConical, Network, Presentation
} from 'lucide-react';

const apiKey = ""; // The execution environment provides the key at runtime.

// --- API Helpers ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, retries = 3) {
  const delays = [1000, 2000, 4000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await delay(delays[i]);
    }
  }
}

async function generateMoleculeText(prompt, sliders) {
  if (!apiKey) return null;

  const systemInstruction = `You are Molecule Architect AI. Given properties (Strength, Biodegradability, Cost, Flexibility) on a scale of 1-10, generate 3 highly detailed candidate molecules.
  Format your response STRICTLY as a JSON object:
  {
    "candidates": [
      {
        "name": "EcoFlex-A",
        "plausibility": 85,
        "composition": ["Carbon", "Oxygen", "Nitrogen"],
        "applications": ["Packaging", "Medical"],
        "stats": { "strength": 5, "cost": 3, "eco": 5 } 
      }
    ],
    "inspiration": [
      {"material": "PLA Plastic", "reason": "Basis for biodegradability"}
    ]
  }`;

  const userPrompt = `Sliders: Strength: ${sliders.strength}/10, Biodegradability: ${sliders.bio}/10, Cost: ${sliders.cost}/10, Flexibility: ${sliders.flex}/10. Request: ${prompt}`;

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error) {
    console.error("Text generation failed", error);
    return null;
  }
}

async function generateMoleculeImage(moleculeName, composition) {
  if (!apiKey) return null;
  const prompt = `A cinematic, glowing 3D rendering of a futuristic molecular structure called ${moleculeName} made of ${composition.join(', ')}. Dark background, neon cyan and purple lighting, highly detailed scientific visualization, depth of field.`;
  
  const payload = { instances: { prompt: prompt }, parameters: { sampleCount: 1 } };

  try {
    const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
  } catch (error) {
    console.error("Image generation failed", error);
    return null;
  }
}

const MOCK_DATA = {
  candidates: [
    { name: "EcoFlex-Alpha", plausibility: 89, composition: ["Carbon", "Oxygen", "Nitrogen"], applications: ["Ocean-safe Packaging", "Food Containers"], stats: { strength: 5, cost: 3, eco: 5 } },
    { name: "Silico-Yield", plausibility: 81, composition: ["Carbon", "Silicon", "Oxygen"], applications: ["Biodegradable Electronics", "Sensors"], stats: { strength: 4, cost: 2, eco: 4 } },
    { name: "Hydro-Weave", plausibility: 76, composition: ["Hydrogen", "Carbon", "Phosphorus"], applications: ["Agricultural Films", "Textiles"], stats: { strength: 3, cost: 5, eco: 5 } }
  ],
  inspiration: [
    { material: "PLA Plastic", reason: "Provided the baseline aliphatic polyester structure." },
    { material: "Chitosan", reason: "Inspired the nitrogen-based cross-linking for strength." }
  ]
};

// --- Main Application ---
export default function App() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    { id: 'intro', component: <SlideIntro onNext={() => setCurrentSlide(1)} /> },
    { id: 'lab', component: <SlideGenerator /> },
    { id: 'poster', component: <SlidePoster /> },
    { id: 'defense', component: <SlideFAQ /> }
  ];

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 font-sans overflow-hidden flex selection:bg-cyan-500/30">
      
      {/* Background Graphic Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-700/10 rounded-full blur-[150px]"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpdCIvPjwvc3ZnPg==')] opacity-40"></div>
      </div>

      {/* Floating Side Navigation (Presentation Clicker) */}
      <nav className="relative z-50 w-20 flex flex-col items-center justify-center border-r border-white/5 bg-slate-950/50 backdrop-blur-md h-full space-y-8 py-8">
        <div className="text-cyan-400 mb-auto mt-4" title="Presentation Mode">
          <Presentation size={24} />
        </div>
        
        <div className="flex flex-col space-y-6 flex-grow justify-center">
          {slides.map((_, idx) => (
            <button 
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className="relative group flex items-center justify-center w-12 h-12"
            >
              <div className={`transition-all duration-300 rounded-full ${currentSlide === idx ? 'w-4 h-4 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]' : 'w-2 h-2 bg-slate-600 group-hover:bg-cyan-200 group-hover:w-3 group-hover:h-3'}`}></div>
              
              {/* Tooltip */}
              <span className="absolute left-14 bg-slate-800 text-white text-xs px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 shadow-lg pointer-events-none">
                {['01. Introduction', '02. AI Lab Demo', '03. Architecture', '04. Q&A / Future'][idx]}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Slide Content Area */}
      <main className="relative z-10 flex-grow h-full overflow-y-auto overflow-x-hidden scroll-smooth">
        <div className="min-h-full flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-700 zoom-in-95">
          {slides[currentSlide].component}
        </div>
      </main>
    </div>
  );
}

// --- SLIDE 1: INTRO ---
function SlideIntro({ onNext }) {
  return (
    <div className="max-w-4xl text-center space-y-8">
      <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30 mb-4 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
        <Network className="w-16 h-16 text-cyan-400" />
      </div>
      <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-slate-400 leading-tight">
        Molecule Architect AI
      </h1>
      <p className="text-xl md:text-2xl text-slate-400 font-light max-w-3xl mx-auto leading-relaxed">
        Accelerating material science. We don't just search for existing molecules; we use artificial intelligence to synthesize completely novel, hypothetical chemical structures based on precise human constraints.
      </p>
      
      <div className="pt-12">
        <button 
          onClick={onNext}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full text-lg transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)]"
        >
          Enter the AI Lab
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

// --- SLIDE 2: THE GENERATOR (HUD Style) ---
function SlideGenerator() {
  const [sliders, setSliders] = useState({ strength: 7, bio: 9, cost: 4, flex: 6 });
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loadingText, setLoadingText] = useState('');

  const loadingSteps = ["Connecting to Gemini Core...", "Analyzing molecular parameters...", "Synthesizing candidates...", "Rendering structure..."];

  const handleGenerate = async () => {
    setStatus('loading');
    let step = 0;
    const interval = setInterval(() => {
      setLoadingText(loadingSteps[step]);
      step = (step + 1) % loadingSteps.length;
    }, 1200);

    try {
      let generatedData = await generateMoleculeText(prompt, sliders);
      if (!generatedData) {
        await delay(3000);
        generatedData = MOCK_DATA;
      }
      setResults(generatedData);

      if (generatedData?.candidates[0]) {
        const generatedImage = await generateMoleculeImage(generatedData.candidates[0].name, generatedData.candidates[0].composition);
        setImageUrl(generatedImage);
      }
      clearInterval(interval);
      setStatus('success');
    } catch (err) {
      clearInterval(interval);
      setStatus('error');
    }
  };

  return (
    <div className="w-full h-[85vh] max-w-7xl flex flex-col lg:flex-row gap-6">
      
      {/* LEFT: Controls (The input panel) */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl flex-grow flex flex-col shadow-2xl">
          <div className="mb-6 pb-4 border-b border-white/5">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sliders className="text-cyan-400" /> Synthesis Parameters
            </h2>
            <p className="text-slate-400 text-sm mt-1">Let the judges adjust the constraints.</p>
          </div>
          
          <div className="space-y-6 flex-grow">
            <SliderControl icon={<Shield />} label="Structural Strength" value={sliders.strength} onChange={(v) => setSliders({...sliders, strength: v})} color="bg-cyan-500" />
            <SliderControl icon={<Leaf />} label="Biodegradability" value={sliders.bio} onChange={(v) => setSliders({...sliders, bio: v})} color="bg-green-500" />
            <SliderControl icon={<DollarSign />} label="Cost Efficiency" value={sliders.cost} onChange={(v) => setSliders({...sliders, cost: v})} color="bg-yellow-500" />
            <SliderControl icon={<Activity />} label="Flexibility" value={sliders.flex} onChange={(v) => setSliders({...sliders, flex: v})} color="bg-purple-500" />
            
            <div className="pt-2">
               <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Custom Directives (Optional)</label>
               <input 
                 type="text"
                 placeholder="e.g. Must dissolve in seawater"
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
               />
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={status === 'loading'}
            className={`mt-6 w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider flex items-center justify-center gap-3 transition-all duration-300
              ${status === 'loading' 
                ? 'bg-slate-800 text-cyan-500 border border-cyan-500/30' 
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]'}`}
          >
            {status === 'loading' ? (
              <><Atom className="animate-spin w-6 h-6" /> {loadingText}</>
            ) : (
              <><Zap className="w-6 h-6" /> Initialize AI Synthesis</>
            )}
          </button>
        </div>
      </div>

      {/* RIGHT: Output (The HUD) */}
      <div className="w-full lg:w-2/3 bg-black/40 border border-slate-700/50 rounded-2xl backdrop-blur-md relative overflow-hidden flex flex-col shadow-2xl">
        
        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
            <Beaker className="w-20 h-20 mb-4 opacity-20" />
            <p className="text-xl font-light">Set parameters and initialize synthesis to view results.</p>
          </div>
        )}

        {status === 'success' && results && (
          <div className="absolute inset-0 flex flex-col animate-in fade-in duration-1000">
            {/* Top Half: Cinematic Image */}
            <div className="relative h-[55%] w-full bg-black flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="Generated Molecule" className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-90" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/30 via-black to-black">
                  <div className="w-24 h-24 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
                </div>
              )}
              
              {/* Overlay Info on Image */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent p-6 pt-24">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-5xl font-black text-white tracking-tight">{results.candidates[0].name}</h3>
                    <p className="text-cyan-400 font-mono text-sm mt-1 flex gap-2">
                      {results.candidates[0].composition.map((c, i) => <span key={i}>[{c}]</span>)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-light text-cyan-300">{results.candidates[0].plausibility}<span className="text-2xl text-cyan-600">%</span></div>
                    <div className="text-xs uppercase tracking-widest text-slate-400">Plausibility</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Half: Data Grid */}
            <div className="h-[45%] bg-slate-950 p-6 flex flex-col lg:flex-row gap-6 overflow-y-auto">
              
              {/* Alternatives */}
              <div className="flex-1 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">Alternative Candidates</h4>
                {results.candidates.slice(1).map((cand, idx) => (
                  <div key={idx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 flex justify-between items-center hover:border-cyan-500/30 transition-colors">
                    <div>
                      <div className="font-bold text-white text-sm">{cand.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{cand.applications[0]}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-cyan-400 font-mono text-sm">{cand.plausibility}%</div>
                      <div className="flex gap-0.5 mt-1">
                         {/* Mini visual stats */}
                         <div className="w-1 h-3 bg-cyan-500 rounded-full" style={{opacity: cand.stats.strength/5}}></div>
                         <div className="w-1 h-3 bg-green-500 rounded-full" style={{opacity: cand.stats.eco/5}}></div>
                         <div className="w-1 h-3 bg-yellow-500 rounded-full" style={{opacity: (5-cand.stats.cost+1)/5}}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inspiration */}
              <div className="flex-1 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">AI Research Inspiration</h4>
                {results.inspiration.map((insp, idx) => (
                  <div key={idx} className="bg-blue-900/10 rounded-lg p-3 border border-blue-500/20">
                    <div className="text-blue-300 font-semibold text-sm flex items-center gap-2">
                      <Database className="w-3 h-3" /> {insp.material}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 leading-relaxed">{insp.reason}</div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- SLIDE 3: POSTER (Project Anatomy) ---
function SlidePoster() {
  return (
    <div className="w-full max-w-6xl space-y-8">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-extrabold text-white">Project Anatomy</h2>
        <p className="text-cyan-400 font-mono mt-2 uppercase tracking-widest text-sm">How AI accelerates material science</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PresentationCard icon={<Atom className="text-blue-400" />} title="What is a Molecule?">
          The smallest fundamental unit of a compound. The specific arrangement of these atoms dictates the physical properties (strength, flexibility, biodegradability) of all materials.
        </PresentationCard>
        
        <PresentationCard icon={<Cpu className="text-purple-400" />} title="The Bottleneck">
          Traditional material discovery takes years of trial and error in physical labs. Scientists must manually guess and test combinations to find desired properties.
        </PresentationCard>

        <PresentationCard icon={<Network className="text-cyan-400" />} title="The AI Solution">
          AI accelerates this by scanning vast libraries of chemical knowledge, recognizing patterns, and predicting new, optimal molecular structures instantly based on human constraints.
        </PresentationCard>

        <PresentationCard icon={<FlaskConical className="text-green-400" />} title="Our Example: EcoFlex">
          An AI-generated hypothesis aiming to replace plastic. Designed for high strength and biodegradability, inspired by combining the properties of PLA Plastic and Chitosan.
        </PresentationCard>

        <PresentationCard icon={<Droplet className="text-blue-500" />} title="Applications">
          <div className="flex flex-wrap gap-2 pt-2">
            {['Eco-Packaging', 'Medical Implants', 'Construction', 'Water Filtration'].map(tag => (
              <span key={tag} className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs border border-slate-700">{tag}</span>
            ))}
          </div>
        </PresentationCard>

        <PresentationCard icon={<Zap className="text-yellow-400" />} title="The Output">
          Every generation is unique. The AI produces <em>hypotheses</em>. It demonstrates rapid ideation, providing material scientists with highly targeted starting points for real-world synthesis.
        </PresentationCard>
      </div>
    </div>
  );
}

// --- SLIDE 4: FAQ & FUTURE (Defense) ---
function SlideFAQ() {
  const faqs = [
    { q: "Did AI actually discover a new molecule?", a: "No. It generates scientifically plausible hypotheses that could inspire future research. Real scientists would need to synthesize and test them in a laboratory." },
    { q: "How does AI know chemistry?", a: "It has learned patterns from scientific literature and chemical knowledge, allowing it to suggest combinations that may have useful properties." },
    { q: "Why isn't this replacing scientists?", a: "AI accelerates idea generation, but physical experiments, safety testing, and validation must still be done by human chemists." },
    { q: "Is the molecule guaranteed to work?", a: "No. It is a hypothesis. The project demonstrates AI-assisted scientific creativity, not laboratory proof." }
  ];

  return (
    <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-12">
      
      {/* Left: FAQ (Defense) */}
      <div className="w-full lg:w-2/3 space-y-6">
        <div>
          <h2 className="text-4xl font-extrabold text-white">Project Defense</h2>
          <p className="text-slate-400 mt-2 text-lg">Common questions from scientific judges.</p>
        </div>

        <div className="grid gap-4 pt-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-slate-900/40 border border-slate-700 rounded-xl p-5 hover:border-cyan-500/50 transition-colors">
              <h3 className="text-lg font-bold text-white mb-2 flex gap-3">
                <span className="text-cyan-500">Q:</span> {faq.q}
              </h3>
              <p className="text-slate-400 pl-8 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Future Work */}
      <div className="w-full lg:w-1/3">
        <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/10 border border-cyan-500/30 rounded-3xl p-8 h-full shadow-[0_0_40px_rgba(34,211,238,0.1)]">
          <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/40">
            <ChevronDown className="text-cyan-400 w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-6">Future Scope</h3>
          <p className="text-slate-400 mb-8 text-sm">To move from digital ideation to physical reality, the following steps are required:</p>
          
          <div className="space-y-4">
            <FutureStep num="01" text="Simulate molecule stability via computational software" />
            <FutureStep num="02" text="Predict exact melting points & toxicity" />
            <FutureStep num="03" text="Plan synthesis pathways" />
            <FutureStep num="04" text="Physical laboratory creation" />
            <FutureStep num="05" text="Real-world stress testing" />
          </div>
        </div>
      </div>

    </div>
  );
}

// --- Helper Components ---

function SliderControl({ icon, label, value, onChange, color }) {
  return (
    <div className="group">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span className="opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span> {label}
        </label>
        <span className="text-xs font-mono bg-black/50 px-2 py-1 rounded text-cyan-300 border border-slate-700">
          {value}/10
        </span>
      </div>
      <input 
        type="range" min="1" max="10" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        style={{ accentColor: 'var(--tw-colors-cyan-400)' }} 
      />
      {/* Visual Tech Blocks */}
      <div className="flex gap-[2px] mt-2 h-1.5 w-full opacity-60">
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`flex-1 rounded-sm ${i < value ? color : 'bg-slate-800'}`}></div>
        ))}
      </div>
    </div>
  );
}

function PresentationCard({ icon, title, children }) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/80 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-900/20">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
          {React.cloneElement(icon, { className: `${icon.props.className} w-6 h-6` })}
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <div className="text-slate-400 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function FutureStep({ num, text }) {
  return (
    <div className="flex gap-4 items-start group">
      <div className="text-cyan-500 font-mono font-bold text-lg mt-0.5 group-hover:text-cyan-300 transition-colors">{num}.</div>
      <div className="text-slate-300 text-sm group-hover:text-white transition-colors">{text}</div>
    </div>
  );
}
