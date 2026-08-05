import type { Board } from "./board";

export type Formula = { name: string; latex: string; note?: string };
export type FormulaGroup = { subject: string; sets: Array<{ title: string; boards?: Board[]; formulas: Formula[] }> };

export const FORMULA_SHEETS: FormulaGroup[] = [
  {
    subject: "Mathematics",
    sets: [
      {
        title: "Pure — algebra & calculus",
        formulas: [
          { name: "Quadratic formula", latex: "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}" },
          { name: "Binomial expansion", latex: "(1+x)^n=1+nx+\\frac{n(n-1)}{2!}x^2+\\dots,\\ |x|<1" },
          { name: "Product rule", latex: "\\frac{d}{dx}(uv)=u\\frac{dv}{dx}+v\\frac{du}{dx}" },
          { name: "Quotient rule", latex: "\\frac{d}{dx}\\left(\\frac{u}{v}\\right)=\\frac{v u' - u v'}{v^2}" },
          { name: "Integration by parts", latex: "\\int u\\frac{dv}{dx}\\,dx=uv-\\int v\\frac{du}{dx}\\,dx" },
          { name: "Trapezium rule", latex: "\\int_a^b y\\,dx\\approx\\tfrac{1}{2}h\\left[(y_0+y_n)+2(y_1+\\dots+y_{n-1})\\right]" },
        ],
      },
      {
        title: "Trigonometry",
        formulas: [
          { name: "Pythagorean identity", latex: "\\sin^2\\theta+\\cos^2\\theta=1" },
          { name: "Double angle", latex: "\\sin 2\\theta=2\\sin\\theta\\cos\\theta,\\quad \\cos 2\\theta=1-2\\sin^2\\theta" },
          { name: "Sine rule", latex: "\\frac{a}{\\sin A}=\\frac{b}{\\sin B}=\\frac{c}{\\sin C}" },
          { name: "Cosine rule", latex: "a^2=b^2+c^2-2bc\\cos A" },
        ],
      },
      {
        title: "Statistics",
        boards: ["cambridge", "edexcel"],
        formulas: [
          { name: "Binomial distribution", latex: "P(X=r)=\\binom{n}{r}p^r(1-p)^{n-r}" },
          { name: "Normal standardisation", latex: "Z=\\frac{X-\\mu}{\\sigma}" },
          { name: "Variance", latex: "\\operatorname{Var}(X)=E(X^2)-[E(X)]^2" },
        ],
      },
    ],
  },
  {
    subject: "Further Mathematics",
    sets: [
      {
        title: "Complex numbers & matrices",
        formulas: [
          { name: "Euler / de Moivre", latex: "(\\cos\\theta+i\\sin\\theta)^n=\\cos n\\theta+i\\sin n\\theta" },
          { name: "Modulus–argument", latex: "z=r(\\cos\\theta+i\\sin\\theta)=re^{i\\theta}" },
          { name: "2×2 inverse", latex: "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}^{-1}=\\frac{1}{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}" },
          { name: "Maclaurin series", latex: "f(x)=f(0)+f'(0)x+\\frac{f''(0)}{2!}x^2+\\dots" },
        ],
      },
    ],
  },
  {
    subject: "Physics",
    sets: [
      {
        title: "Mechanics",
        formulas: [
          { name: "SUVAT", latex: "v=u+at,\\quad s=ut+\\tfrac{1}{2}at^2,\\quad v^2=u^2+2as" },
          { name: "Newton's second law", latex: "F=\\frac{\\Delta p}{\\Delta t}=ma" },
          { name: "Work, energy, power", latex: "W=Fs\\cos\\theta,\\quad P=Fv" },
          { name: "Centripetal", latex: "a=\\frac{v^2}{r}=\\omega^2 r" },
        ],
      },
      {
        title: "Fields & circular motion",
        formulas: [
          { name: "Gravitational field", latex: "g=\\frac{GM}{r^2},\\quad E_p=-\\frac{GMm}{r}" },
          { name: "Coulomb's law", latex: "F=\\frac{Q_1Q_2}{4\\pi\\varepsilon_0 r^2}" },
          { name: "Capacitance", latex: "C=\\frac{Q}{V},\\quad E=\\tfrac{1}{2}CV^2" },
        ],
      },
      {
        title: "Waves & quantum",
        formulas: [
          { name: "Wave equation", latex: "v=f\\lambda" },
          { name: "Double slit", latex: "\\lambda=\\frac{ax}{D}" },
          { name: "Photon energy", latex: "E=hf=\\frac{hc}{\\lambda}" },
          { name: "de Broglie", latex: "\\lambda=\\frac{h}{p}" },
        ],
      },
      {
        title: "Uncertainties (practical papers)",
        formulas: [
          { name: "Percentage uncertainty", latex: "\\%\\,\\text{unc}=\\frac{\\Delta x}{x}\\times 100\\%" },
          { name: "Propagation (product)", latex: "\\frac{\\Delta z}{z}=\\frac{\\Delta a}{a}+\\frac{\\Delta b}{b}" },
        ],
      },
    ],
  },
  {
    subject: "Chemistry",
    sets: [
      {
        title: "Physical chemistry",
        formulas: [
          { name: "Moles", latex: "n=\\frac{m}{M_r},\\quad n=cV" },
          { name: "Ideal gas", latex: "pV=nRT" },
          { name: "Enthalpy change", latex: "q=mc\\Delta T,\\quad \\Delta H=-\\frac{q}{n}" },
          { name: "Gibbs free energy", latex: "\\Delta G=\\Delta H-T\\Delta S" },
        ],
      },
      {
        title: "Equilibria & kinetics",
        formulas: [
          { name: "Kc", latex: "K_c=\\frac{[\\mathrm{C}]^c[\\mathrm{D}]^d}{[\\mathrm{A}]^a[\\mathrm{B}]^b}" },
          { name: "pH", latex: "\\mathrm{pH}=-\\log_{10}[\\mathrm{H^+}]" },
          { name: "Ka / weak acid", latex: "K_a=\\frac{[\\mathrm{H^+}]^2}{[\\mathrm{HA}]}" },
          { name: "Arrhenius", latex: "k=Ae^{-E_a/RT}" },
        ],
      },
    ],
  },
  {
    subject: "Biology",
    sets: [
      {
        title: "Quantitative biology",
        formulas: [
          { name: "Magnification", latex: "M=\\frac{\\text{image size}}{\\text{actual size}}" },
          { name: "Cardiac output", latex: "\\text{CO}=\\text{stroke volume}\\times\\text{heart rate}" },
          { name: "Simpson's index", latex: "D=1-\\sum\\left(\\frac{n}{N}\\right)^2" },
          { name: "Hardy–Weinberg", latex: "p^2+2pq+q^2=1,\\quad p+q=1" },
        ],
      },
    ],
  },
  {
    subject: "Computer Science",
    sets: [
      {
        title: "Data representation",
        formulas: [
          { name: "Binary place value", latex: "n=\\sum_{i=0}^{k} b_i 2^{i}" },
          { name: "Two's complement range", latex: "-2^{n-1}\\le x\\le 2^{n-1}-1" },
          { name: "File size (bitmap)", latex: "\\text{size}=\\text{width}\\times\\text{height}\\times\\text{colour depth}" },
          { name: "Sound file size", latex: "\\text{size}=\\text{sample rate}\\times\\text{bit depth}\\times\\text{duration}" },
        ],
      },
      {
        title: "Algorithm efficiency",
        formulas: [
          { name: "Linear search", latex: "O(n)" },
          { name: "Binary search", latex: "O(\\log_2 n)" },
          { name: "Bubble sort", latex: "O(n^2)" },
        ],
      },
    ],
  },
  {
    subject: "Business",
    sets: [
      {
        title: "Finance & ratios",
        formulas: [
          { name: "Break-even output", latex: "\\text{BEQ}=\\frac{\\text{fixed costs}}{\\text{contribution per unit}}" },
          { name: "Gross profit margin", latex: "\\frac{\\text{gross profit}}{\\text{revenue}}\\times100\\%" },
          { name: "Current ratio", latex: "\\frac{\\text{current assets}}{\\text{current liabilities}}" },
          { name: "ARR", latex: "\\frac{\\text{average annual profit}}{\\text{initial investment}}\\times100\\%" },
        ],
      },
    ],
  },
];

export function sheetsForBoard(board: Board): FormulaGroup[] {
  return FORMULA_SHEETS.map((g) => ({
    ...g,
    sets: g.sets.filter((s) => !s.boards || s.boards.includes(board)),
  })).filter((g) => g.sets.length > 0);
}
