export type VerseOfTheWeek = {
  reference: string;
  text: string;
  theme: string;
};

// KJV is public domain. The UTC boundary keeps every WFICM surface consistent
// even when pages render in different environments around midnight Sunday.
export const VERSE_LIBRARY: readonly VerseOfTheWeek[] = [
  {
    reference: "Psalm 23:1",
    text: "The Lord is my shepherd; I shall not want.",
    theme: "Trust",
  },
  {
    reference: "Jeremiah 29:11",
    text: "For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end.",
    theme: "Hope",
  },
  {
    reference: "Philippians 4:13",
    text: "I can do all things through Christ which strengtheneth me.",
    theme: "Strength",
  },
  {
    reference: "Proverbs 3:5-6",
    text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
    theme: "Guidance",
  },
  {
    reference: "Isaiah 41:10",
    text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.",
    theme: "Courage",
  },
  {
    reference: "Romans 8:28",
    text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
    theme: "Faith",
  },
  {
    reference: "Psalm 46:1",
    text: "God is our refuge and strength, a very present help in trouble.",
    theme: "Peace",
  },
  {
    reference: "Matthew 11:28",
    text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
    theme: "Rest",
  },
  {
    reference: "Lamentations 3:22-23",
    text: "It is of the Lord's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.",
    theme: "Faithfulness",
  },
  {
    reference: "Psalm 37:4",
    text: "Delight thyself also in the Lord; and he shall give thee the desires of thine heart.",
    theme: "Delight",
  },
  {
    reference: "Joshua 1:9",
    text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest.",
    theme: "Courage",
  },
  {
    reference: "John 3:16",
    text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    theme: "Salvation",
  },
  {
    reference: "1 Corinthians 13:4-5",
    text: "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil.",
    theme: "Love",
  },
  {
    reference: "Psalm 34:8",
    text: "O taste and see that the Lord is good: blessed is the man that trusteth in him.",
    theme: "Goodness",
  },
  {
    reference: "Romans 12:12",
    text: "Rejoicing in hope; patient in tribulation; continuing instant in prayer.",
    theme: "Prayer",
  },
  {
    reference: "Psalm 119:105",
    text: "Thy word is a lamp unto my feet, and a light unto my path.",
    theme: "Guidance",
  },
  {
    reference: "Matthew 5:16",
    text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.",
    theme: "Service",
  },
  {
    reference: "Galatians 6:9",
    text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not.",
    theme: "Perseverance",
  },
  {
    reference: "Psalm 100:4",
    text: "Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.",
    theme: "Worship",
  },
  {
    reference: "Ephesians 2:8-9",
    text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.",
    theme: "Grace",
  },
  {
    reference: "2 Corinthians 5:17",
    text: "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.",
    theme: "Renewal",
  },
  {
    reference: "Psalm 27:1",
    text: "The Lord is my light and my salvation; whom shall I fear? the Lord is the strength of my life; of whom shall I be afraid?",
    theme: "Courage",
  },
  {
    reference: "Isaiah 40:31",
    text: "But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
    theme: "Renewal",
  },
  {
    reference: "Psalm 91:1-2",
    text: "He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty. I will say of the Lord, He is my refuge and my fortress: my God; in him will I trust.",
    theme: "Protection",
  },
  {
    reference: "Matthew 6:33",
    text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
    theme: "Priority",
  },
  {
    reference: "Hebrews 11:1",
    text: "Now faith is the substance of things hoped for, the evidence of things not seen.",
    theme: "Faith",
  },
  {
    reference: "Psalm 121:1-2",
    text: "I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the Lord, which made heaven and earth.",
    theme: "Help",
  },
  {
    reference: "John 14:27",
    text: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.",
    theme: "Peace",
  },
  {
    reference: "1 Peter 5:7",
    text: "Casting all your care upon him; for he careth for you.",
    theme: "Care",
  },
  {
    reference: "Psalm 55:22",
    text: "Cast thy burden upon the Lord, and he shall sustain thee: he shall never suffer the righteous to be moved.",
    theme: "Trust",
  },
  {
    reference: "Micah 6:8",
    text: "He hath shewed thee, O man, what is good; and what doth the Lord require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?",
    theme: "Service",
  },
  {
    reference: "Colossians 3:23",
    text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men.",
    theme: "Service",
  },
  {
    reference: "Psalm 118:24",
    text: "This is the day which the Lord hath made; we will rejoice and be glad in it.",
    theme: "Gratitude",
  },
  {
    reference: "2 Timothy 1:7",
    text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.",
    theme: "Courage",
  },
  {
    reference: "Psalm 19:14",
    text: "Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O Lord, my strength, and my redeemer.",
    theme: "Worship",
  },
  {
    reference: "James 1:5",
    text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.",
    theme: "Wisdom",
  },
  {
    reference: "Proverbs 16:3",
    text: "Commit thy works unto the Lord, and thy thoughts shall be established.",
    theme: "Guidance",
  },
  {
    reference: "Psalm 145:9",
    text: "The Lord is good to all: and his tender mercies are over all his works.",
    theme: "Goodness",
  },
  {
    reference: "Ephesians 4:32",
    text: "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you.",
    theme: "Forgiveness",
  },
  {
    reference: "Matthew 22:39",
    text: "And the second is like unto it, Thou shalt love thy neighbour as thyself.",
    theme: "Love",
  },
  {
    reference: "Psalm 103:2-3",
    text: "Bless the Lord, O my soul, and forget not all his benefits: Who forgiveth all thine iniquities; who healeth all thy diseases.",
    theme: "Mercy",
  },
  {
    reference: "Romans 15:13",
    text: "Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.",
    theme: "Hope",
  },
  {
    reference: "Psalm 16:8",
    text: "I have set the Lord always before me: because he is at my right hand, I shall not be moved.",
    theme: "Steadfastness",
  },
  {
    reference: "1 Thessalonians 5:16-18",
    text: "Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you.",
    theme: "Gratitude",
  },
  {
    reference: "Hebrews 13:8",
    text: "Jesus Christ the same yesterday, and to day, and for ever.",
    theme: "Faithfulness",
  },
  {
    reference: "Psalm 136:1",
    text: "O give thanks unto the Lord; for he is good: for his mercy endureth for ever.",
    theme: "Gratitude",
  },
  {
    reference: "John 8:12",
    text: "Then spake Jesus again unto them, saying, I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.",
    theme: "Light",
  },
  {
    reference: "Psalm 84:11",
    text: "For the Lord God is a sun and shield: the Lord will give grace and glory: no good thing will he withhold from them that walk uprightly.",
    theme: "Grace",
  },
  {
    reference: "1 John 4:19",
    text: "We love him, because he first loved us.",
    theme: "Love",
  },
  {
    reference: "Psalm 90:17",
    text: "And let the beauty of the Lord our God be upon us: and establish thou the work of our hands upon us; yea, the work of our hands establish thou it.",
    theme: "Purpose",
  },
  {
    reference: "Matthew 11:29",
    text: "Take my yoke upon you, and learn of me; for I am meek and lowly in heart: and ye shall find rest unto your souls.",
    theme: "Rest",
  },
  {
    reference: "Psalm 30:5",
    text: "Weeping may endure for a night, but joy cometh in the morning.",
    theme: "Hope",
  },
  {
    reference: "Romans 12:2",
    text: "And be not conformed to this world: but be ye transformed by the renewing of your mind.",
    theme: "Renewal",
  },
  {
    reference: "Psalm 150:6",
    text: "Let every thing that hath breath praise the Lord. Praise ye the Lord.",
    theme: "Worship",
  },
  {
    reference: "Numbers 6:24-26",
    text: "The Lord bless thee, and keep thee: The Lord make his face shine upon thee, and be gracious unto thee: The Lord lift up his countenance upon thee, and give thee peace.",
    theme: "Blessing",
  },
];

const EPOCH_SUNDAY_UTC = Date.UTC(2023, 0, 1);
const MILLISECONDS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function getSundayWeekKey(date: Date = new Date()): string {
  const sunday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());
  return sunday.toISOString().slice(0, 10);
}

export function getVerseOfTheWeek(date: Date = new Date()): VerseOfTheWeek {
  const weekKey = getSundayWeekKey(date);
  const weekStart = Date.parse(`${weekKey}T00:00:00.000Z`);
  const weekIndex = Math.floor(
    (weekStart - EPOCH_SUNDAY_UTC) / MILLISECONDS_PER_WEEK,
  );
  const verseIndex =
    ((weekIndex % VERSE_LIBRARY.length) + VERSE_LIBRARY.length) %
    VERSE_LIBRARY.length;
  return VERSE_LIBRARY[verseIndex];
}
