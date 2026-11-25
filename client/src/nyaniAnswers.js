const biologyGrowth = `Q12 — E: outer-to-inner GI layers are serosa, muscularis, submucosa, mucosa.
Q13 — C: pepsin is secreted by the stomach.
Q14 — B.
Q15 — D: implantation occurs in the uterus.
Q16 — B: neurulation is last among the listed developmental events.
Q17 — A: absolute growth is increase in a feature per unit time.`;

const languageBasics = `Q1 — A: clarity and durability.
Q2 — A: “Yours faithfully” closes a letter beginning “Dear Sir”.
Q3 — C: technical jargon is not a formal-letter feature.`;

const languageNotice = `Q4 — D.
Q5 — B: complimentary close, signature, name, position.
Q6 — Unclear in the scan.
Q7 — C: “From” and “Date” are usually auto-filled.
Q8 — D.`;

const languageResearch = `Q9 — D.
Q10 — D.
Q11 — Unclear in the scan.
Q12 — D.
Q13 — B: a problem statement identifies the problem to investigate.
Q14 — D: a memo can include details.`;

const listening = `Q1: listening includes predicting, receiving, attending, assigning meaning, and remembering.
Q2: Unclear in the scan.
Q3: positive language supports a constructive learning environment.
Remaining questions: Unclear in the scan.`;

const languageShortAnswers = `Q1: communication is a process involving a message, context, and feedback.
Remaining questions: Unclear in the scan.`;

const waveAndOptics = `Q16 — D: path difference λ gives a bright fringe.
Q17 — A: a crest meeting a trough gives a dark fringe.
Q18 — E: coherent waves maintain a constant phase relationship.
Q19 — A: beyond 2F gives a real, inverted, diminished image.
Q20 — D: a diverging lens gives a virtual, upright, diminished image.`;

const soundAndWaves = `Q21 — D: sound diffracts more because its wavelength is longer.
Q22 — D: loudness depends on amplitude.
Q23 — B: doubling intensity adds about 3 dB.
Q24 — B: equal source and observer speeds give no Doppler shift.
Q25 — D: intensity varies as 1/r².`;

const medicalPhysics = `Q18 — D.
Q19 — Unclear in the scan.
Q20 — B: ultrasound is poor for imaging bone or air-filled organs.
Q21 — A: a laser beam is coherent.`;

