// ---------- flavour: names for every cat, fake papers, silly titles, obituaries ----------
const CAT_FIRST = [...new Set(('Mittens Biscuit Pickle Noodle Tofu Mochi Pumpkin Waffles Nugget Socks Pepper Ginger Smokey Shadow Whiskers Muffin Peanut Cleo Luna Milo Oliver Simba Nala Felix Tigger Oreo Pebbles Sushi Dumpling ' +
  'Bean Toast Crumpet Scone Marmalade Fig Olive Basil Clover Juniper Hazel Willow Maple Saffron Nutmeg Cinnamon Paprika Wasabi Miso Ramen Udon Gnocchi Pretzel Bagel Brioche Cookie Fudge Toffee Caramel Truffle ' +
  'Sprocket Widget Gizmo Pixel Byte Qubit Boson Fermion Quark Gluon Muon Photon Lepton Neutrino Positron Electron Proton Kelvin Joule Tesla Newton Hertz Ampere Planck Bohr Dirac Fermi Pauli Noether Curie Meitner Lovelace ' +
  'Hopper Turing Feynman Hawking Sagan Kepler Galileo Copernicus Tycho Halley Bessel Gauss Euler Laplace Lagrange Hilbert Riemann Ramanujan Noodles Doodle Wobble Bubbles Sprinkles Jellybean Gumdrop Marshmallow ' +
  'Tinkerbell Pudding Custard Butterscotch Licorice Sherbet Waffle Pancake Crouton Rigatoni Ravioli Zucchini Radish Turnip Parsnip Kale Chickpea Lentil Edamame Falafel Samosa Pakora Biryani Ladoo Jalebi Barfi ' +
  'Bose Raman Saha Chandrasekhar Bhabha Sarabhai Mahalanobis Sudarshan Raychaudhuri Kalam Visvesvaraya Aryabhata Bhaskara Brahmagupta Yukawa Tomonaga Nambu Hideki Wu Yang Lee Chu Abdus Salam Alhazen Biruni Khayyam Tusi ' +
  'Noether Franklin Goeppert Rubin Leavitt Cannon Burnell Hypatia Somerville Herschel Lovelace Hodgkin Lonsdale Ride Jemison Sklodowska Mirzakhani Germain Kovalevskaya Agnesi Chatelet Ghez Strickland Wiesner ' +
  'Schrodinger Heisenberg Born Jordan Wigner Everett Bell Aspect Zeilinger Clauser Shor Grover Deutsch Bennett Brassard Penrose Wheeler Gell-Mann Weinberg Glashow Higgs Englert Dyson Bethe Oppenheimer Lise Maxwell Faraday Boltzmann Gibbs Carnot Hubble Lemaitre Zwicky Bondi Hoyle Kip Thorne ' +
  'Chai Paratha Momo Idli Dosa Vada Pav Kulfi Rasgulla Gulab Halwa Poha Upma Khichdi Paneer Masala Chutney Papad Lassi Kheer Peda Modak Mango Guava Lychee Jamun Coconut Tamarind Cardamom Clove Fennel Cumin Mustard ' +
  'Biscotti Churro Taco Nacho Burrito Tamale Empanada Gyoza Bao Wonton Kimchi Bibimbap Onigiri Tempura Matcha Boba Taro Yuzu Sesame Kiwi Plum Peach Apricot Damson Quince Cherry Berry Blueberry Cranberry Pistachio Cashew Almond Walnut Pecan Hazelnut Acorn ' +
  'Button Zipper Pocket Thimble Teacup Kettle Spoon Sock Slipper Mitten Scarf Beanie Sneaker Pillow Blanket Duvet Doily Teapot Crayon Pencil Eraser Sticker Marble Domino Yo-yo Kazoo Banjo Ukulele Piccolo Bongo Tuba Pickles Sardine Anchovy Kipper Tuna Salmon Haddock Shrimp Prawn Squid ' +
  'Comet Nebula Quasar Pulsar Nova Orbit Zenith Nadir Eclipse Aurora Cosmo Astro Rocket Sputnik Apollo Gemini Voyager Kepler-22b Hubble Cassini Rosetta Juno Chandrayaan Mangalyaan Aditya Vikram Pragyan Tachyon Axion Graviton Gluino Anyon Polaron Phonon Magnon Exciton Plasmon Skyrmion Soliton Instanton Spinor Tensor Vector Scalar Eigen Ket Bra Hamilton Lagrangian Fourier Laplacian Jacobi Hessian').split(' '))];
