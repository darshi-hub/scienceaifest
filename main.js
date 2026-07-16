// ============================================
// MOLECULE ARCHITECT AI - MAIN SCRIPT
// ============================================

// Configuration
// API key can be:
// 1. Added via "API Settings" button in the UI
// 2. Retrieved from localStorage (stored in browser only)
// 3. Left empty to use mock data (works great for demos!)
//
// Get free API key: https://aistudio.google.com/app/apikeys

function getGeminiApiKey() {
    // Try to get from localStorage first (user-entered via UI)
    const storedKey = localStorage.getItem('gemini_api_key');
    return storedKey || ""; // Default to empty (uses mock data)
}

function setGeminiApiKey(key) {
    if (key && key.trim()) {
        localStorage.setItem('gemini_api_key', key.trim());
        alert('API Key saved to your browser!\nIt will be used for molecule generation.');
    } else {
        localStorage.removeItem('gemini_api_key');
        alert('API Key removed. Using mock data.');
    }
}

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// State Management
let currentMolecule = null;
let generatedMolecules = [];
let radarChart = null;

// ============================================
// PARTICLE ANIMATION
// ============================================

class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: 0, y: 0 };

        this.resize();
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        this.createParticles();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2,
                color: Math.random() > 0.5 ? '#00d4ff' : '#ff00ff'
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 1;

        // Update and draw particles
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off edges
            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

            // Draw particle
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.opacity;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw lines to nearby particles
            this.particles.forEach(p2 => {
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 100) {
                    this.ctx.globalAlpha = (1 - dist / 100) * 0.3;
                    this.ctx.strokeStyle = p.color;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            });
        });

        // Draw cursor effect
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, 50, 0, Math.PI * 2);
        this.ctx.stroke();

        requestAnimationFrame(() => this.animate());
    }
}

// ============================================
// SLIDER INTERACTIONS
// ============================================

function initializeSliders() {
    const sliders = document.querySelectorAll('.slider');
    
    sliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            const display = e.target.parentElement.querySelector('.slider-value');
            if (display) display.textContent = value + '%';
        });
    });
}

// ============================================
// MOLECULE GENERATION
// ============================================

async function generateMolecules() {
    const thinkingContainer = document.getElementById('thinkingContainer');
    const resultsContainer = document.getElementById('resultsContainer');
    const emptyState = document.getElementById('emptyState');
    const cardContainer = document.getElementById('moleculeCardsContainer');

    // Show thinking animation
    thinkingContainer.style.display = 'block';
    resultsContainer.style.display = 'none';
    emptyState.style.display = 'none';

    // Get slider values
    const strength = parseInt(document.getElementById('strength').value);
    const flexibility = parseInt(document.getElementById('flexibility').value);
    const biodegradability = parseInt(document.getElementById('biodegradability').value);
    const waterproof = parseInt(document.getElementById('waterproof').value);
    const cost = parseInt(document.getElementById('cost').value);
    const heat = parseInt(document.getElementById('heat').value);

    // Get editable prompt
    let customPrompt = document.getElementById('customPrompt')?.value || '';
    
    // Build default prompt if not customized
    const defaultPrompt = `You are a molecular chemist AI. Generate 3 hypothetical biodegradable food packaging materials with the following constraints:
- Strength: ${strength}%
- Flexibility: ${flexibility}%
- Biodegradability: ${biodegradability}%
- Waterproof: ${waterproof}%
- Cost Efficiency: ${cost}%
- Heat Resistance: ${heat}%

For each molecule, provide a JSON object with:
{
  "name": "Material name",
  "formula": "Chemical formula",
  "smiles": "SMILES string if possible",
  "functionalGroups": ["group1", "group2"],
  "description": "Scientific description",
  "applications": ["app1", "app2"],
  "advantages": ["adv1", "adv2"],
  "limitations": ["lim1", "lim2"],
  "plausibilityScore": 0-100,
  "ecoScore": 0-100,
  "predictedProperties": {
    "strength": 0-100,
    "flexibility": 0-100,
    "biodegradability": 0-100,
    "waterproof": 0-100,
    "costEfficiency": 0-100,
    "heatResistance": 0-100
  }
}

Return ONLY a JSON array with 3 objects, no other text. Example format:
[{...}, {...}, {...}]`;

    const prompt = customPrompt || defaultPrompt;
    
    // Get API key from localStorage (or empty string)
    const GEMINI_API_KEY = getGeminiApiKey();

    try {
        if (!GEMINI_API_KEY) {
            // Use mock data for demo
            await new Promise(resolve => setTimeout(resolve, 3000));
            displayMockMolecules(strength, flexibility, biodegradability, waterproof, cost, heat);
        } else {
            // Call Gemini API
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) throw new Error('API call failed');

            const data = await response.json();
            const content = data.candidates[0].content.parts[0].text;
            // Extract JSON from response (sometimes wrapped in code blocks)
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                generatedMolecules = JSON.parse(jsonMatch[0]);
            } else {
                generatedMolecules = JSON.parse(content);
            }
            displayMolecules(generatedMolecules);
        }

        // Hide thinking, show results
        setTimeout(() => {
            thinkingContainer.style.display = 'none';
            resultsContainer.style.display = 'block';
        }, 3000);

    } catch (error) {
        console.error('Generation error:', error);
        thinkingContainer.style.display = 'none';
        resultsContainer.innerHTML = '<p style="color: #ff6b6b;">Error generating molecules: ' + error.message + '</p>';
        resultsContainer.style.display = 'block';
    }
}

