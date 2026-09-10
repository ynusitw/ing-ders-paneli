export type Idiom = {
  phrase: string;
  meaning: string;
  example: string;
};

// Bekleme odasında dersin başlamasını beklerken gösterilen günün deyimi.
export const IDIOMS: Idiom[] = [
  {
    phrase: "Break the ice",
    meaning: "Buzları eritmek, ortamı yumuşatmak",
    example: "She told a joke to break the ice at the meeting.",
  },
  {
    phrase: "Piece of cake",
    meaning: "Çocuk oyuncağı, çok kolay",
    example: "Don't worry, this exam will be a piece of cake.",
  },
  {
    phrase: "Under the weather",
    meaning: "Kendini iyi hissetmemek, hasta olmak",
    example: "I'm feeling a bit under the weather today.",
  },
  {
    phrase: "Hit the books",
    meaning: "Ders çalışmaya başlamak",
    example: "I have to hit the books before the exam.",
  },
  {
    phrase: "Cost an arm and a leg",
    meaning: "Çok pahalıya mal olmak",
    example: "That new phone cost me an arm and a leg.",
  },
  {
    phrase: "Once in a blue moon",
    meaning: "Kırk yılda bir, çok nadiren",
    example: "We only eat out once in a blue moon.",
  },
  {
    phrase: "Better late than never",
    meaning: "Geç olsun güç olmasın",
    example: "He finally called back - better late than never.",
  },
  {
    phrase: "Let the cat out of the bag",
    meaning: "Sırrı ağzından kaçırmak",
    example: "I let the cat out of the bag about the surprise party.",
  },
  {
    phrase: "On the same page",
    meaning: "Aynı görüşte olmak, hemfikir olmak",
    example: "Let's make sure we're on the same page before we start.",
  },
  {
    phrase: "Practice makes perfect",
    meaning: "Çok çalışan mükemmelleşir",
    example: "Don't give up on your English - practice makes perfect.",
  },
  {
    phrase: "Speak of the devil",
    meaning: "İncir çekirdeğini doldurmaz, lafı olur",
    example: "Speak of the devil, here he comes now.",
  },
  {
    phrase: "Time flies",
    meaning: "Zaman su gibi akıp gidiyor",
    example: "Time flies when you're having fun.",
  },
];

export function randomIdiom(): Idiom {
  return IDIOMS[Math.floor(Math.random() * IDIOMS.length)];
}