const CAT_TITLE = ['Dr.', 'Prof.', 'Sir', 'Dame', 'Captain', 'Lord', 'Baron', 'Duchess', 'Agent', 'Little', 'Old', 'Sergeant', 'Madame', 'Count', 'Reverend', 'Admiral'];
const CAT_SUR = ['von Whiskers', 'McFluff', 'de Broglie', 'Bohr-Purr', 'Heisenpurr', 'Paws', 'Mittensworth', 'of the Box', 'Fluffington', 'Clawford', 'Meowington', 'Tailsworth', 'Purrcival', 'Furbottom', 'Snugglesby', 'Nyanski', 'Catsby', 'Pawlowski',
  'Schrödinpurr', 'Planckton', 'Diracpaw', 'Feynmeow', 'Paulicat', 'Fermikins', 'Bosecat', 'Ramanpaw', 'Sahamew', 'Chandrapurr', 'Bhabhakins', 'Noetherpaw', 'Curiemew', 'Meitnerpurr', 'Wignerwhisk', 'Everettail', 'Bellwhisker', 'Hilbertail',
  'of Copenhagen', 'of Many Worlds', 'of the Lab', 'of Bengaluru', 'of Kolkata', 'of Göttingen', 'of Cambridge', 'of CERN', 'of the Hadron Collider', 'of Low Entropy', 'of the Event Horizon', 'of Fixed Spin',
  'Nyankovic', 'Purrington', 'Whiskerton', 'Pawsley', 'Mewman', 'Clawsworth', 'Katzenberg', 'Billetail', 'Furrier', 'Kittington', 'Nekomura', 'Pawdhuri', 'Billiwhisk', 'Mewton', 'Purrandi', 'Furgusson'];
const CAT_SUF = ['III', 'Jr.', 'the Uncertain', 'the Superposed', 'PhD', 'the Unobserved', 'II', 'Esq.', 'the Entangled', 'of No Fixed Position'];
// what took a cat, in a word or two (for the feed)
const CAUSE_SHORT = { bullet: 'bullet', laser: 'laser', spaghettified: 'black hole', annihilation: 'antimatter', poison: 'poison', 'gravitational wave': 'gravitational wave', 'polar jet': 'polar jet', 'solar flare': 'solar flare', 'cosmic ray': 'cosmic ray', verdict: 'the Verdict', pulsar: 'pulsar', 'quasar jet': 'quasar jet' };
const Flavour = {
  // names come from the lineage: veterans can return, and dead veterans' names pass down with a numeral
  name(full) { return Lineage.name(full); },
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
      bell: 'We report a loophole-free violation of the CHSH inequality by a cat, with S = 2√2 within error.',
      apparatus: 'We open the box. The cat is alive. We consider the matter closed.',
    }[boss] || 'We report a result.';
    return `${lead} The subject reached ${n} simultaneous position${n === 1 ? '' : 's'} and survived ${st.survived} measurement${st.survived === 1 ? '' : 's'} with combined odds of ${fmtOddsLog(st.log10p)}. ${pick(['Results were not reproducible.', 'Reviewer 2 remains unconvinced.', 'Further funding is requested.', 'No cats were harmed in this timeline.', 'The authors declare a conflict of interest: they are the cat.', 'Error bars have been omitted for morale.'])} (${t} in the box.)`;
  },
  // the title of the paper a whole run produces
  title(st, outcome, wave, cause) {
    const how = { bullet: 'Projective Measurement', laser: 'Coherent Light', spaghettified: 'Spaghettification', poison: 'Cyanide', annihilation: 'Antimatter', 'gravitational wave': 'Spacetime Ripples' }[cause] || 'Peer Review';
    return outcome === 'win'
      ? pick([`The Box Is Open: Evidence for a Living Cat After ${fmtTime(st.time)}`, `On the Survival of a Feline Through Ten Experiments`, `Observation of a Macroscopic Cat in ${st.maxBranches} Places at Once, and Other Results`])
      : pick([`On the ${how} of Felines in Wave ${wave}`, `A Null Result: ${how} Is Bad for Cats`, `Toward a Theory of ${how}, as Experienced by a Cat`, `${st.maxBranches} Cats, One Outcome: ${how} in Wave ${wave}`, `Why the Cat Died (Wave ${wave}): A ${how} Study`]);
  },
};