function displayMockMolecules(strength, flexibility, biodegradability, waterproof, cost, heat) {
    // Generate varied molecules based on slider values
    
    // Molecule 1: Strength-focused
    const molecule1 = {
        name: "StrongBio-" + Math.random().toString(36).substr(2, 5).toUpperCase(),
        formula: "C" + (5 + Math.floor(strength/25)) + "H" + (10 + Math.floor(strength/20)) + "O" + (3 + Math.floor(biodegradability/30)),
        smiles: "CC(=O)OC(CC(=O)O)C(=O)O",
        functionalGroups: ["Ester", "Carboxyl", "Hydroxyl", "Alkene"],
        description: `A polylactic acid derivative optimized for strength (${strength}%). The ester bonds provide biodegradability while the strengthened carbon backbone provides structural integrity. Designed with ${biodegradability}% biodegradation priority.`,
        applications: ["Heavy-duty packaging", "Protective wrapping", "Structural films"],
        advantages: [
            `High strength rating (${strength}%)`,
            `Good biodegradability (${biodegradability}%)`,
            `Cost-efficient production (${cost}%)`
        ],
        limitations: [
            "May require post-processing",
            `Heat resistance limited to ${heat}°C`,
            "Batch variability concerns"
        ],
        plausibilityScore: 75 + Math.floor(Math.random() * 20),
        ecoScore: Math.floor(biodegradability * 0.9 + 10),
        predictedProperties: {
            strength: strength,
            flexibility: Math.max(20, flexibility - 15),
            biodegradability: biodegradability,
            waterproof: waterproof,
            costEfficiency: cost,
            heatResistance: heat
        }
    };

    // Molecule 2: Flexibility-focused
    const molecule2 = {
        name: "FlexiBio-" + Math.random().toString(36).substr(2, 5).toUpperCase(),
        formula: "C" + (6 + Math.floor(flexibility/25)) + "H" + (12 + Math.floor(flexibility/20)) + "O" + (4 + Math.floor(biodegradability/25)),
        smiles: "CC(C)CCCC(C)(C)C(=O)OCC(CO)O",
        functionalGroups: ["Ether", "Ester", "Alcohol", "Ether linkage"],
        description: `A chitosan-cellulose hybrid optimized for flexibility (${flexibility}%). Oxygen-containing groups enhance environmental degradation while flexible linkages allow bending. Maintains ${biodegradability}% biodegradability.`,
        applications: ["Flexible wrapping", "Food pouches", "Bend-resistant films"],
        advantages: [
            `Excellent flexibility (${flexibility}%)`,
            `High eco score for ${biodegradability}% biodegradability`,
            "Natural polymer base"
        ],
        limitations: [
            `Strength compromised (${Math.max(30, strength - 20)}%)`,
            "Requires specialized handling",
            `Temperature limit: ${heat}°C`
        ],
        plausibilityScore: 72 + Math.floor(Math.random() * 22),
        ecoScore: 85 + Math.floor(Math.random() * 15),
        predictedProperties: {
            strength: Math.max(30, strength - 20),
            flexibility: flexibility,
            biodegradability: biodegradability + 5,
            waterproof: Math.max(50, waterproof - 10),
            costEfficiency: Math.max(40, cost - 15),
            heatResistance: Math.max(30, heat - 15)
        }
    };

    // Molecule 3: Balanced/Optimal
    const molecule3 = {
        name: "BalancePro-" + Math.random().toString(36).substr(2, 5).toUpperCase(),
        formula: "C" + (7 + Math.floor((strength + flexibility)/50)) + "H" + (14 + Math.floor((strength + flexibility)/50)) + "O" + (5 + Math.floor(biodegradability/20)),
        smiles: "CC(C)(C)C(=O)OCC(O)CO",
        functionalGroups: ["Ketone", "Hydroxyl", "Ester", "Alkane"],
        description: `A polyhydroxyalkanoate (PHA) derivative engineered for balance. Optimized across all metrics: Strength (${strength}%), Flexibility (${flexibility}%), Biodegradability (${biodegradability}%), Waterproof (${waterproof}%), Cost (${cost}%), Heat (${heat}%).`,
        applications: ["General packaging", "Multi-use films", "Everyday containers"],
        advantages: [
            `Balanced performance across all metrics`,
            `${biodegradability}% biodegradable in soil`,
            "Cost-effective manufacturing"
        ],
        limitations: [
            "May not excel in any single property",
            "Requires standard composting",
            "Moderate production complexity"
        ],
        plausibilityScore: 80 + Math.floor(Math.random() * 18),
        ecoScore: 80 + Math.floor(Math.random() * 18),
        predictedProperties: {
            strength: Math.round(strength * 0.95),
            flexibility: Math.round(flexibility * 0.95),
            biodegradability: Math.round(biodegradability * 0.95),
            waterproof: Math.round(waterproof * 0.95),
            costEfficiency: Math.round(cost * 0.95),
            heatResistance: Math.round(heat * 0.95)
        }
    };

    generatedMolecules = [molecule1, molecule2, molecule3];
    displayMolecules(generatedMolecules);
}

