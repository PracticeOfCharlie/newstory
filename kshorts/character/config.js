// All the look constants for the character in one place.
// Change colours here; geometry/texture code reads from these objects.

export const COLORS = {
  // skin & face
  skin: '#f8dcca',
  skinShade: '#eec3ad',
  nose: '#e3ab95',
  blush: '#f5a7a6',
  blushLine: '#e47c86',
  mouthLine: '#6a2630',
  mouthDark: '#5c1e2a',
  mouthIn: '#b84552',
  tongue: '#f08a8e',
  teeth: '#ffffff',

  // eyes
  lash: '#1f1519',
  lashLow: '#7c4440',
  iris0: '#2a1820', // top of iris (in shadow of the lid)
  iris1: '#5c3024',
  iris2: '#93512f',
  iris3: '#d39056', // bright lower rim
  pupil: '#170c10',
  white: '#ffffff',
  whiteShade: '#d9d3e6',
  brow: '#2b1f25',

  // hair
  hair: '#2c2230',
  hairDark: '#1a1320',
  hairLight: '#43354a',
  hairShine: '#75668a',

  // uniform
  blazer: '#22305a',
  blazerDark: '#172040',
  blazerLight: '#33467c',
  piping: '#c9a64a',
  shirt: '#f5f5f2',
  shirtShade: '#d5d8e2',
  cardigan: '#efe6cf',
  cardiganDark: '#d6c9a8',
  tieNavy: '#1e2748',
  tieRed: '#7e1f34',
  tieLight: '#a8324a',
  skirt: '#2b3557',
  skirtDark: '#1d2440',
  skirtLine: '#56668f',
  skirtLine2: '#9a3448',
  crest: '#c42a36',
  crestDark: '#7a1420',
  crestGold: '#e2bb4e',
  button: '#d8b04a',
  warmer: '#f4f1ea',
  warmerShade: '#d6d1c6',
  shoe: '#1b1b20',
  shoeLight: '#34343c',
  shoeSole: '#f2f2ee',
  shoeStripe: '#c03030',
  lace: '#f4f4f4',
  glasses: '#241a1e',
  lens: '#cfe0ef',
};

// Body proportions in metres. Origin is between the feet, +Z is her front, +X is her left.
// Feature toggles (can also be overridden per character: E.character({ glasses: false }))
export const OPTIONS = { glasses: true };

export const NAME = '츄리';

export const BODY = {
  headScale: 1.22,
  hipY: 0.86,          // hips pivot height in rest pose
  hipJointX: 0.085,
  hipJointY: -0.03,    // relative to hips pivot
  thigh: 0.39,
  shin: 0.38,
  ankleH: 0.065,
  waistY: 0.11,        // spine pivot relative to hips
  shoulderX: 0.152,
  shoulderY: 0.30,     // relative to spine pivot
  upperArm: 0.24,
  foreArm: 0.215,
  neckY: 0.335,        // relative to spine pivot
  neckLen: 0.035,
};