export const NYANI_IMAGE_ANSWERS = {
  '/nyani/Biology/ENDSEM/img-20190504-195117.jpg': biologyGrowth,
  '/nyani/Biology/ENDSEM/img-20190504-195143.jpg': `Q18 — E.
Q19 — D: calcium influx helps complete meiosis II after fertilization.
Q20 — A: hCG maintains the corpus luteum.
Q21 — D: the LH surge triggers ovulation.
Q22 — E: Leydig cells produce testosterone.
Q23 — D: acrosomal enzymes help sperm penetrate the ovum.`,
  '/nyani/Biology/ENDSEM/img-20190504-195224.jpg': 'The scan is too low-contrast and partial to read reliably.',
  '/nyani/Biology/ENDSEM/img-20190504-195246.jpg': 'Q35 — B: the conventional answer is about 8 weeks for the embryo-to-fetus transition.',
  '/nyani/Biology/ENDSEM/img-20190504-195309.jpg': `Short-answer key points:
Q1: growth involves measurable change and differentiation, influenced by genes, hormones, and nutrition.
Q2: atherosclerosis is plaque buildup in arteries; ageing involves gradual loss of elasticity and function.
Q3: capacitation prepares sperm to fertilize; the acrosome reaction helps penetrate the zona pellucida; the cortical reaction helps prevent polyspermy.
Q4: the sperm tail contains an axoneme.`,
  '/nyani/Biology/ENDSEM/img-20201125-wa0049.jpg': `Q1 — A.
Q2 — C: plasma proteins do not normally pass into glomerular filtrate.
Q3 — E.
Q4 — B: Sertoli-cell inhibin suppresses FSH.
Q5 — D: the fetal stage occupies the final seven months of pregnancy.`,
  '/nyani/Biology/ENDSEM/img-20201125-wa0075.jpg': 'Duplicate of the short-answer page; see its answer key on the similar Biology image.',
  '/nyani/Biology/ENDSEM/img-20201125-wa0084.jpg': `Q1a: the juxtaglomerular apparatus contains macula densa and granular cells.
Q1b: the descending limb reabsorbs water; the ascending limb reabsorbs salts and is impermeable to water.
Q1c: reabsorption examples: glucose, sodium, water; secretion examples: H+, K+, creatinine.
Q2a: sexual reproduction combines genetic material; asexual reproduction generally produces genetically identical offspring.
Q2b–c: plants/algae show alternation of generations; variation arises from independent assortment, crossing over, and random fertilization.
Q3a: ovulation releases a secondary oocyte.
Q3b: Sertoli cells support spermatogenesis, form the blood-testis barrier, and secrete inhibin.
Q3c: follicular, ovulatory, and luteal phases.
Q4a–c: pre-embryonic, embryonic, and fetal stages; embryonic development forms tissues/organs, fetal development grows and matures; parturition proceeds through dilation, expulsion, and afterbirth.
Q5a–b: vitamins include K, biotin, and folate; they support clotting, metabolism, and DNA synthesis respectively.
Q5c: lipase breaks down fats.`,
  '/nyani/Biology/ENDSEM/img-20201125-wa0097.jpg': 'The scan is not legible enough to assign answers reliably.',
  '/nyani/Biology/ENDSEM/img-20201125-wa0100.jpg': 'Duplicate of the short-answer page; see its answer key on the similar Biology image.',

  '/nyani/Language/ENDSEM/01.jpg': languageBasics,
  '/nyani/Language/ENDSEM/02.jpg': languageNotice,
  '/nyani/Language/ENDSEM/03.jpg': languageResearch,
  '/nyani/Language/ENDSEM/3.jpg': languageNotice,
  '/nyani/Language/ENDSEM/4.jpg': languageBasics,
  '/nyani/Language/ENDSEM/04.jpg': languageNotice,
  '/nyani/Language/ENDSEM/5.jpg': languageBasics,
  '/nyani/Language/ENDSEM/6.jpg': languageNotice,
  '/nyani/Language/ENDSEM/06.jpg': languageNotice,
  '/nyani/Language/ENDSEM/7.jpg': languageResearch,
  '/nyani/Language/ENDSEM/07.jpg': languageResearch,
  '/nyani/Language/ENDSEM/8.jpg': listening,
  '/nyani/Language/ENDSEM/9.jpg': `The short-answer scan is too unclear to provide a reliable key.`,
  '/nyani/Language/ENDSEM/98.jpg': listening,
  '/nyani/Language/ENDSEM/987.jpg': `Q4: memory types are sensory, short-term, and long-term.
Remaining questions: Unclear in the scan.`,
  '/nyani/Language/ENDSEM/img-20201125-wa0027.jpg': `Q15 — D.
Q16 — D: memo headings are Subject, From, To, Date.
Q17 — D: full-block layout.
Q18 — D.
Q19 — E: a CV includes a personal profile statement.
Q20 — E: academic writing uses hedging, objectivity, and formality.`,
  '/nyani/Language/ENDSEM/img-20201125-wa0051.jpg': languageBasics,
  '/nyani/Language/ENDSEM/img-20201125-wa0071.jpg': languageResearch,
  '/nyani/Language/ENDSEM/img-20201125-wa0074.jpg': languageNotice,
  '/nyani/Language/MIDSEM/021.jpg': 'The scan is too compressed to read the options reliably.',
  '/nyani/Language/MIDSEM/022.jpg': `Q4 — A: the 7 Cs are completeness, conciseness, consideration, courtesy, correctness, clarity, and concreteness.
Other questions: Unclear in the scan.`,
  '/nyani/Language/MIDSEM/023.jpg': 'The questions and options are too unclear to answer reliably.',
  '/nyani/Language/MIDSEM/024.jpg': 'The questions and options are too unclear to answer reliably.',
  '/nyani/Language/MIDSEM/025.jpg': 'The questions and options are too unclear to answer reliably.',
  '/nyani/Language/MIDSEM/026.jpg': 'The questions and options are too unclear to answer reliably.',
  '/nyani/Language/MIDSEM/capture.jpg': languageShortAnswers,

  '/nyani/Physics/MIDSEM/img-20190713-wa0009.jpg': `Q11 — B: kinetic energy is zero at turning points.
Q12 — C: diffraction.
Q13 — A: doubling a pendulum’s period requires four times the length.
Q14 — C: more grating lines increase diffraction spread.
Q15 — C: electromagnetic waves have the same speed in vacuum.`,
  '/nyani/Physics/MIDSEM/img-20190713-wa0011.jpg': waveAndOptics,
  '/nyani/Physics/MIDSEM/img-20190713-wa0016.jpg': soundAndWaves,
  '/nyani/Physics/MIDSEM/img-20190713-wa0017.jpg': `Q5 — B: the ear is less sensitive in the mid-frequency range.
Q6 — A: doubling a pendulum period requires four times the length.
Q7 — E: transverse vibration is perpendicular to propagation.
Q8 — E: wave speed depends on the medium.
Q9 — D: greater grating spacing reduces spread.
Q10 — C: sound has longer wavelengths and diffracts more.`,
  '/nyani/Chemistry/MIDSEM/img-20190717-wa0018.jpg': `Q10 — C: a galvanic cell produces current through a spontaneous chemical reaction.
Q11 — A: the scan marks this as the false statement about a galvanic cell.
Q12 — C: phosphorus is +5 in H3PO4.
Q13 — C: the standard hydrogen electrode is a reference electrode.`,
  '/nyani/Physics/ENDSEM/img-20201125-wa0066.jpg': `Q5 — E: the scan indicates this choice; coherent waves have the same frequency and a constant phase difference.
Q6 — D: interference.
Q7 — E: phase difference π equals half a wavelength.
Q8 — D: photon energy must exceed the work function.
Q9 — A.
Q10 — C: Compton scattering supports the particle model of light.
Q11 — C: acceleration points toward equilibrium.
Q12 — C: doubling frequency doubles maximum speed.`,
  '/nyani/Physics/ENDSEM/img-20201125-wa0082.jpg': `Q27 — D: a Geiger–Müller tube detects ionizing radiation.
Q28 — B.
Q29 — B: alpha particle plus beta-minus electron.
Q30 — B: trace the isotope through the body to study organ function.
Q31 — Likely C; the scan is distorted, so verify against a clearer copy.`,
  '/nyani/Physics/ENDSEM/img-20201125-wa0083.jpg': medicalPhysics,
  '/nyani/Physics/ENDSEM/img-20201125-wa0085.jpg': `Q32 — C: a neutron is neutral.
Q33 — B: mass excess.
Q34 — C: increasing distance reduces exposure.`,
  '/nyani/Physics/ENDSEM/img-20201125-wa0087.jpg': `Q22 — B: nuclear fission.
Q23 — B: radioactive decay decreases exponentially.
Q24 — B: electron capture lowers atomic number by one.
Q25 — B: energy = dose × mass = 0.25 × 75 = 18.75 J.
Q26 — D: the decay constant depends on the nucleus.`,
  '/nyani/Physics/ENDSEM/img-20201125-wa0089.jpg': `Q1a: approximately 4.8×10^14 Hz.
Q1b: approximately 2.76 eV.
Q1c: approximately 4.1×10^5 m/s.
Q3a: 422 nm.
Q3b: approximately 24°.
Q3c: 24°.
Q3d: approximately 62°.`,
  '/nyani/Physics/ENDSEM/img-20201125-wa0091.jpg': `Q35 — D: alpha particles strongly ionize tissue and can damage cells.
Q36–Q40: the matching table is too unclear to read reliably.`,
  '/nyani/Physics/ENDSEM/img-20201125-wa0105.jpg': 'This is a formula sheet, not a numbered question page.'
};
