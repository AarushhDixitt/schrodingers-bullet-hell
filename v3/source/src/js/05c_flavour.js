// ---------- flavour: names for every cat, fake papers, silly titles, obituaries ----------
const CAT_FIRST = ('Mittens Biscuit Pickle Noodle Tofu Mochi Pumpkin Waffles Nugget Socks Pepper Ginger Smokey Shadow Whiskers Muffin Peanut Cleo Luna Milo Oliver Simba Nala Felix Tigger Oreo Pebbles Sushi Dumpling ' +
  'Bean Toast Crumpet Scone Marmalade Fig Olive Basil Clover Juniper Hazel Willow Maple Saffron Nutmeg Cinnamon Paprika Wasabi Miso Ramen Udon Gnocchi Pretzel Bagel Brioche Cookie Fudge Toffee Caramel Truffle ' +
  'Sprocket Widget Gizmo Pixel Byte Qubit Boson Fermion Quark Gluon Muon Photon Lepton Neutrino Positron Electron Proton Kelvin Joule Tesla Newton Hertz Ampere Planck Bohr Dirac Fermi Pauli Noether Curie Meitner Lovelace ' +
  'Hopper Turing Feynman Hawking Sagan Kepler Galileo Copernicus Tycho Halley Bessel Gauss Euler Laplace Lagrange Hilbert Riemann Ramanujan Noodles Doodle Wobble Bubbles Sprinkles Jellybean Gumdrop Marshmallow ' +
  'Tinkerbell Pudding Custard Butterscotch Licorice Sherbet Waffle Pancake Crouton Rigatoni Ravioli Zucchini Radish Turnip Parsnip Kale Chickpea Lentil Edamame Falafel Samosa Pakora Biryani Ladoo Jalebi Barfi').split(' ');
const CAT_TITLE = ['Dr.', 'Prof.', 'Sir', 'Dame', 'Captain', 'Lord', 'Baron', 'Duchess', 'Agent', 'Little', 'Old', 'Sergeant', 'Madame', 'Count', 'Reverend', 'Admiral'];
const CAT_SUR = ['von Whiskers', 'McFluff', 'de Broglie', 'Bohr-Purr', 'Heisenpurr', 'Paws', 'Mittensworth', 'of the Box', 'Fluffington', 'Clawford', 'Meowington', 'Tailsworth', 'Purrcival', 'Furbottom', 'Snugglesby', 'Nyanski', 'Catsby', 'Pawlowski'];
const CAT_SUF = ['III', 'Jr.', 'the Uncertain', 'the Superposed', 'PhD', 'the Unobserved', 'II', 'Esq.', 'the Entangled', 'of No Fixed Position'];
// what took a cat, in a word or two (for the feed)
const CAUSE_SHORT = { bullet: 'bullet', laser: 'laser', spaghettified: 'black hole', annihilation: 'antimatter', poison: 'poison', 'gravitational wave': 'gravitational wave', 'polar jet': 'polar jet', 'solar flare': 'solar flare', 'cosmic ray': 'cosmic ray', verdict: 'the Verdict', pulsar: 'pulsar', 'quasar jet': 'quasar jet' };
const Flavour = {
  name(full) {
    const f = pick(CAT_FIRST);
    if (!full) return f + (chance(0.08) ? ' ' + pick(['II', 'III', 'IV', 'Jr.']) : '');
    return (chance(0.6) ? pick(CAT_TITLE) + ' ' : '') + f + ' ' + pick(CAT_SUR) + (chance(0.4) ? ' ' + pick(CAT_SUF) : '');
  },
  journal: () => pick(['Phys. Rev. Lett.', 'Nature (Physics)', 'J. Feline Phys.', 'Ann. Box Studies', 'Proc. R. Soc. Cats', 'Quant. Purr. Rev.', 'arXiv (unrefereed)', 'Rev. Mod. Mews.']),
  // a fake abstract for the paper you publish after beating a boss
  abstract(boss, st) {
    const n = st.maxBranches, t = fmtTime(st.time), lead = {
      observer: 'We report the first experimental evidence that an observer can itself be collapsed.',
      laplace: 'We demonstrate that a sufficiently confused cat violates Laplacian determinism.',
      maxwell: 'We show that Maxwell’s demon can be defeated by making it forget, at a cost of exactly kT ln 2 per bit.',
      die: 'We find that God does play dice, and that the dice can be shot.',
      slit: 'We report that a cat passed through both slits and then came back for the gun.',
      threebody: 'We present a closed-form solution to the three-body problem: shoot all three.',
      oscillator: 'We drive a harmonic oscillator to its ground state, permanently.',
      cyclotron: 'We demonstrate that a cyclotron cannot accelerate a particle that refuses to stay in one place.',
      apparatus: 'We open the box. The cat is alive. We consider the matter closed.',
    }[boss] || 'We report a result.';
    return `${lead} The subject reached ${n} simultaneous position${n === 1 ? '' : 's'} and survived ${st.survived} measurement${st.survived === 1 ? '' : 's'} with combined odds of ${fmtOddsLog(st.log10p)}. ${pick(['Results were not reproducible.', 'Reviewer 2 remains unconvinced.', 'Further funding is requested.', 'No cats were harmed in this timeline.', 'The authors declare a conflict of interest: they are the cat.', 'Error bars have been omitted for morale.'])} (${t} in the box.)`;
  },
  // the title of the paper a whole run produces
  title(st, outcome, wave, cause) {
    const how = { bullet: 'Projective Measurement', laser: 'Coherent Light', spaghettified: 'Spaghettification', poison: 'Cyanide', annihilation: 'Antimatter', 'gravitational wave': 'Spacetime Ripples' }[cause] || 'Peer Review';
    return outcome === 'win'
      ? pick([`The Box Is Open: Evidence for a Living Cat After ${fmtTime(st.time)}`, `On the Survival of a Feline Through Nine Suspended Laws`, `Observation of a Macroscopic Cat in ${st.maxBranches} Places at Once, and Other Results`])
      : pick([`On the ${how} of Felines in Wave ${wave}`, `A Null Result: ${how} Is Bad for Cats`, `Toward a Theory of ${how}, as Experienced by a Cat`, `${st.maxBranches} Cats, One Outcome: ${how} in Wave ${wave}`, `Why the Cat Died (Wave ${wave}): A ${how} Study`]);
  },
};