function displayMolecules(molecules) {
    const cardContainer = document.getElementById('moleculeCardsContainer');
    cardContainer.innerHTML = '';

    molecules.forEach((molecule, index) => {
        const card = document.createElement('div');
        card.className = 'molecule-card';
        card.style.animationDelay = `${index * 0.1}s`;
        card.innerHTML = `
            <h4>${molecule.name}</h4>
            <div class="molecule-card-row">
                <span class="card-label">Formula</span>
                <span class="card-value">${molecule.formula}</span>
            </div>
            <div class="molecule-card-row">
                <span class="card-label">Plausibility</span>
                <span class="card-value">${molecule.plausibilityScore}%</span>
            </div>
            <div class="molecule-card-row">
                <span class="card-label">Eco Score</span>
                <span class="card-value">${molecule.ecoScore}%</span>
            </div>
            <div class="molecule-card-row">
                <span class="card-label">Applications</span>
                <span class="card-value">${molecule.applications.length}</span>
            </div>
        `;
        
        card.addEventListener('click', () => selectMolecule(molecule));
        cardContainer.appendChild(card);
    });

    // Select first molecule by default
    if (molecules.length > 0) {
        selectMolecule(molecules[0]);
    }
}

function selectMolecule(molecule) {
    currentMolecule = molecule;

    // Update reasoning panel
    const reasoningText = document.getElementById('reasoningText');
    reasoningText.innerHTML = `
        <p><strong>Design Strategy:</strong></p>
        <p>${molecule.description}</p>
        <p style="margin-top: 1rem;"><strong>Functional Groups:</strong> ${molecule.functionalGroups.join(', ')}</p>
        <p style="margin-top: 1rem;"><strong>Advantages:</strong></p>
        <ul style="margin-left: 1.5rem; color: var(--text-secondary);">
            ${molecule.advantages.map(a => `<li>${a}</li>`).join('')}
        </ul>
        <p style="margin-top: 1rem;"><strong>Limitations:</strong></p>
        <ul style="margin-left: 1.5rem; color: var(--text-secondary);">
            ${molecule.limitations.map(l => `<li>${l}</li>`).join('')}
        </ul>
    `;

    // Visualize molecule
    visualizeMolecule(molecule);

    // Update radar chart
    updateRadarChart(molecule);

    // Scroll to results
    const resultsSection = document.getElementById('results');
    resultsSection.style.display = 'block';
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// ============================================
// 3D MOLECULAR VISUALIZATION
// ============================================

function visualizeMolecule(molecule) {
    const container = document.getElementById('viewerContainer');
    container.innerHTML = '';
    
    // Generate animated SVG molecular structure
    displayMoleculeArt(container, molecule);
}

function displayMoleculeArt(container, molecule) {
    // Create an animated SVG representation based on molecule properties
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 400 400");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("style", "filter: drop-shadow(0 0 15px rgba(0, 212, 255, 0.4))");

    // Define gradients
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    gradient.setAttribute("id", "molGradient");
    gradient.setAttribute("x1", "0%");
    gradient.setAttribute("y1", "0%");
    gradient.setAttribute("x2", "100%");
    gradient.setAttribute("y2", "100%");
    
    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("style", "stop-color:#00d4ff;stop-opacity:1");
    
    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("style", "stop-color:#ff00ff;stop-opacity:1");
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Generate varied atom positions based on molecule properties
    const atomCount = Math.min(6, Math.floor(molecule.formula.length / 2));
    const atoms = [];
    
    for (let i = 0; i < atomCount; i++) {
        const angle = (i / atomCount) * Math.PI * 2;
        const radius = 100 + (i % 2) * 40;
        atoms.push({
            x: 200 + Math.cos(angle) * radius,
            y: 200 + Math.sin(angle) * radius,
            size: 18 - (i % 3) * 4,
            color: i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#ff00ff' : '#00ffff',
            label: ['C', 'O', 'H', 'N', 'S', 'P'][i]
        });
    }

    // Draw bonds
    for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
            if (Math.random() > 0.4) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", atoms[i].x);
                line.setAttribute("y1", atoms[i].y);
                line.setAttribute("x2", atoms[j].x);
                line.setAttribute("y2", atoms[j].y);
                line.setAttribute("stroke", "url(#molGradient)");
                line.setAttribute("stroke-width", "2");
                line.setAttribute("opacity", "0.6");
                line.style.animation = `pulse 2s ease-in-out infinite`;
                line.style.animationDelay = `${Math.random() * 1}s`;
                svg.appendChild(line);
            }
        }
    }

    // Draw atoms
    atoms.forEach((atom, i) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", atom.x);
        circle.setAttribute("cy", atom.y);
        circle.setAttribute("r", atom.size);
        circle.setAttribute("fill", atom.color);
        circle.setAttribute("opacity", "0.9");
        circle.style.filter = `drop-shadow(0 0 ${atom.size + 5}px ${atom.color})`;
        circle.style.animation = `float 3s ease-in-out infinite`;
        circle.style.animationDelay = `${i * 0.3}s`;
        svg.appendChild(circle);

        // Add atomic symbol text
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", atom.x);
        text.setAttribute("y", atom.y + 6);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "#fff");
        text.setAttribute("font-weight", "bold");
        text.setAttribute("font-size", "14");
        text.setAttribute("pointer-events", "none");
        text.textContent = atom.label;
        svg.appendChild(text);
    });

    // Add formula label
    const formula = document.createElementNS("http://www.w3.org/2000/svg", "text");
    formula.setAttribute("x", "200");
    formula.setAttribute("y", "40");
    formula.setAttribute("text-anchor", "middle");
    formula.setAttribute("fill", "#00d4ff");
    formula.setAttribute("font-weight", "bold");
    formula.setAttribute("font-size", "16");
    formula.textContent = molecule.formula;
    svg.appendChild(formula);

    // Add styles for animations
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
        }
        @keyframes pulse {
            0%, 100% { stroke-width: 2; opacity: 0.6; }
            50% { stroke-width: 3; opacity: 1; }
        }
    `;
    svg.appendChild(style);

    container.appendChild(svg);

    // Add interaction hint
    const hint = document.createElement('div');
    hint.style.cssText = 'position: absolute; bottom: 10px; left: 10px; font-size: 0.8rem; color: #00d4ff; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 5px; z-index: 10;';
    hint.innerHTML = '🔬 Animated molecular structure';
    container.style.position = 'relative';
    container.appendChild(hint);
}

// ============================================
// RADAR CHART
// ============================================

function updateRadarChart(molecule) {
    const ctx = document.getElementById('radarChart');
    
    if (radarChart) {
        radarChart.destroy();
    }

    const props = molecule.predictedProperties;
    
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Strength', 'Flexibility', 'Biodegradability', 'Waterproof', 'Cost Efficiency', 'Heat Resistance'],
            datasets: [{
                label: molecule.name,
                data: [
                    props.strength,
                    props.flexibility,
                    props.biodegradability,
                    props.waterproof,
                    props.costEfficiency,
                    props.heatResistance
                ],
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                pointBackgroundColor: '#ff00ff',
                pointBorderColor: '#00d4ff',
                pointHoverBackgroundColor: '#00d4ff',
                borderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#a8b5d1'
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 212, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a8b5d1'
                    }
                }
            }
        }
    });

    // Update stats
    const statsContainer = document.getElementById('comparisonStats');
    statsContainer.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Plausibility</span>
            <span class="stat-value">${molecule.plausibilityScore}%</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Eco Score</span>
            <span class="stat-value">${molecule.ecoScore}%</span>
        </div>
    `;
}

