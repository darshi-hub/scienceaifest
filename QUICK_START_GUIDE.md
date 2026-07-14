# PROTEIN ANALYZER - QUICK START GUIDE

## How to Use the App

### Step 1: Access the Application
The app is a React component. To use it:

**Option A: In a React Project**
```jsx
import ProteinAnalyzer from './ProteinAnalyzer.jsx';

export default function App() {
  return <ProteinAnalyzer />;
}
```

**Option B: Standalone (with React CDN)**
```html
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
```

---

## Step 2: Load a Protein Sequence

### Method 1: Use an Example Protein
1. Click the dropdown menu under "1. Choose an example protein"
2. Select from:
   - Hemoglobin Beta (real sequence)
   - p53 Tumor Suppressor (demo)
   - CFTR (demo)
   - BRCA1 (demo)
3. The sequence automatically loads

### Method 2: Paste a Sequence
1. Click in the text area under "2. Or paste a FASTA / raw sequence"
2. Paste either:
   - **FASTA format**:
     ```
     >sp|P12345|PROTEIN_NAME
     MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFE...
     ```
   - **Raw format**:
     ```
     MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFE...
     ```

### Method 3: Upload a File
1. Click "Choose file" under "3. Or upload a .txt / .fasta file"
2. Select a file with extension:
   - `.txt`
   - `.fasta`
   - `.fa`
3. The file is automatically parsed

---

## Step 3: Run Analysis
1. Click the "Analyze Protein" button (green button)
2. Wait for the analysis to complete (2-second animation)
3. Results automatically display

---

## Understanding the Results

### Top: Protein Ribbon Visualization
Shows the proportion of:
- **Cyan**: Alpha Helix (α-helix)
- **Indigo**: Beta Sheet (β-sheet)
- **Gray**: Coil (unstructured regions)

The visualization updates based on your protein!

### Stats Cards (Top Section)
| Card | Shows |
|------|-------|
| Sequence Length | Total amino acids |
| Molecular Weight | Mass in kDa (kiloDaltons) |
| Stability Estimate | Simplified 0-100 score |
| Cellular Location | Where in cell it's found |

### Charts & Visualizations

**Amino Acid Composition**
- Donut chart showing top 6 amino acids
- Percentages on the right
- Click legend for details

**Hydrophobic vs Hydrophilic**
- Bar chart showing percentage split
- Heatmap showing each position:
  - Warm colors = hydrophobic (water-avoiding)
  - Cool colors = hydrophilic (water-loving)

**Confidence Indicator**
- Gauge showing simulated model confidence
- 0-100% scale (for educational purposes)

**Secondary Structure Distribution**
- Bar charts for Helix, Sheet, Coil
- Heatmap showing each position
- Total always adds to 100%

### Advanced Features

**Functional Domain Map**
- Shows predicted protein regions
- Color-coded by domain type
- Yellow markers show potential hotspots

**Evolutionary Conservation Track**
- Amber coloration shows conservation levels
- Lists specific hotspot positions
- (Note: simulated for educational purposes)

**Conserved Motif Detection**
- Lists functional patterns found
- Shows exact position(s) in sequence
- Types include:
  - N-glycosylation sites (sugar attachment)
  - Phosphorylation sites (enzyme targets)
  - Cell-attachment motifs (RGD)
  - ATP-binding motifs

**Disease Association**
- Shows relevant diseases for the protein
- Includes biological pathway
- Explains why mutations matter
- References to databases

---

## Interpreting Key Metrics

### Molecular Weight
- Measured in kDa (kiloDaltons)
- 1 kDa = 1,000 Daltons
- Calculated from amino acid sum + water molecule
- Typical proteins: 10-100 kDa

### Hydrophobicity
- **0%**: Completely hydrophilic (polar, water-loving)
- **50%**: Balanced
- **100%**: Completely hydrophobic (nonpolar, water-avoiding)
- **Use**: Predicts membrane association

### Secondary Structure
- **Helix**: Compact spiral structure (stable)
- **Sheet**: Extended strand structure (strong)
- **Coil**: Random/flexible structure (variable)
- **Note**: This is a HEURISTIC, not a modern prediction

### Stability Estimate
- **Low (0-30)**: May unfold easily
- **Medium (40-60)**: Reasonably stable
- **High (70-100)**: Very stable
- **Disclaimer**: This is simplified, not scientifically validated

---

## Example: Analyzing Hemoglobin Beta

