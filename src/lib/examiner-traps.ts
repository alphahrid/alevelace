// Examiner Trap Door — hand-crafted list of the 5 most common mark-losing
// mistakes real A-Level candidates make, plus how to avoid each.
// Keyed by topic slug substring or subject slug — matched loosely at runtime.

export type Trap = { mistake: string; avoid: string };

const GENERIC: Trap[] = [
  { mistake: "Ignoring the command word — writing a 'Describe' when 'Explain' is asked.", avoid: "Underline the command word first. 'Explain' always demands a *because*/*so that* linking phrase; 'Describe' is what, not why." },
  { mistake: "Dropping units or writing them in the wrong form (m vs cm, mol vs mol dm⁻³).", avoid: "Circle every quantity in the question and write the required unit on your answer line before you compute anything." },
  { mistake: "Vague definitions — restating the term instead of defining it.", avoid: "Learn syllabus definitions verbatim. Examiners lift the mark-scheme wording directly; paraphrasing loses B1 marks." },
  { mistake: "Not showing working / skipping intermediate steps.", avoid: "Write M1 substitution, A1 answer with units. If your final answer is wrong, method marks (M1) still bank." },
  { mistake: "Running out of time on last-mark questions.", avoid: "Budget ~1 min per mark. Move on if stuck — a 6-mark question left blank loses more than a 4-mark question half-done." },
];