// ============================================
// NAVIGATION
// ============================================

function smoothScroll(targetId) {
    const element = document.getElementById(targetId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Update active nav link on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
        
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            if (navLink) navLink.classList.add('active');
        }
    });
});

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize particle animation
    const canvas = document.getElementById('particleCanvas');
    if (canvas) {
        new ParticleSystem(canvas);
    }

    // Initialize sliders
    initializeSliders();

    // Mobile menu toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
        });

        // Close menu when link clicked
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.style.display = 'none';
            });
        });
    }

    // Smooth scroll for all internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Console typing effect for results
    const consoleLines = document.querySelectorAll('.console-line');
    consoleLines.forEach((line, index) => {
        const delay = line.dataset.delay * 300; // 300ms between lines
        setTimeout(() => {
            line.style.opacity = '1';
        }, delay);
    });
});

// Handle page visibility (pause/resume animations)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.querySelectorAll('*[style*="animation"]').forEach(el => {
            el.style.animationPlayState = 'paused';
        });
    } else {
        document.querySelectorAll('*[style*="animation"]').forEach(el => {
            el.style.animationPlayState = 'running';
        });
    }
});

// ============================================
// API KEY SETTINGS MODAL
// ============================================

function showApiSettings() {
    document.getElementById('apiModal').style.display = 'block';
    
    // Load saved API key into input
    const savedKey = localStorage.getItem('gemini_api_key');
    const input = document.getElementById('apiKeyInput');
    if (input && savedKey) {
        input.value = savedKey;
    }
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('apiModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
}

function closeApiSettings() {
    document.getElementById('apiModal').style.display = 'none';
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value;
    setGeminiApiKey(apiKey);
    closeApiSettings();
}

function clearApiKey() {
    if (confirm('Are you sure you want to clear your API key?')) {
        document.getElementById('apiKeyInput').value = '';
        setGeminiApiKey('');
    }
}

// Close modal when pressing Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.getElementById('apiModal').style.display = 'none';
    }
});

// Add subtle sound effects (optional)
function playSound(type) {
    // Create sound effects using Web Audio API if needed
    // This is optional and can enhance UX
    if (navigator.vibrate) {
        switch(type) {
            case 'click':
                navigator.vibrate(10);
                break;
            case 'success':
                navigator.vibrate([10, 20, 10]);
                break;
        }
    }
}