### Step-by-Step

1. **Select**: Choose "Hemoglobin Beta" from dropdown
2. **Analyze**: Click "Analyze Protein"
3. **Observe**:
   - Length: 146 amino acids
   - MW: ~15.9 kDa
   - Helix: ~68% (high, consistent with known structure)
   - Location: Cytoplasmic (in red blood cells)

4. **Disease Info**:
   - Sickle Cell Disease: Single point mutation causes polymerization
   - Beta-Thalassemia: Loss-of-function mutations
   - Both affect oxygen transport

5. **Motifs**: May find phosphorylation sites or other patterns

6. **Understand**: This is a classic globular protein with mainly helical structure

---

## Tips & Tricks

### ✓ Good Practices

1. **Minimum length**: Use sequences with at least 5 amino acids
2. **Valid characters**: Stick to standard 20 amino acids (A-Z)
3. **FASTA format**: Include headers if copying from databases
4. **Multiple uploads**: Click "New analysis" to start fresh

### ✗ Don't

- Don't use this for medical diagnosis
- Don't rely on estimates without validation
- Don't use simulated values for research
- Don't trust confidence scores as prediction accuracy

### Advanced

**Custom Sequences**:
You can create your own sequences for testing:
- Hypothetical proteins
- Mutated variants
- Synthetic designs
- Teaching examples

**Pattern Search**:
The app detects 5 functional motifs:
1. N-glycosylation sites (NXS/T)
2. Casein Kinase II targets
3. Protein Kinase C targets
4. Walker A P-loop (ATP-binding)
5. RGD cell-attachment motif

---

## Common Questions

### Q: What does the ribbon visualization mean?
**A**: It shows the proportion of alpha-helix (cyan), beta-sheet (indigo), and coil (gray) structures. Each segment represents a predicted secondary structure element.

### Q: Is this prediction accurate?
**A**: This app uses Chou-Fasman, a 1978 teaching heuristic. For accurate predictions, use modern tools like PSIPRED, JPred, or machine learning models (AlphaFold, etc.).

### Q: Can I use this for research?
**A**: Not without validation. Many values are simplified for educational purposes. Real research requires peer-reviewed databases and validated algorithms.

### Q: What's the confidence score?
**A**: It's simulated for demonstration (like AlphaFold's pLDDT). It's NOT a real confidence metric.

### Q: What if my sequence has lowercase letters?
**A**: They're automatically converted to uppercase. Special characters are removed.

### Q: Can I upload my own FASTA file?
**A**: Yes! Click "Choose file" and select a .txt, .fasta, or .fa file.

### Q: What if I get an error?
**A**: Check:
- Sequence length ≥ 5 amino acids
- Only valid amino acids (A-Z)
- File is .txt or .fasta
- No blank lines in sequence

---

## Understanding Disclaimers

This app includes clear disclaimers because:

1. **Educational Only**: Not for diagnosis or treatment
2. **Simplified Methods**: Uses teaching heuristics, not validated algorithms
3. **Simulated Data**: Many estimates are for demonstration
4. **Not Medical Advice**: Don't make health decisions based on this

**Always**:
- ✓ Verify results with scientific literature
- ✓ Use validated tools for research
- ✓ Consult experts for medical applications
- ✓ Cite proper databases and methods

---

## More Information

### Scientific References
- **UniProt**: www.uniprot.org (protein database)
- **ClinVar**: www.ncbi.nlm.nih.gov/clinvar (variant database)
- **Kyte-Doolittle**: Classic hydrophobicity scale (1982)
- **Chou-Fasman**: Secondary structure propensities (1978)

### Advanced Learning
To go deeper:
1. Learn about protein structure (PDB database)
2. Study bioinformatics algorithms
3. Explore machine learning for proteins
4. Try AlphaFold for modern predictions

### For Educators
This app works great for:
- Introducing protein analysis
- Teaching about amino acid properties
- Demonstrating computational biology
- Creating interactive assignments
- Student exploration projects

---

## Support

For issues:
1. Check the error message (usually helpful)
2. Verify sequence format
3. Review the test documentation
4. Examine the source code (well-commented)

All testing documentation is included:
- TEST_SUMMARY.md
- TECHNICAL_TEST_REPORT.md
- DETAILED_TEST_CASES.md

---

**Happy analyzing! 🧬**

Remember: This is an educational tool designed to help you understand proteins. For real research and medical applications, use validated databases and peer-reviewed algorithms.