const BY_KEYWORD: Record<string, Trap[]> = {
  // MATHS
  math: [
    { mistake: "Cancelling terms across a fraction that aren't factors (e.g. 'cancelling' the +2 in (x²+2)/(x+2)).", avoid: "You can only cancel *factors*. Factorise fully first — if it isn't a factor, it stays." },
    { mistake: "Forgetting +C on indefinite integrals.", avoid: "Every indefinite integral answer must end in + C. This is a nailed-on B1 mark examiners always check first." },
    { mistake: "Using degrees when the question is in radians (or vice versa).", avoid: "Look for π in the domain: π/2, 2π ⇒ radians. Set your calculator mode *before* the paper begins." },
    { mistake: "Not stating the domain when defining an inverse function.", avoid: "For f⁻¹, always write 'x ∈ ℝ, x ≥ ...' — the range of f becomes the domain of f⁻¹." },
    { mistake: "Rounding too early in multi-step calculations.", avoid: "Carry ≥ 4 significant figures through every step; round *only* the final answer to 3 s.f. unless told otherwise." },
  ],
  // PHYSICS
  physics: [
    { mistake: "Confusing scalar and vector quantities (speed vs velocity, distance vs displacement).", avoid: "If direction matters (up/down, ± sign), it's a vector. State direction alongside magnitude." },
    { mistake: "Using g = 10 when the paper specifies g = 9.81 m s⁻².", avoid: "Read the front cover data sheet. Cambridge uses 9.81; Edexcel usually 9.81 too. Copy the exact value onto your working." },
    { mistake: "Mixing up ΔEp = mgh with ½mv² in energy conservation.", avoid: "Draw the energy transfer chain first (GPE → KE → heat). Assign each term to a stage — don't collapse them mentally." },
    { mistake: "Missing the '±' or negative sign in SHM/wave equations.", avoid: "Restoring force is *always* opposite displacement: F = −kx. Losing the minus sign loses A1." },
    { mistake: "Sig-fig mismatch — giving 4 s.f. when data is 2 s.f.", avoid: "Match the least precise given value. If the question gives 3.0 m and 4.5 s, quote answer to 2 s.f." },
  ],
  // CHEMISTRY
  chemistry: [
    { mistake: "Forgetting state symbols in equations (s, l, g, aq).", avoid: "Every fully-marked chemical equation must have state symbols — it's usually a separate mark from balancing." },
    { mistake: "Writing 'increases rate' without mentioning collision energy or activation energy.", avoid: "Explain rate changes via *frequency of successful collisions* — reference Ea explicitly for temperature effects." },
    { mistake: "Confusing enthalpy sign conventions (exo = negative ΔH).", avoid: "Bonds broken (in) = positive, bonds formed (out) = negative. Draw the energy profile before assigning signs." },
    { mistake: "Writing 'H+ ions' instead of specifying oxonium H₃O⁺ where the mark scheme requires it.", avoid: "In Brønsted-Lowry acid-base questions, H₃O⁺ scores; a bare H⁺ often does not for CIE." },
    { mistake: "Not identifying the *limiting reagent* before calculating yield.", avoid: "Convert both reactants to moles first, divide by stoichiometric coefficients — smallest ratio = limiting." },
  ],
  // BIOLOGY
  biology: [
    { mistake: "Describing a graph instead of *explaining* the biology behind it.", avoid: "'Rate increases then plateaus' is only 1 mark. Add: 'because enzyme active sites become saturated' for the biology mark." },
    { mistake: "Confusing 'diffusion', 'osmosis', and 'active transport' — using them interchangeably.", avoid: "Osmosis = water only, down water potential. Active = against gradient, requires ATP. Be specific — mark schemes don't accept 'moves across'." },
    { mistake: "Not linking structure to function in essays.", avoid: "For every structural feature, write '...*which allows*...'. Examiners award marks for the causal link, not the description alone." },
    { mistake: "Missing 'concentration gradient' as the driver of passive transport.", avoid: "Any diffusion answer should reference 'high to low concentration' or 'partial pressure gradient' explicitly." },
    { mistake: "Vague evolution answers — 'they evolved to survive'.", avoid: "Use the full Darwinian chain: variation → selection pressure → survival of fittest → reproduce → allele frequency changes." },
  ],
  // ECONOMICS
  economics: [
    { mistake: "Drawing diagrams without labelling axes, curves, or equilibrium points.", avoid: "Every diagram: label both axes (with units), all curves (S₁, D₁, S₂...), original and new equilibrium (P₁Q₁, P₂Q₂), and the shift arrow." },
    { mistake: "Writing evaluation as a separate paragraph at the end instead of throughout.", avoid: "Weave 'however', 'it depends on...', 'in the short run vs long run' into every analytical point for A* essays." },
    { mistake: "Confusing shift *of* a curve with movement *along* it.", avoid: "Price/quantity change = movement along. Any *other* determinant (income, tastes, costs) = shift. State which explicitly." },
    { mistake: "No real-world example or data in 'Evaluate' essays.", avoid: "Every top-band essay cites one concrete example (country, year, policy). Memorise 3–4 case studies per topic." },
    { mistake: "Ignoring the specific policy the question asks about.", avoid: "If the question says 'fiscal policy', don't drift into monetary. Re-read the question after each paragraph." },
  ],
  // HISTORY / ENGLISH
  history: [
    { mistake: "Narrative instead of argument — telling the story rather than answering the question.", avoid: "Every paragraph should start with a claim that answers 'to what extent...' or 'why...', then use events as evidence." },
    { mistake: "Missing counter-argument for the top band.", avoid: "Structure: point → evidence → counterpoint → judgement. A* answers explicitly weigh both sides." },
    { mistake: "Vague dates or wrong causal chains.", avoid: "Learn 3–4 pinpoint dates per topic and one specific figure/statistic — precision separates A* from B." },
    { mistake: "Ignoring historiography where the mark scheme rewards it.", avoid: "Reference at least one historian's interpretation ('Trevor-Roper argues... whereas...') for depth marks." },
    { mistake: "Weak conclusions that just restate.", avoid: "Conclusion should reach a *judged* answer — 'to a large extent', 'primarily because...' with the strongest reason." },
  ],
};

const SUBJECT_KEY: Array<[RegExp, string]> = [
  [/math/i, "math"],
  [/further/i, "math"],
  [/physics/i, "physics"],
  [/chem/i, "chemistry"],
  [/bio/i, "biology"],
  [/econ/i, "economics"],
  [/business/i, "economics"],
  [/history|english|literature|psych|geography|govern/i, "history"],
];

export function getExaminerTraps(subjectName?: string | null, topicName?: string | null): Trap[] {
  const hay = `${subjectName || ""} ${topicName || ""}`;
  for (const [rx, key] of SUBJECT_KEY) {
    if (rx.test(hay)) return BY_KEYWORD[key];
  }
  return GENERIC;
}
