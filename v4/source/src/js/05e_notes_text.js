// ---------- the Lab Notes: every subject, written up in stages ----------
// first: the first impression · obs: one line per behaviour or attack · hyp: the hypothesis (wrong: why it was rejected)
// concl: the conclusion (printed) · foot: further reading, the real physics · need: how many (kills, waves, sightings…) to conclude
// obs triggers: 'seen' (at sighting) · 'kill' (first kill) · a number (seconds on screen) · otherwise a hook in the code
// d: only seen from that difficulty up (extra boss attacks)
const NOTE_SRC = {
  // ===== classical matter =====
  'enemy:electron': {
    first: 'Small, amber, wobbling. They come in swarms.', need: 25,
    obs: { path: ['Moves toward me on a wobbling path, never quite straight.', 'seen'], kill: ['One hit each. Weak alone, dangerous in numbers.', 'kill'], swarm: ['They arrive in rings of six or more and close in together.', 25] },
    hyp: 'A light, negatively charged particle, drawn to me the way opposite charges attract.',
    wrong: 'I am not charged (except under Coulomb’s law). It simply chases the average of my positions.',
    concl: 'An electron: the lightest charged particle, 1/1836 of a proton’s mass. Here it homes on my expectation value ⟨x⟩ with a sideways wobble.',
    foot: 'J. J. Thomson discovered the electron in 1897 using cathode rays. Real electrons do not orbit atoms like planets: they spread out in clouds called orbitals, described by Schrödinger’s equation. Its charge, −1.602×10⁻¹⁹ C, is the smallest charge ever seen on a free particle (quarks carry thirds of it, but are never free).',
  },
  'enemy:proton': {
    first: 'Slow. Heavy. Three dots spin inside it.', need: 20,
    obs: { inner: ['Three coloured dots circle inside a ring.', 'seen'], fire: ['Fires one aimed shot every two seconds or so.', 10], kill: ['Takes about five hits.', 'kill'] },
    hyp: 'A composite particle: something inside holds three smaller things together.',
    concl: 'A proton: two up quarks and one down quark, bound by the strong force. Sturdy, slow, single shots.',
    foot: 'Rutherford identified the proton between 1917 and 1919. Its mass is about 938 MeV/c², but its three quarks’ own masses add up to only about 1% of that. Almost all of a proton’s mass is the energy of the gluon field and the quarks’ motion: E = mc² at work. Protons have never been seen to decay; experiments put their lifetime above 10³⁴ years.',
  },
  'enemy:muon': {
    first: 'Fast and orange, with an arc around it that keeps shrinking.', need: 20,
    obs: { chase: ['Chases quickly. The arc around it shortens as it goes.', 'seen'], decay: ['When the arc ran out it burst into a ring of eight bullets: μ⁻ → e⁻ ν̄ ν.'], kill: ['Three hits. Kill it before the arc closes and there is no burst.', 'kill'] },
    hyp: 'The arc is a clock: it lives for a fixed time, then breaks apart.',
    wrong: 'Not a fixed time: each one lasts a little longer or shorter. Decay is random; only the average lifetime is fixed.',
    concl: 'A muon: a heavy cousin of the electron (207 times the mass) that decays into an electron and two neutrinos.',
    foot: 'Muons are made when cosmic rays hit the upper atmosphere, about 15 km up. With a mean lifetime of 2.2 microseconds, almost none should reach the ground, yet thousands pass through you every minute. Special relativity explains it: seen from the ground, their clocks run slow. Rossi and Hall measured this in 1941, one of the first direct tests of time dilation.',
  },
  'enemy:tachyon': {
    first: 'Pink chevrons. A dashed line appears, then it is suddenly somewhere else.', need: 20,
    obs: { aim: ['It draws a dashed line toward me first.', 'seen'], dash: ['Then it dashes along the line, faster than anything else here.'], kill: ['Three hits. Easiest to hit while it rests between dashes.', 'kill'] },
    hyp: 'It travels faster than light. Perhaps it even arrives before it leaves.',
    wrong: 'It does not break cause and effect here: the line always comes first, the dash second. It is just very fast.',
    concl: 'A tachyon: a hypothetical particle that always moves faster than light. Here it shows its path, then dashes.',
    foot: 'Gerald Feinberg named tachyons in 1967. Relativity does not strictly forbid them, but they would need an imaginary mass, could never slow down to light speed, and could send signals into the past, which is why most physicists think they do not exist. None has ever been found. In modern field theory a ‘tachyonic’ field usually just means an instability: the Higgs field starts out that way.',
  },
  'enemy:quark': {
    first: 'Three coloured dots on wiggling strings, always together.', need: 15,
    obs: { strings: ['Red, green and blue, joined by springy strings.', 'seen'], confine: ['I killed one, and a few seconds later it grew back on its string.'], kill: ['To clear them, all three must go within about three seconds.', 'kill'] },
    hyp: 'They cannot be separated. Pull one away and another takes its place.',
    concl: 'A quark triad. Quarks are never seen alone: the strong force between them grows with distance (confinement).',
    foot: 'Murray Gell-Mann and George Zweig proposed quarks in 1964, and electron-scattering experiments at SLAC confirmed them in 1968. ‘Colour’ is just a name for the strong charge: red, green and blue combine to ‘white’, the only combination that can exist freely. Pull two quarks apart and the energy in the gluon string grows until it makes a new quark–antiquark pair, so you get new particles instead of a free quark.',
  },
  'enemy:physicist': {
    first: 'A person in a lab coat with a camera. It said ‘Hold still.’', need: 15,
    obs: { walk: ['Walks toward me, talking.', 'seen'], measure: ['It charged a dashed ring and flashed. My cats inside and outside the ring were separated, and one group vanished.'], photons: ['When I was a single cat it threw photons at me instead.'], kill: ['Four hits. Complains about funding when it falls.', 'kill'] },
    hyp: 'The flash is a measurement. It asks ‘is the cat here?’, and the answer collapses me.',
    concl: 'A physicist. Its flash is a position measurement: I collapse to the cats inside its ring or the cats outside. It never kills directly.',
    foot: 'In the Copenhagen interpretation (Bohr and Heisenberg, 1920s), a measurement collapses the wavefunction to one outcome, with probabilities given by the Born rule (1926). What counts as a measurement, and why it should be special, is the measurement problem, still argued about. Decoherence explains much of it: any interaction that records which-way information destroys interference.',
  },
  'enemy:positron': {
    first: 'Pink and zig-zagging.', need: 20,
    obs: { zig: ['Zig-zags toward me.', 'seen'], annihilate: ['When it died it exploded and damaged everything near it, other positrons included: a chain reaction.'] },
    hyp: 'It is the opposite of something. When it goes, it takes its surroundings with it.',
    concl: 'A positron: the antiparticle of the electron. Here it annihilates when it dies and hurts nearby enemies.',
    foot: 'Paul Dirac’s 1928 equation for the electron predicted antimatter; Carl Anderson saw positron tracks in cosmic rays in 1932. When an electron meets a positron they annihilate, usually into two gamma-ray photons of 511 keV each. Hospitals use this every day: PET scans detect those photon pairs. Why the universe is almost all matter and hardly any antimatter is still unsolved.',
  },
  'enemy:turret': {
    first: 'It parks somewhere and starts to spin.', need: 15,
    obs: { park: ['Stops moving and sprays spiral streams.', 'seen'], flip: ['Every few seconds its spin flips and the spirals reverse.'], kill: ['Stationary: an easy target, once you dare to get close.', 'kill'] },
    hyp: 'It has exactly two states, up and down, and switches between them.',
    concl: 'A spin-½ turret: spin up or spin down, never in between when measured.',
    foot: 'The Stern–Gerlach experiment (1922) sent silver atoms through an uneven magnetic field and found exactly two beams, not a smear: spin is quantised. An electron’s spin is ½ (in units of ℏ), and turning it 360° does not bring it back to its starting state; it takes 720°. MRI scanners work by flipping the spins of protons in your body with radio waves.',
  },
  'enemy:magnetar': {
    first: 'Pale and spinning fast, with two dashed lines.', need: 12,
    obs: { lines: ['Two dashed lines sweep around it.', 'seen'], beam: ['Then the lines become solid beams.'], bend: ['My shots curve around it, bent by its field.', 15] },
    hyp: 'A spinning star with an enormous magnetic field, beaming from its poles.',
    concl: 'A magnetar: a neutron star with a magnetic field around 10¹⁵ times Earth’s. Its beams sweep like a lighthouse, and its field bends my shots.',
    foot: 'Magnetars are the strongest magnets known: their fields would wipe a credit card from halfway to the Moon and squeeze atoms into thin needles. In 2004 a giant flare from magnetar SGR 1806−20, 50,000 light-years away, measurably disturbed Earth’s upper atmosphere. Pulsar beams were discovered by Jocelyn Bell Burnell in 1967.',
  },
  'enemy:neutrino': {
    first: 'Something streaked across the whole arena, changing colour as it went.', need: 12,
    obs: { streak: ['Crosses the arena in a straight line, cycling through three colours.', 'seen'], ghost: ['Only when it is solid green can it touch me or be hit. The dotted colours pass through everything.', 10], kill: ['Caught one while it was green.', 'kill'] },
    hyp: 'It changes identity as it travels.',
    concl: 'A neutrino. It oscillates between three flavours (electron, muon, tau); only one flavour interacts here.',
    foot: 'Wolfgang Pauli proposed the neutrino in 1930 to rescue energy conservation in beta decay. About 65 billion neutrinos from the Sun pass through every square centimetre of you each second, almost all without touching anything. Neutrino oscillation, which proves they have mass, won Kajita and McDonald the 2015 Nobel Prize. Detecting them takes thousands of tonnes of water or ice.',
  },
  'enemy:neutron': {
    first: 'Slow, grey and tough.', need: 15,
    obs: { slow: ['Slow and heavy.', 'seen'], decay: ['When it died (or after waiting long enough) it split into a proton and an electron.'], kill: ['Plenty of hits, and it leaves two more behind.', 'kill'] },
    hyp: 'It is a proton and an electron stuck together.',
    wrong: 'Not quite. A neutron is three quarks (up, down, down). In beta decay one down quark becomes an up quark, making a proton, an electron and an antineutrino. The electron was not inside it beforehand.',
    concl: 'A neutron: neutral, a little heavier than a proton, and unstable on its own.',
    foot: 'James Chadwick discovered the neutron in 1932. A free neutron lives about 15 minutes before it decays; inside a stable nucleus it can last forever. Two kinds of experiment disagree about that lifetime by about 9 seconds, the unsolved ‘neutron lifetime puzzle’. Neutron stars are made almost entirely of them, packed to the density of an atomic nucleus.',
  },
  'enemy:alpha': {
    first: 'A tight cluster of four. A ghost of it appeared somewhere else.', need: 15,
    obs: { ghost: ['A dashed ghost shows where it is going.', 'seen'], tunnel: ['It vanished and popped out where the ghost was, firing a ring of bullets.'], kill: ['A few hits, best between jumps.', 'kill'] },
    hyp: 'It passes through barriers it does not have the energy to climb.',
    concl: 'An alpha particle: two protons and two neutrons (a helium nucleus). It escapes from nuclei by quantum tunnelling.',
    foot: 'In 1928 George Gamow (and independently Gurney and Condon) explained alpha decay as tunnelling: the alpha particle never has enough energy to climb over the nucleus’s barrier, but its wavefunction leaks through. The leak depends exponentially on the barrier, so alpha half-lives range from microseconds to billions of years. Household smoke detectors use alpha particles from americium-241.',
  },
  'enemy:atom': {
    first: 'A nucleus with three electrons orbiting it.', need: 12,
    obs: { shell: ['Three electrons orbit it and block my shots.', 'seen'], ionise: ['Each electron took three hits, then flew off as a free electron.'], lines: ['It fires sharp lines of light: hν.', 15] },
    hyp: 'The electrons are a shield, and its light comes in fixed colours.',
    concl: 'An atom. Knock its electrons off (ionise it) to reach the nucleus. It emits light only at fixed energies.',
    foot: 'Niels Bohr’s 1913 model explained why hydrogen glows in only certain colours: electrons jump between fixed energy levels and emit a photon of energy E = hν. Every element has its own spectral barcode, which is how we know what distant stars are made of. Helium was found in the Sun’s spectrum in 1868, decades before anyone found it on Earth.',
  },
  'enemy:higgs': {
    first: 'Gold, with a wide glowing field around it.', need: 10,
    obs: { field: ['A golden field spreads around it.', 'seen'], mass: ['Inside the field, enemies slow down and take half damage, and bullets slow too.', 6], decay: ['After about twenty seconds it decayed into two photons.'] },
    hyp: 'Its field gives things weight.',
    concl: 'A Higgs boson. Its field gives particles mass; inside it here, everything is heavier and slower.',
    foot: 'Peter Higgs, François Englert, Robert Brout and others proposed the mechanism in 1964. CERN’s Large Hadron Collider found the boson in 2012, at about 125 GeV, and Higgs and Englert shared the 2013 Nobel Prize. Decay into two photons was one of the first clear signals. Note: the Higgs gives mass to fundamental particles, but most of your own mass comes from the strong force inside protons and neutrons.',
  },
  'enemy:darkmatter': {
    first: 'Nothing there, yet the grid is bending.', need: 10,
    obs: { lens: ['The grid and nearby bullets bend around an empty spot.', 'seen'], close: ['When my cats got close, it showed faintly.', 8], kill: ['It can be killed, if you can find it.', 'kill'] },
    hyp: 'Something with mass is here, and it gives off no light at all.',
    concl: 'Dark matter: invisible, detected only by its gravity.',
    foot: 'In 1933 Fritz Zwicky found galaxies in the Coma cluster moving too fast for their visible mass to hold them together. In the 1970s Vera Rubin showed that stars at the edges of galaxies orbit as fast as those near the centre. About 85% of the matter in the universe seems to be dark. Gravitational lensing maps where it is; what it is made of remains unknown.',
  },
  'enemy:virtual': {
    first: 'Two dots appeared out of nothing and flew apart.', need: 8,
    obs: { pop: ['A pair pops out of empty space and separates.', 'seen'], meet: ['They come back together and annihilate.', 5], real: ['When I killed one, the other became a real, lasting electron.'] },
    hyp: 'Empty space is not empty: it borrows energy to make pairs, briefly.',
    concl: 'Virtual particles. Pairs flicker into existence and vanish; disturb one and its partner can become real.',
    foot: 'Quantum field theory says the vacuum is never perfectly still. ‘Virtual particles’ are a way of describing that, not things you could catch, but their effects are measured: the Lamb shift in hydrogen (1947) and the Casimir force between metal plates. Hawking’s radiation from black holes is often explained as a virtual pair split by the horizon, with one partner escaping as real.',
  },
  // ===== entangled matter =====
  'enemy:twin': {
    first: 'Two gold particles joined by a shimmering thread: one spin up, one spin down.', need: 6,
    obs: { pair: ['Always in pairs: one arrow up, one down.', 'seen'], share: ['I hit one and both flashed: the damage was shared.'], together: ['When one died, the other died at the same instant, wherever it was.'] },
    hyp: 'Spooky action at a distance: whatever happens to one happens instantly to the other.',
    wrong: 'As physics, no. In the arena it works that way, but real entangled particles do not affect each other: measuring one changes nothing about the other. What they share is correlation. Their results always match (or always oppose) in a way no plan made in advance can explain, and no message can be sent through it.',
    concl: 'A bound (entangled) pair in a singlet state: opposite spins. In this game they share damage and die together. Reality is subtler: entanglement is correlation without signalling.',
    foot: 'Einstein, Podolsky and Rosen (1935) argued such correlations meant quantum mechanics was incomplete; Einstein called it ‘spooky action at a distance’. Schrödinger coined the word ‘entanglement’ the same year. The no-signalling theorem shows it cannot carry information: each side’s results look completely random on their own, and the correlation only appears when the two lists are compared.',
  },
  'enemy:shade': {
    first: 'Something huge and dark, drifting toward me.', need: 4,
    obs: { drift: ['Large and relentless. A thread runs from it into the distance.', 'seen'], immune: ['My shots do nothing to it at all.'], collapse: ['When I destroyed its Anchor, far away, it collapsed instantly.'] },
    hyp: 'It cannot be harmed directly. Its existence depends on something else.',
    concl: 'A Shade, anchored to a distant partner. Destroy the Anchor and the Shade goes with it.',
    foot: 'This is a game rule, not physics: no real particle can be destroyed by acting on its distant partner. It is a picture of what entanglement is often wrongly imagined to do. The true version is about knowledge: once you measure one half of an entangled pair, you know something about the other half, without anything travelling between them.',
  },
  'enemy:anchor': {
    first: 'A small gold diamond that keeps its distance and never fires.', need: 5,
    obs: { evade: ['Fast, evasive, harmless on its own.', 'seen'], cut: ['Cutting it collapsed whatever it was tied to.'] },
    hyp: 'It is the other half of something bigger.',
    concl: 'An Anchor: the far half of an entangled pair. Follow the thread to find it.',
    foot: 'In real experiments, the two halves of entangled pairs have been sent 1,200 km apart, from the Chinese satellite Micius to two ground stations (2017), and their correlations survived intact. Distance does not weaken entanglement; noise and contact with the environment (decoherence) do.',
  },
  'enemy:mirror': {
    first: 'Two cyan discs, always exactly opposite each other.', need: 6,
    obs: { orbit: ['They circle a moving centre, always on opposite sides.', 'seen'], freeze: ['When I hit one, its partner froze for a moment.'], alone: ['Kill one and the other is decorrelated: it turns into an ordinary fast chaser.'] },
    hyp: 'Perfectly anti-correlated: if one is here, the other is there.',
    concl: 'A mirror pair: an anti-correlated state. Their positions are always opposite.',
    foot: 'Anti-correlation alone is not quantum: a pair of gloves in two boxes is anti-correlated too (open one and you know the other is the opposite hand). The quantum surprise is that entangled pairs stay correlated whichever direction you choose to measure them in, which gloves cannot do. John Bell turned that difference into a test experiments can run (see The Local Realist).',
  },
  'enemy:bellpair': {
    first: 'Two pink emitters, on opposite sides of me.', need: 6,
    obs: { circle: ['They circle me from opposite sides.', 'seen'], sync: ['They fire at the same instant, in mirror-image patterns.'], predict: ['Watching one tells me what the other is about to do.', 12] },
    hyp: 'The patterns were agreed in advance: a hidden plan.',
    wrong: 'For these two, maybe. But no plan made in advance can reproduce real entangled correlations when the settings are chosen freely at the last moment. That is Bell’s theorem.',
    concl: 'A Bell pair: correlated emitters. A preview of The Local Realist.',
    foot: 'Bell’s theorem (1964) proved that if outcomes are fixed in advance by local hidden variables, correlations must obey a limit (the Bell, or CHSH, inequality). Quantum mechanics predicts that entangled particles break it, reaching S = 2√2 ≈ 2.83 instead of at most 2, and experiments agree with quantum mechanics.',
  },
  'enemy:assistant': {
    first: 'A small figure in a green coat, hiding behind an elite.', need: 4,
    obs: { hide: ['Stays on the far side of its elite from me.', 'seen'], heal: ['It heals its elite with a beam, and only its elite.'], flee: ['When its elite fell, it panicked and ran for the edge.'], caught: ['I caught one while it fled. Bonus points.'] },
    hyp: 'It exists to keep one particular elite alive.',
    concl: 'A lab assistant. Shoot it first, or the elite keeps healing.',
    foot: 'Real labs run on assistants, technicians and students, and history has often left them out of the credit. Rosalind Franklin’s X-ray image of DNA (‘Photo 51’) was shown to Watson and Crick without her knowledge. Jocelyn Bell Burnell found the first pulsar as a graduate student in 1967; the 1974 Nobel Prize went to her supervisor.',
  },
  'enemy:friend': {
    first: 'A physicist in a box of their own, beside the Apparatus.', need: 3,
    obs: { box: ['Keeps away from me, tied to the Apparatus by a dashed line.', 'seen'], shield: ['While the friend lived, the Apparatus barely felt my shots.', 6], kill: ['With the friend gone, the box was open to damage again.', 'kill'] },
    hyp: 'Two observers of the same experiment, and they cannot both be right.',
    concl: 'Wigner’s friend: an observer inside the experiment. While the friend’s measurement stands, the Apparatus is protected.',
    foot: 'Eugene Wigner (1961) imagined a friend measuring Schrödinger’s cat inside a closed lab. For the friend, the result is definite; for Wigner outside, friend and cat together are still in superposition. Who is right? A 2018 theorem by Frauchiger and Renner, and small photon experiments since 2019, suggest observers can be forced to disagree about what is a fact.',
  },
  // ===== elites =====
  'enemy:professor': {
    first: 'An enormous physicist in a mortarboard.', need: 3,
    obs: { papers: ['Slow, and throws papers.', 'seen'], measure: ['Its dashed ring is enormous, and it measures everything inside.'], summon: ['It calls graduate students to do the measuring for it.'] },
    hyp: 'Senior enough to measure from far away, and to delegate the rest.',
    concl: 'A tenured professor: slow, huge measurements and a supply of students.',
    foot: 'Quantum mechanics was argued out by its professors. At the 1927 Solvay conference, Einstein brought Bohr a new thought experiment at breakfast each morning, and Bohr had an answer by dinner. Einstein lost that week, but his 1935 paper with Podolsky and Rosen posed the question that John Bell answered thirty years later.',
  },
  'enemy:neutronstar': {
    first: 'Tiny, white-hot, and its gravity pulls at me.', need: 3,
    obs: { pull: ['Its gravity drags me and my shots toward it.', 'seen'], beam: ['Two pulsar beams sweep around after a dashed warning.'], pulse: ['It pulses out rings of bullets.', 10] },
    hyp: 'Enormous mass in a tiny space.',
    concl: 'A neutron star: the collapsed core of a star, about 1.4 suns squeezed into 20 km.',
    foot: 'Walter Baade and Fritz Zwicky predicted neutron stars in 1934, just two years after the neutron was discovered. A teaspoon of neutron-star matter would weigh about a billion tonnes. In 2017 LIGO and Virgo detected two neutron stars merging (GW170817) and telescopes watched the explosion: it forged heavy elements, gold and platinum among them.',
  },
  'enemy:quasar': {
    first: 'A blazing disk around a black core, keeping its distance.', need: 3,
    obs: { disk: ['A bright disk around a dark centre.', 'seen'], jets: ['Jets fire from its poles after a dashed warning, and sweep.'], hawk: ['It sprays a steady stream of radiation at me.', 10] },
    hyp: 'A black hole feeding hard enough to outshine everything around it.',
    concl: 'A quasar: a supermassive black hole swallowing gas so fast that its disk outshines its whole galaxy.',
    foot: 'Quasars (‘quasi-stellar radio sources’) were identified in the 1960s. In 1963 Maarten Schmidt measured the redshift of 3C 273: billions of light-years away, yet bright enough to see with a backyard telescope. Their jets are flung out by magnetic fields near the spinning black hole at nearly the speed of light.',
  },
  'enemy:lead': {
    first: 'A heavy nucleus wrapped in orbiting electrons.', need: 3,
    obs: { shell: ['Its electrons catch my shots.', 'seen'], ionise: ['Knock enough electrons off and the nucleus is exposed. The shell grows back.'] },
    hyp: 'A heavy atom, shielded by its electrons.',
    concl: 'A lead nucleus: 82 protons. Strip its shell, then hit the core.',
    foot: 'Lead-208 is ‘doubly magic’: 82 protons and 126 neutrons both fill complete nuclear shells, making it the heaviest stable nucleus known. Lead blocks X-rays and gamma rays well because its many electrons scatter and absorb them. CERN smashes lead nuclei together at nearly light speed to melt them, briefly, into a quark–gluon plasma.',
  },
  'enemy:cooper': {
    first: 'Two electrons bound together, spinning around each other.', need: 3,
    obs: { halves: ['Two halves, joined.', 'seen'], pair: ['A shot on one half did nothing unless the other half was hit at almost the same moment.'], meissner: ['Sometimes it pushes my shots away: the Meissner effect.'] },
    hyp: 'The two halves act as one: break both together.',
    concl: 'A Cooper pair: two electrons bound together in the cold, the basis of superconductivity.',
    foot: 'Electrons repel each other, but in a cold metal they can pair up through vibrations of the crystal lattice (Bardeen, Cooper and Schrieffer, 1957), and the pairs flow with no resistance at all. A superconductor also expels magnetic fields (Meissner and Ochsenfeld, 1933), which is why magnets can float above one. Many quantum computers use superconducting circuits as their qubits.',
  },
  'enemy:postdoc': {
    first: 'A physicist with a laptop and a coffee, very busy.', need: 3,
    obs: { drafts: ['Fires drafts in fans.', 'seen'], publish: ['Every few seconds it publishes: a ring of papers.'], split: ['When it fell, it split into two junior copies.'] },
    hyp: 'Every defeat produces more postdocs.',
    concl: 'A postdoc: productive, overworked, and when one goes, two more appear.',
    foot: 'A postdoctoral position is the research job between a PhD and a permanent post, often several in a row, in different countries. A great deal of physics is postdoc work. The splitting is a joke on the profession, and a nod to how your own cats split.',
  },
  'enemy:decoherer': {
    first: 'A hot, flickering haze around a jagged core.', need: 3,
    obs: { spray: ['It sprays thermal photons in every direction.', 'seen'], drain: ['Inside its haze my coherence drained several times faster.'], burst: ['Every few seconds it flares out in a ring.', 12] },
    hyp: 'It is an environment: it destroys superposition just by touching it.',
    concl: 'A decoherer: a hot environment. Any superposition near it leaks its information into the noise.',
    foot: 'Decoherence (Zeh in 1970, Zurek in the 1980s) explains why we never see cats in superposition: every stray interaction (an air molecule, a photon of heat) records information about the system, and the interference between its possibilities disappears. It is the main enemy of quantum computers, which are cooled to about a hundredth of a degree above absolute zero to keep their qubits coherent.',
  },
  'enemy:titan': {
    first: 'Enormous and violet, with a thread running off into the distance.', need: 3,
    obs: { lobes: ['Two lobes orbit its core, spraying bullets.', 'seen'], anchored: ['While its Anchor lived, it shrugged off most of my damage.', 6], collapse: ['When I cut the thread, it collapsed.'] },
    hyp: 'Its strength is borrowed from its partner.',
    concl: 'An entangled titan: armoured while its Anchor survives. Find the Anchor.',
    foot: 'Big entangled states are real. Quantum computers now entangle dozens of qubits in ‘GHZ states’, named after Greenberger, Horne and Zeilinger, who showed in 1989 that three entangled particles can contradict hidden variables in a single run, with no statistics needed. The bigger the entangled state, the more fragile it is, which is why this one guards its other half so closely.',
  },
  // ===== bosses =====
  'boss:observer': {
    first: 'A giant eye. It is looking straight at me.',
    obs: {
      gaze: ['The Gaze: a cone that collapses any cat inside it, with shots down the same line.'], rings: ['Iris Rings: rings of bullets out of the pupil.'], tears: ['Tears: a shower of falling drops. While it cries, it is weak.'],
      blink: ['Blink: it shuts its eye and calls physicists. It cannot be hurt while shut, and is dazzled when it opens.'], stare: ['Stare: aimed volleys and spirals. Its eye dries out afterwards.'],
      doubletake: ['Double Take: two cones sweeping from both sides at once.', '', 'postdoc'], zeno: ['Watched Pot: inside its wide gaze my cats could barely move.', '', 'reviewer2'],
      window: ['It takes far more damage when dazzled or crying. The pupil takes double.'], phase: ['Wounded, it looks two ways at once.'], beaten: ['Closed for good.'],
    },
    hyp: 'It is a measuring device: wherever it looks, the outcome is forced.',
    concl: 'The Observer: a measurement that cannot stop measuring. Beaten by hitting it when it cannot see.',
    foot: 'The quantum Zeno effect: a system measured often enough cannot change, because each measurement resets it. Misra and Sudarshan named it in 1977 after Zeno’s paradox of the arrow; it was seen in trapped ions in 1990. ‘A watched pot never boils’ is the folk version. Here the Observer’s gaze collapses whatever it looks at.',
  },
  'boss:laplace': {
    first: 'A clock-faced demon covered in equations. It knows where I will be.',
    obs: {
      predict: ['Prediction: crosshairs where I will be, then shots there.'], clockwork: ['Clockwork: clock hands sweep the arena as lasers.'], rose: ['Rose Curve: r = cos(kθ) flowers of bullets.'],
      lissajous: ['Lissajous: harmonic streams.'], chaos: ['Logistic Chaos: r = 3.99. Even it cannot predict this one.'],
      twofold: ['Two Futures: it predicts both where I am going and where I would turn back to.', '', 'postdoc'], initial: ['Initial Conditions: a lattice of shots, all aimed at one future point.', '', 'reviewer2'],
      window: ['When a prediction misses, it is confused and weak. Change direction as the crosshair appears.'], phase: ['Wounded, it rewinds time and every bullet reverses.'], beaten: ['Wrong at last.'],
    },
    hyp: 'If it knows every position and velocity, it knows the whole future.',
    wrong: 'Its predictions fail: it extrapolates my average, and I can change my mind. Chaos and quantum mechanics break its premise too.',
    concl: 'Laplace’s Demon: perfect determinism, defeated by unpredictability.',
    foot: 'Pierre-Simon Laplace, 1814: ‘An intellect which at a certain moment would know all forces that set nature in motion, and all positions of all items of which nature is composed … nothing would be uncertain, and the future just like the past would be present before its eyes.’ Two things killed the demon: chaos (Poincaré in the 1890s, Lorenz in 1963), where tiny errors grow exponentially, and quantum mechanics, where position and momentum cannot both be known and outcomes are genuinely random.',
  },
  'boss:die': {
    first: 'A giant die, tumbling. Einstein would not approve.',
    obs: {
      1: ['One: a single huge orb that bursts.'], 2: ['Two: a double spiral.'], 3: ['Three: three rotating lasers.'], 4: ['Four: walls of bullets with one gap.'], 5: ['Five: homing mines.'], 6: ['Six: six fast streams.'],
      crit: ['Natural 20 (as a d20): bullets rain from the top.'], fumble: ['Natural 1: it hurts itself and is stunned.'],
      loaded: ['Loaded Die: it plays a face and its opposite at once. Opposite faces add up to seven.', '', 'postdoc'], explode: ['Exploding Six: roll a six and it rolls again straight away.', '', 'reviewer2'],
      window: ['It is weak the moment it lands, before the attack gets going.'], phase: ['Badly hurt, it becomes a d20.'], beaten: ['No more rolls.'],
    },
    hyp: 'Its rolls are truly random. I can never know the next face.',
    concl: 'The Celestial Die: chance itself. You cannot predict the face, only be ready when it lands.',
    foot: 'Einstein, in a 1926 letter to Max Born: God ‘does not throw dice’. Bohr is said to have replied that Einstein should stop telling God what to do. Bell tests since the 1980s, and loophole-free ones in 2015, show quantum randomness cannot come from hidden pre-set values. A real die is not truly random (it is chaotic but deterministic); a quantum measurement, as far as anyone can tell, is.',
  },
  'boss:maxwell': {
    first: 'A demon on a wall, sorting fast molecules from slow ones.',
    obs: {
      effuse: ['Effusion: fast (red) molecules into my side, slow (blue) ones into the other.'], blackbody: ['Black Body: thermal radiation in every direction.'], piston: ['Piston: it slides the wall to squeeze my chamber.'],
      shutter: ['Shutter: the door flaps open and shut, spraying through.'], convect: ['Convection: currents swirl in my chamber.'],
      szilard: ['Szilárd Engine: a partition across my chamber, then heat poured into whichever half I am in.', '', 'postdoc'], landauer: ['Landauer’s Bill: it writes down where my cats are, then sends heat to each spot.', '', 'reviewer2'],
      window: ['Shooting its molecules fills its memory. When the memory is full it must stop and erase, and is defenceless.'], beaten: ['Memory cleared for good.'],
    },
    hyp: 'It breaks the second law of thermodynamics by sorting molecules for free.',
    wrong: 'It cannot do it for free. Every bit it records must eventually be erased, and erasing costs energy (kT ln 2 per bit). That is exactly when it is weak.',
    concl: 'Maxwell’s Demon: information is physical. Erasing its memory costs it energy and time.',
    foot: 'James Clerk Maxwell imagined the demon in 1867. Leó Szilárd (1929) tied it to information, and Rolf Landauer (1961) and Charles Bennett (1982) settled it: measuring can be free, but erasing one bit of memory releases at least kT ln 2 of heat, which saves the second law. Landauer’s limit was measured directly in 2012 (Bérut and colleagues, in Nature).',
  },
  'boss:slit': {
    first: 'A barrier with slits across the top of the arena, and a gun behind it.',
    obs: {
      fringes: ['Fringes: bullets come through as bright lanes, with dark lanes that are safe.'], huygens: ['Huygens Wavelets: every slit sends out its own fan.'], diffract: ['Single Slit: one slit, one broad bright lane in the middle.'], photons: ['One Photon at a Time: aimed shots from the nearest slit.'],
      pairs: ['Entangled Photons: it sends out a Bell pair, one from each slit.', '', 'postdoc'], eraser: ['Delayed Choice: both possible patterns are shown, and it only decides which after the light is through.', '', 'reviewer2'],
      window: ['Aim straight at a slit and the pattern collapses into two clumps (which-path information). My shots get through to the gun.'], phase: ['A third slit opens: a diffraction grating.'], beaten: ['The screen goes dark.'],
    },
    hyp: 'Each bullet goes through both slits at once and interferes with itself.',
    concl: 'The Double Slit. Interference exists only while nobody knows the path.',
    foot: 'Thomas Young showed light interferes around 1801. Claus Jönsson did it with electrons in 1961, and in 1989 Akira Tonomura’s team sent electrons one at a time: each lands as a single dot, yet the dots build up stripes. Find out which slit each one used and the stripes vanish. Feynman called it a phenomenon ‘impossible … to explain in any classical way’ which ‘has in it the heart of quantum mechanics’. Wheeler proposed the delayed-choice version in 1978; it was done with photons in 2007.',
  },
  'boss:threebody': {
    first: 'Three suns orbiting each other in no stable pattern.',
    obs: {
      orbit: ['Orbits: free, chaotic flight, each sun firing rings.'], eight: ['Figure-Eight: a rare stable dance, dropping bullets.'], sling: ['Slingshot: one sun is flung at me along a dashed line.'], syzygy: ['Syzygy: all three line up, with a beam along the line.'],
      comet: ['A Fourth Body: a comet falls in from outside and is flung around.', '', 'postdoc'], eject: ['Ejection: one sun is thrown out of the system and bounces off the walls.', '', 'reviewer2'],
      window: ['When two suns pass close, tidal stress makes them weak.'], beaten: ['Solved, the hard way.'],
    },
    hyp: 'Its motion follows simple laws, yet cannot be written down in advance.',
    concl: 'The Three-Body Problem: Newtonian gravity with no general solution.',
    foot: 'Isaac Newton solved two bodies exactly; three defeated everyone. Henri Poincaré (1890) showed there is no general closed-form solution, and found chaos along the way. Special solutions do exist: Cris Moore found the figure-eight by computer in 1993, and Chenciner and Montgomery proved it in 2000. Real triple stars, like Alpha Centauri, stay stable by keeping one star far from the other two.',
  },
  'boss:oscillator': {
    first: 'An orb on two springs, swinging back and forth.',
    obs: {
      breathe: ['Breathing Mode: its bullets fly out, stop, and all come back at the same moment.'], ladder: ['Ladder Operators: shells of bullets at quantised energy levels.'], wave: ['Travelling Wave: coupled oscillators in lines across the arena.'], collapse: ['Lowering Operator: rings that close in.'],
      coherent: ['Coherent State: a packet of bullets that swings through without spreading.', '', 'postdoc'], anharmonic: ['Anharmonicity: the levels crowd together and the top shell breaks free.', '', 'reviewer2'],
      window: ['At each end of its swing it stops for a moment: the turning point, where it is weak.'], beaten: ['At rest, finally. Almost.'],
    },
    hyp: 'Everything it does repeats with the same period, however big the swing.',
    concl: 'The Harmonic Oscillator: the most useful model in physics.',
    foot: 'A harmonic oscillator’s period does not depend on how far it swings (Galileo noticed this with pendulums). In quantum mechanics its energy levels are evenly spaced, E = (n + ½)ℏω, so even the lowest state keeps ½ℏω of ‘zero-point energy’: it never fully rests. Molecules, light in a cavity, sound in crystals and every field in quantum field theory are built from oscillators. Coherent states (Schrödinger 1926, Glauber 1963) are the most classical-looking states, and describe laser light.',
  },
  'boss:cyclotron': {
    first: 'A circular accelerator. Its magnetic field fills the arena.',
    obs: {
      spiral: ['Spiral: particles accelerate outward in widening circles.'], reverse: ['Field Reversal: the field flips, every orbit reverses, and the magnets quench.'], arcs: ['Discharge: lightning toward me after a warning.'],
      drift: ['E×B Drift: everything drifts sideways.'], synchro: ['Synchrotron Light: straight beams the field cannot bend.'],
      brems: ['Bremsstrahlung: fast shots that brake hard and hang in the air.', '', 'postdoc'], bottle: ['Magnetic Bottle: charges trapped around me, bouncing between two mirror points.', '', 'reviewer2'],
      window: ['When it reverses its field the magnets quench: weak for a few seconds.'], beaten: ['Field off.'],
    },
    hyp: 'The field bends every charge into a circle; faster ones make wider circles.',
    concl: 'The Cyclotron: r = mv/qB.',
    foot: 'Ernest Lawrence built the first cyclotron in 1931, small enough to hold in one hand. The trick: a charge’s orbit time in a magnetic field does not depend on its speed, so a fixed-frequency voltage can give it a push every half-turn. Hospitals use cyclotrons to make isotopes for PET scans. Earth’s own magnetic field is a giant bottle: the Van Allen belts trap charged particles that bounce between the poles.',
  },
  'boss:bell': {
    first: 'A locked core with a detector on each arm. Each detector has a dial.',
    obs: {
      pairs: ['Correlated Pairs: both detectors fire at once, in mirror image, and the pattern depends on the two settings.'], singlet: ['Singlet Beams: two beams sweeping as mirror images.'], hidden: ['Hidden Variables: bullets laid out with their directions already chosen, then released together.'],
      loophole: ['Closing the Loophole: the detectors move far apart and the dials flip faster.'],
      freedom: ['Freedom of Choice: it brings its own Bell pair.', '', 'postdoc'], steer: ['EPR Steering: hit one detector and the other answers.', '', 'reviewer2'],
      mirror: ['Whatever one detector does, the other mirrors.', 'seen'], coincidence: ['Hitting both detectors within a second tested that pair of settings: a square in its grid lit up.'], violated: ['With all four pairs tested the inequality broke, S > 2, and its armour fell away.'], beaten: ['Local realism: falsified.'],
    },
    hyp: 'It says every outcome was fixed in advance. If so, no combination of tests can beat its limit.',
    wrong: 'They did beat it. With all four pairs of settings tested, the correlations went past 2. No plan fixed in advance can do that.',
    concl: 'The Local Realist: local hidden variables, falsified by testing all four pairs of settings.',
    foot: 'John Bell (1964) showed that if outcomes are fixed in advance and no influence travels faster than light, correlations obey a limit; Clauser, Horne, Shimony and Holt (1969) wrote it as S ≤ 2. Quantum mechanics predicts up to 2√2 ≈ 2.83. Freedman and Clauser (1972), then Alain Aspect (1982, switching settings while the photons were in flight), found violations. In 2015 teams in Delft, Vienna and Boulder closed the main loopholes at once. Aspect, Clauser and Zeilinger shared the 2022 Nobel Prize.',
  },
  'boss:apparatus': {
    first: 'Schrödinger’s own box: an atom, a Geiger counter, a hammer and a flask.',
    obs: {
      gamma: ['γ rays: lines that flash after a dashed warning.'], hammer: ['The Hammer slams down wherever I am.'], flask: ['The Flask Breaks: poison spreads and the walls close in.'], verdict: ['The Verdict: half the box is measured. Keep a cat on each side, or fold away.'],
      friend: ['Wigner’s Friend: an observer in a second box. While the friend lives, the Apparatus is protected.', '', 'postdoc'], friendgone: ['With the friend gone, the box can be hurt again.', '', 'postdoc'], halflife: ['Half-Life: unstable nuclei that burst at random moments.', '', 'reviewer2'],
      decay: ['Its decays come at random: α, β and γ.', 8], window: ['After an activity spike the counter goes dead: that is when it is weak.'], beaten: ['The box is open.'],
    },
    hyp: 'Whether the cat lives depends on one random decay. Until someone looks, both are true.',
    concl: 'The Apparatus: the thought experiment itself. Opened.',
    foot: 'Erwin Schrödinger described the cat in 1935 to show how absurd it is to apply superposition to everyday things: a cat cannot be both alive and dead. Radioactive decay really is random: each nucleus has a fixed chance per second, so only the half-life (the time for half a sample to decay) is predictable. Where the line between quantum and classical lies, if there is one, is still the open measurement problem.',
  },
  // ===== suspended laws =====
  'law:tunnel': { first: 'The walls stopped being walls.', obs: { wrap: ['I left one edge and came back on the opposite side.', 'seen'], all: ['Everything wraps: bullets and enemies too.', 10], shots: ['Shots fired at the edge come back from the far side.', 30] }, hyp: 'There is a chance of passing straight through any barrier.', concl: 'Tunnelling, exaggerated: here every barrier is crossed, every time.', foot: 'Quantum tunnelling lets a particle cross a barrier it does not have the energy to climb, because its wavefunction leaks through. The chance falls off exponentially with the barrier’s width (T ∝ e^(−2κL)). It powers the Sun (protons tunnel close enough to fuse), alpha decay, flash memory, and the scanning tunnelling microscope that first imaged single atoms (Binnig and Rohrer, Nobel Prize 1986).' },
  'law:blackhole': { first: 'Something very heavy arrived. The grid sagged.', obs: { pull: ['Black holes pull me, enemies and bullets in.', 'seen'], eat: ['Enemies that fall in are destroyed.', 10], mass: ['The holes have different masses; heavy ones are slow.', 25] }, hyp: 'Put enough mass in a small enough space and nothing escapes.', concl: 'Black holes. Each class has its own page.', foot: 'Karl Schwarzschild found the first black-hole solution of Einstein’s equations in 1916, months after general relativity was published, while serving on the Russian front. The event horizon of a mass M has radius rₛ = 2GM/c², about 3 km for the Sun. The Event Horizon Telescope imaged the shadow of M87* in 2019 and of our own galaxy’s Sagittarius A* in 2022.' },
  'law:entangle': { first: 'Enemies arrived in linked pairs.', obs: { thread: ['A gold thread joins each pair.', 'seen'], share: ['Damage to one also hits its partner.', 8], both: ['Killing one kills both.', 20] }, hyp: 'Spooky action at a distance.', wrong: 'Only in this game. Real entangled particles share correlations, not damage: nothing passes between them.', concl: 'Entanglement, as a game rule.', foot: 'The state on the card, (|01⟩ − |10⟩)/√2, is the singlet: neither particle has a definite value, but the two are always opposite. Measuring one tells you the other’s result at once, yet nothing you do to one changes what an observer of the other sees, so no message can be sent (the no-signalling theorem).' },
  'law:planck': { first: 'Everything turned chunky.', obs: { pixels: ['The world is pixelated.', 'seen'], leaps: ['Enemies freeze, then reappear further along: quantum leaps.', 6], ghost: ['A faint ring marks where a nearby one is about to land.', 20] }, hyp: 'Planck’s constant sets how grainy the world is. Make it big and the grain shows.', concl: 'ℏ = 1: a world where quantum graininess is visible.', foot: 'Physicists really do set ℏ = 1 (and c = 1): ‘natural units’ make equations shorter. Planck’s constant (h = 6.626×10⁻³⁴ J·s; ℏ = h/2π) sets the scale where nature comes in packets: energy E = hν (Planck 1900, Einstein 1905). Its tininess is why everyday things look smooth. Bohr’s 1913 jumps between atomic levels gave us ‘quantum leap’, which strictly means the smallest possible change.' },
  'law:zeno': { first: 'Whatever I looked at stopped.', obs: { freeze: ['Everything inside my aim cone is frozen, bullets included.', 'seen'], faster: ['Everything outside it moves faster.', 10] }, hyp: 'Watching something often enough stops it changing.', concl: 'The quantum Zeno effect.', foot: 'Misra and Sudarshan (1977) showed that constant measurement can freeze a quantum system’s evolution; Itano, Heinzen, Bollinger and Wineland saw it in 1990 with beryllium ions. Measuring in a way that speeds change up is the anti-Zeno effect. Here only what you aim at is ‘watched’, which is why everything else speeds up.' },
  'law:godel': { first: 'The whole arena began to turn.', obs: { turn: ['The camera rotates slowly.', 'seen'], curve: ['Bullets curve as they fly.', 10] }, hyp: 'The universe itself is rotating.', concl: 'A Gödel universe: rotation built into spacetime.', foot: 'In 1949 the logician Kurt Gödel gave Einstein a 70th-birthday present: an exact solution of general relativity in which the whole universe rotates. It contains closed timelike curves, paths that loop back into their own past. Our universe does not seem to rotate (the cosmic microwave background limits it to almost nothing), but Gödel showed that Einstein’s equations alone do not forbid time travel.' },
  'law:zombie': { first: 'Killed enemies left boxes behind.', obs: { box: ['Each killed enemy leaves a box.', 'seen'], confirm: ['Shooting the box confirms the death.', 8], back: ['Leave a box alone and the enemy may come back.', 20] }, hyp: 'Until I look, they are both dead and alive.', concl: 'Superposition of alive and dead, applied to the enemies for once.', foot: 'Schrödinger’s cat, turned around. In Schrödinger’s 1935 thought experiment, the cat’s fate is tied to a quantum event, so quantum mechanics alone would describe it as both alive and dead until the box is opened. He meant it as a criticism: he found the idea absurd for something as large as a cat.' },
  'law:gravity': { first: 'Things started falling. In a top-down game.', obs: { fall: ['Everything falls toward the glowing floor.', 'seen'], arcs: ['Bullets fall in arcs and bounce once.', 8], turn: ['Every ten seconds the floor turns 90°.', 15] }, hyp: 'A uniform field, pulling one way.', concl: 'Gravity near a planet’s surface: a constant acceleration.', foot: 'Near Earth everything falls with the same acceleration, g ≈ 9.81 m/s², whatever its mass: Galileo’s insight, which Apollo 15’s David Scott demonstrated on the Moon in 1971 by dropping a hammer and a feather. Einstein’s equivalence principle (1907) says a uniform gravitational field feels exactly like acceleration, so ‘the floor turns’ is what a turning spaceship would feel like.' },
  'law:duality': { first: 'My shots spread out like ripples.', obs: { waves: ['My bullets became spreading waves.', 'seen'], through: ['Each wave passes through and hits several enemies.', 8] }, hyp: 'My shots are waves and particles at once.', concl: 'Wave–particle duality.', foot: 'Louis de Broglie’s 1924 thesis proposed that every particle has a wavelength, λ = h/p. Davisson and Germer confirmed it in 1927 by bouncing electrons off a nickel crystal. Light works the other way round: a wave that arrives in particles (photons, Einstein 1905). Which behaviour you see depends on the experiment you set up: Bohr called it complementarity.' },
  'law:vacuum': { first: 'Things appeared out of empty space.', obs: { pairs: ['Particle pairs pop out of nothing and fly apart.', 'seen'], meet: ['They come back together and explode.', 8], real: ['Kill one and the other becomes real.', 20] }, hyp: 'Empty space borrows energy and pays it back.', concl: 'Vacuum fluctuations.', foot: 'The energy–time relation ΔE·Δt ≥ ℏ/2 is often read as ‘the vacuum can borrow energy for a short time’. That is a picture, not a precise mechanism, but the vacuum’s effects are real: the Lamb shift (1947), the Casimir force, and the electron’s magnetic moment, where theory and experiment agree to about one part in a trillion.' },
  'law:pauli': { first: 'A countdown, then the whole arena flipped.', obs: { gate: ['Every few seconds a gate hits the universe.', 'seen'], xz: ['X mirrors the arena; Z reverses every bullet.', 10], y: ['Y does both at once.', 25] }, hyp: 'The universe is being operated on like a qubit.', concl: 'Pauli gates: the basic moves of quantum computing.', foot: 'Wolfgang Pauli introduced his matrices in 1927 to describe electron spin. X is the quantum NOT gate (it swaps |0⟩ and |1⟩), Z flips the sign of |1⟩ (a phase flip), and Y does both, up to a factor of i. Every single-qubit operation can be built from them and rotations. Quantum computers spend much of their effort catching and undoing accidental X and Z flips (error correction).' },
  'law:propertime': { first: 'When I moved, the world sped up.', obs: { fast: ['The faster I move, the faster enemies and bullets move.', 'seen'], still: ['Standing still slows everything down. γ shows the factor.', 8] }, hyp: 'Time passes differently for me and for them.', concl: 'Proper time: every observer has their own clock.', foot: 'In special relativity a moving clock runs slow by γ = 1/√(1 − v²/c²) (Einstein, 1905). It matters every day: GPS satellite clocks run slow by about 7 microseconds a day from their speed and fast by about 45 from weaker gravity, and without correction positions would drift by kilometres a day. Here the effect is turned around for the game: your speed speeds up everyone else.' },
  'law:superpos': { first: 'Each enemy came with copies.', obs: { copies: ['Each enemy has two or three copies, marked 1/2 or 1/3.', 'seen'], real: ['Only one copy is real. Shooting a copy reveals whether it was.', 8] }, hyp: 'They are in superposition too.', concl: 'Superposition, applied to the enemies.', foot: 'The Born rule (Max Born, 1926): the probability of finding a system in a state is the square of its amplitude, P = |⟨ψ|φ⟩|². Born first wrote the probability without the square, and added the correction in a footnote while the paper was in proof. It won him the 1954 Nobel Prize.' },
  'law:uncertainty': { first: 'When I moved, the enemies blurred.', obs: { blur: ['Moving blurs where enemies are.', 'seen'], still: ['Standing still makes where they are going unpredictable.', 8] }, hyp: 'I cannot know both where they are and where they are going.', concl: 'Heisenberg’s uncertainty principle.', foot: 'Heisenberg (1927): position and momentum cannot both be sharp, Δx·Δp ≥ ℏ/2. It is not about clumsy instruments; it comes from waves themselves (a wave squeezed into one place has no single wavelength). It also explains why atoms do not collapse: squeezing an electron onto the nucleus would give it a huge momentum, and so a huge energy.' },
  'law:manyworlds': { first: 'Cats I lost kept fighting.', obs: { ghosts: ['Lost cats keep firing for a few seconds from a parallel timeline.', 'seen'], two: ['Two ghost cats fight beside me.', 8] }, hyp: 'Every branch still exists. I only see one.', concl: 'The many-worlds interpretation.', foot: 'Hugh Everett III proposed it in his 1957 thesis: the wavefunction never collapses, and every outcome happens in its own branch. It was mostly ignored until Bryce DeWitt popularised it in the 1970s. It needs no collapse and no special role for observers, at the price of an endlessly branching universe. No experiment has yet been found that could tell it apart from the other interpretations.' },
  'law:perpetual': { first: 'Bullets stopped leaving.', obs: { bounce: ['Enemy bullets bounce off the walls instead of leaving.', 'seen'], fill: ['The arena fills up.', 10] }, hyp: 'Nothing runs down.', concl: 'A world without the second law.', foot: 'The second law of thermodynamics (Clausius, 1850s): the entropy of a closed system never decreases, so no machine can run forever without a source of energy. Patent offices routinely reject perpetual-motion machines unless the inventor brings a working model. Maxwell’s demon was the most famous attempt to cheat the law (see its page).' },
  'law:coulomb': { first: 'Some bullets swerved toward me, others away.', obs: { charge: ['Every enemy bullet is charged.', 'seen'], redblue: ['Red ones are pushed away from my cats; blue ones are pulled in.', 8] }, hyp: 'Like charges repel, unlike charges attract.', concl: 'Coulomb’s law: F = kq₁q₂/r².', foot: 'Charles-Augustin de Coulomb measured the force with a torsion balance in 1785. The electric force between two protons is about 10³⁶ times their gravitational pull, which is why gravity only wins for huge, neutral things like planets. Both are inverse-square laws for the same reason: a force spreading out over the surface of a sphere.' },
  'law:hubble': { first: 'Bullets sped up the longer they flew.', obs: { speed: ['Enemy bullets keep accelerating.', 'seen'], far: ['Shots from far away arrive fast.', 8] }, hyp: 'Space itself is stretching.', concl: 'Hubble expansion: the further away, the faster.', foot: 'Georges Lemaître (1927) and Edwin Hubble (1929), building on Vesto Slipher’s measurements, found that distant galaxies recede faster: v = H₀d. Space itself is expanding; galaxies are not flying through it. In 1998 two teams found the expansion is speeding up (Nobel Prize 2011), driven by ‘dark energy’. Measurements of H₀ currently disagree: the ‘Hubble tension’.' },
  'law:slowlight': { first: 'Enemies appeared where they had been, not where they were.', obs: { lag: ['Far-away enemies lag behind.', 'seen'], ring: ['A dotted ring marks where each one really is.', 8] }, hyp: 'Light takes time to arrive.', concl: 'Finite light speed: I see the past.', foot: 'Ole Rømer measured light’s finite speed in 1676 from the timing of Jupiter’s moon Io. Sunlight is about 8 minutes old when it reaches you; the light from the Andromeda galaxy left 2.5 million years ago. In 1999 Lene Hau’s team slowed light to 17 m/s in an ultracold gas, slower than a bicycle.' },
  'law:newton3': { first: 'Firing pushed me backwards.', obs: { push: ['Every shot pushes me back.', 'seen'], drift: ['Nothing slows me down: I drift until I push the other way.', 8] }, hyp: 'Every action has an equal and opposite reaction.', concl: 'Newton’s third law, with no friction.', foot: 'Newton’s Principia (1687): forces come in pairs, F₁₂ = −F₂₁. It is why rockets work in empty space: they push exhaust back and the exhaust pushes them forward. In 1920 the New York Times mocked Robert Goddard for thinking a rocket could work in a vacuum; it printed a correction on 17 July 1969, while Apollo 11 was on its way to the Moon.' },
  'law:symmetry': { first: 'Everything rolled into a ring around the centre.', obs: { trough: ['A trough runs around the arena; everything rolls into it.', 'seen'], drift: ['Things drift along the trough.', 8] }, hyp: 'The centre is balanced but unstable; any push sends things to the ring.', concl: 'A Mexican-hat potential: symmetric laws, lopsided outcome.', foot: 'V(φ) = −μ²|φ|² + λ|φ|⁴ is shaped like a sombrero: the top is symmetric but unstable, so the field rolls into the brim and picks one direction. This is how the Higgs field gives particles mass (1964), and how a magnet picks its north pole as it cools. Yoichiro Nambu shared the 2008 Nobel Prize for bringing the idea into particle physics.' },
  'law:casimir': { first: 'Metal plates closed in from the sides.', obs: { plates: ['Plates squeeze in from left and right.', 'seen'], bounce: ['Bullets bounce off them, and they push me along.', 8], shed: ['When fully closed they shed sheets of bullets.', 20] }, hyp: 'Empty space pushes the plates together.', concl: 'The Casimir effect.', foot: 'Hendrik Casimir predicted in 1948 that two uncharged metal plates in a vacuum attract each other: fewer vacuum fluctuations fit between them than outside. The force grows as 1/a⁴, so it only matters at tiny gaps. Steve Lamoreaux measured it accurately in 1997. Engineers of microscopic machines have to design around it, because it makes tiny parts stick.' },
  'law:exclusion': { first: 'Enemy bullets refused to overlap.', obs: { lattice: ['Enemy bullets push each other apart into lattices.', 'seen'], enemies: ['Enemies of the same kind refuse to overlap too.', 8], bosons: ['My cats ignore it.', 20] }, hyp: 'No two of them can be in the same state.', concl: 'Pauli exclusion: fermions cannot share a state. My cats are bosons.', foot: 'Pauli (1925): no two fermions (electrons, protons, neutrons) can occupy the same quantum state. It is why atoms have shells, why chemistry exists and why you do not sink through the floor. It also holds up white dwarfs and neutron stars against gravity. Bosons (photons, and here, cats) can pile into one state; lasers and Bose–Einstein condensates depend on it.' },
  'law:wormhole': { first: 'Coloured rings appeared in pairs.', obs: { pairs: ['Wormholes come in pairs of the same colour.', 'seen'], through: ['Whatever enters one comes out of its twin, still moving the same way.', 8], jump: ['They jump to new places every fifteen seconds.', 20] }, hyp: 'Shortcuts through space.', concl: 'Einstein–Rosen bridges, made crossable for the game.', foot: 'Einstein and Rosen found ‘bridges’ between two regions of spacetime in 1935, the same year as the EPR paper on entanglement. Real ones would pinch shut too quickly to cross; holding one open would need ‘exotic’ negative energy (Morris and Thorne, 1988). Maldacena and Susskind’s 2013 conjecture ‘ER = EPR’ suggests wormholes and entanglement may be two views of the same thing.' },
  'law:doppler': { first: 'Bullets coming at me turned blue and fast.', obs: { blue: ['Bullets heading at my cats speed up and turn blue.', 'seen'], red: ['Bullets moving away slow down and turn red.', 8] }, hyp: 'Motion shifts colour.', concl: 'The relativistic Doppler effect.', foot: 'Christian Doppler (1842) predicted that motion shifts frequency, which is why a passing siren drops in pitch. Light coming toward you shifts bluer and light going away redder: f′ = f√((1 + β)/(1 − β)) for head-on motion. Redshifts of distant galaxies revealed the expanding universe; police radar and Doppler ultrasound use the same effect.' },
  // ===== space weather =====
  'event:meteors': { first: 'Rocks from the sky.', obs: { lines: ['Each meteor is announced by a dashed line.', 'seen'], side: ['They come from one side at a time.', 6] }, hyp: 'Debris falling in from one direction.', concl: 'A meteor shower.', foot: 'Meteor showers happen when Earth crosses the dust trail of a comet: the Perseids every August come from comet Swift–Tuttle. All the meteors seem to start from one point in the sky (the radiant) because they travel in parallel, the same perspective trick that makes railway lines meet at the horizon.' },
  'event:eclipse': { first: 'The lights went out.', obs: { dark: ['Enemies hide in the dark; their bullets still glow.', 'seen'], circle: ['Only a circle around me stays lit.', 6] }, hyp: 'Something passed in front of the light.', concl: 'An eclipse.', foot: 'In a total solar eclipse the Moon exactly covers the Sun, by coincidence: the Sun is about 400 times wider and about 400 times further away. In 1919 Arthur Eddington used an eclipse to measure starlight bending around the Sun, confirming general relativity and making Einstein famous overnight.' },
  'event:hole': { first: 'Something heavy fell into the arena.', obs: { falls: ['A black hole appears and starts to pull.', 'seen'], leaves: ['Small ones evaporate; others move on after half a minute.', 15] }, hyp: 'Not every black hole stays put.', concl: 'A visiting black hole. The black hole pages have the rest.', foot: 'Wandering black holes are expected: there may be a hundred million drifting through the Milky Way. In 2022 astronomers confirmed the first isolated one (OGLE-2011-BLG-0462) by how its gravity magnified a star behind it, an effect called microlensing.' },
  'event:gflip': { first: 'Gravity switched on, and then the floor turned.', obs: { on: ['Gravity switches on for twenty seconds.', 'seen'], turns: ['The floor turns 90° every few seconds.', 8] }, hyp: '‘Down’ is just the direction I am accelerating in.', concl: 'A gravity flip.', foot: 'Astronauts on the International Space Station float not because gravity is absent (up there it is still about 90% as strong as on the ground) but because they are falling around Earth all the time. Einstein’s equivalence principle says gravity and acceleration feel the same, so turning ‘down’ is the same as turning the room.' },
  'event:flare': { first: 'A wall of plasma swept across the arena.', obs: { wall: ['A wall of plasma crosses the arena with a gap in it.', 'seen'], gap: ['Get to the gap before it arrives.', 6] }, hyp: 'A burst of energy from a star.', concl: 'A solar flare.', foot: 'The biggest recorded solar storm, the Carrington Event of 1859, followed a flare: telegraph lines sparked and aurorae were seen near the equator. Flares release magnetic energy stored in the Sun’s corona. Satellites, power grids, and even quantum computers can be disturbed by the particles they fling our way.' },
  'event:supernova': { first: 'A star appeared, swelled, and exploded.', obs: { swell: ['A star swells, with a gap in its shell.', 'seen'], blast: ['When it goes, the shell blasts outward: be in the gap.', 6] }, hyp: 'A star at the end of its life.', concl: 'A supernova.', foot: 'A core-collapse supernova happens when a massive star runs out of fuel and its core collapses into a neutron star or black hole in about a second; the rebound blows off the outer layers. Supernova 1987A was the closest in centuries, and detectors caught 25 of its neutrinos hours before its light arrived. Many of the elements in you were made in explosions like it.' },
  'event:rays': { first: 'Lines flashed across the arena, then something fired along them.', obs: { lines: ['Fast particles streak through, each line flashing first.', 'seen'], aim: ['They land close to my cats, often in crossed pairs.', 6] }, hyp: 'Particles from deep space, moving very fast.', concl: 'Cosmic rays.', foot: 'Victor Hess discovered cosmic rays in 1912 by taking an electroscope up in a balloon: the radiation grew stronger with height (Nobel Prize 1936). Most are protons accelerated by exploding stars. In 2021 Google researchers found that a single cosmic-ray strike can cause a burst of errors across a whole superconducting quantum chip, one of the problems quantum error correction has to solve.' },
  // ===== black holes =====
  'hole:primordial': {
    first: 'A small black hole, glowing blue-white and hot.', need: 2,
    obs: { hot: ['Small, hot and fast-moving.', 'seen'], hawking: ['It radiates more and more as it gets smaller.'], shrink: ['Its mass keeps falling as it radiates.'], evaporate: ['It vanished in a final flash: evaporated.'], feed: ['Feeding it enemies made it heavier.'] },
    hyp: 'Black holes lose mass by radiating, and small ones lose it fastest.',
    concl: 'A primordial black hole: light enough to evaporate.',
    foot: 'Stephen Hawking (1974) showed black holes are not quite black: they glow with a temperature proportional to 1/M, so smaller holes are hotter, radiate faster and shrink faster, ending in a burst. The time to evaporate grows as M³. A real black hole of a few suns is colder than the cosmic microwave background and would last about 10⁶⁷ years; only holes lighter than a mountain, perhaps made in the early universe, could be evaporating now. The arena compresses these scales enormously.',
  },
  'hole:stellar': {
    first: 'A black hole of a few to a hundred suns.', need: 3,
    obs: { pull: ['It pulls everything nearby; enemies that fall in are destroyed.', 'seen'], feed: ['Swallowing things made it heavier (accretion).'], mass: ['Its mass is written beneath it, in suns.', 15] },
    hyp: 'The collapsed core of a massive star.',
    concl: 'A stellar-mass black hole.',
    foot: 'Stars of more than about 20 Suns can end as black holes. The first identified, Cygnus X-1 (1971), is about 21 solar masses and orbits a blue supergiant. Kip Thorne bet Stephen Hawking it really was a black hole; Hawking conceded in 1990. Gravitational-wave detectors have since found around a hundred merging pairs.',
  },
  'hole:intermediate': {
    first: 'A heavy, slow black hole. It fires jets.', need: 3,
    obs: { slow: ['Slow to change direction, and it pulls hard.', 'seen'], jets: ['It fires jets from both poles after a warning.'], feed: ['Feeding barely changes its mass.'] },
    hyp: 'The heavier the hole, the slower and more violent.',
    concl: 'An intermediate-mass black hole: 100 to 100,000 suns.',
    foot: 'Intermediate black holes are the missing link between stellar and supermassive ones, and hard to find. In 2019 the merger GW190521 joined holes of about 85 and 66 suns into one of about 142: the first clear intermediate-mass black hole, with roughly 8 suns’ worth of energy carried off as gravitational waves.',
  },
  'hole:supermassive': {
    first: 'An enormous black hole, made by merging.', need: 1,
    obs: { huge: ['Enormous, slow and heavy.', 'seen'], formed: ['It formed when two lighter holes merged.'], jets: ['Its jets are the widest of all.'] },
    hyp: 'The giants grow by merging and feeding.',
    concl: 'A supermassive black hole: over 100,000 suns.',
    foot: 'Almost every large galaxy has one at its centre. Ours, Sagittarius A*, is about 4.3 million suns; Andrea Ghez and Reinhard Genzel won the 2020 Nobel Prize for tracking the stars orbiting it. How the first ones grew so big so early is an open question: merging alone is probably too slow, so they must also feed on gas.',
  },
  'hole:merger': {
    first: 'Two black holes drifted together and began to spiral.', need: 2,
    obs: { attract: ['Two holes that pass near each other bend toward each other: the lighter one falls faster.'], inspiral: ['They spiral in faster and faster: the chirp.'], merger: ['They merge into one.'], massloss: ['The new hole is lighter than the two together. The missing mass left as gravitational waves.'], quiet: ['A small hole falling into a big one makes almost no wave.'], recoil: ['With unequal masses, the merged hole is kicked away: recoil.'], surf: ['I folded through a wave and came out the other side.'] },
    hyp: 'Mass is conserved when black holes merge.',
    wrong: 'It is not. Up to about 5% of the total mass turns into gravitational-wave energy (E = mc²).',
    concl: 'A black hole merger. The wave carries energy, and is loudest when the masses are equal.',
    foot: 'On 14 September 2015, LIGO detected GW150914: black holes of about 36 and 29 suns merged into one of about 62. The missing 3 suns’ worth of mass became gravitational waves, for an instant putting out more power than all the stars in the observable universe combined. Weiss, Barish and Thorne won the 2017 Nobel Prize. Unequal mergers recoil because the waves are emitted unevenly; with spinning holes, kicks of over 1,000 km/s are possible.',
  },
};
// titles and kinds come from the game's own tables
// every boss: summons are part of it, and a long fight teaches it its harder moves
for (const [id, src] of Object.entries(NOTE_SRC)) {
  if (!id.startsWith('boss:')) continue;
  if (['boss:observer', 'boss:slit', 'boss:bell', 'boss:apparatus'].includes(id)) src.obs.summon = ['Killing something it summoned took a slice of its health, straight through the armour.'];
  src.obs.adapt = ['After a long fight it started using moves I had not seen before. It learns.', '', 'opt'];
}
const NOTES = {};
for (const [id, src] of Object.entries(NOTE_SRC)) {
  const [kind, k] = id.split(':'), obs = {};
  for (const [key, v] of Object.entries(src.obs || {})) { const [t, on = 'hook', d] = v, num = typeof on === 'number'; obs[key] = { t, on: num ? 'time' : on || 'hook', at: num ? on : 0, diff: d || null }; }
  NOTES[id] = { ...src, id, kind, key: k, obs, need: src.need || (kind === 'law' ? 2 : kind === 'event' ? 2 : 0) };
}
function noteTitle(id) {
  const [kind, k] = id.split(':');
  if (kind === 'enemy') return ET[k] ? ET[k].info[0] : k;
  if (kind === 'boss') return BOSS_DEFS[k] ? BOSS_DEFS[k].name : k;
  if (kind === 'law') return LAWS[k] ? LAWS[k].name : k;
  if (kind === 'event') return EVENTS[k] ? EVENTS[k].name : k;
  if (kind === 'hole') return k === 'merger' ? 'Black hole mergers' : (HOLE_CLASS.find(c => c.id === k) || { name: k }).name.replace(/^./, c => c.toUpperCase()) + ' black holes';
  return k;
}
