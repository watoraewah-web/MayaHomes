const { parseLyrics, matchSectionLabel } = require("./tmp-test/parser.js");
const {
  buildSlides,
  buildWorshipSetSlides,
  replaceSlideSource,
  slideSizePx,
  slidePaddingPx,
  ptToPx,
  LINE_HEIGHT,
  minFontSize,
  sundayDateLabel,
} = require("./tmp-test/slides.js");
const { DEFAULT_SETTINGS, normalizeSettings } = require("./tmp-test/types.js");
const { measureTextWidth } = require("./tmp-test/textMeasure.js");
const { generatePowerPoint } = require("./tmp-test/pptx.js");
const fs = require("fs");

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log(`PASS  ${name}`);
  else {
    failures++;
    console.log(
      `FAIL  ${name}${detail !== undefined ? " -> " + JSON.stringify(detail) : ""}`,
    );
  }
}

const S = (over = {}) => ({ ...DEFAULT_SETTINGS, ...over });

/* ===== 1. THE REPORTED BUG: one word per line ===== */
const testLyrics = `Verse 1

No place I'd rather be
No place I'd rather be
No place I'd rather be
Than here in Your love, here in Your love`;

const sections = parseLyrics(testLyrics);
check(
  "test case parses to 1 verse section",
  sections.length === 1 && sections[0].section_label === "Verse 1",
);

const slides = buildSlides(sections, S());
const allLines = slides.flatMap((s) => s.lines);
check(
  "no one-word lines",
  allLines.every((l) => l.trim().split(/\s+/).length !== 1 || l.length > 14),
  allLines,
);
check(
  "first line natural",
  allLines[0] === "No place I'd rather be",
  allLines[0],
);
check(
  "long line wraps at word boundary",
  allLines.some((l) => l.startsWith("Than here in Your love")),
  allLines,
);
check(
  "no words broken mid-word",
  allLines.join(" ").includes("here in Your love"),
  allLines,
);

// Every visual line must actually fit the usable width
{
  const settings = S();
  const { width: W } = slideSizePx(settings.aspectRatio);
  const pad = slidePaddingPx(settings.aspectRatio);
  const usable = W - pad.x * 2;
  const ok = slides.every((sl) =>
    sl.lines.every(
      (l) =>
        measureTextWidth(
          l,
          settings.fontFamily,
          settings.fontWeight,
          ptToPx(sl.fontSize),
        ) <= usable,
    ),
  );
  check("all visual lines fit usable width", ok);
}

/* ===== 2. Original line breaks preserved ===== */
{
  const s2 = parseLyrics(
    "Amazing grace, how sweet the sound\nThat saved a wretch like me",
  );
  const sl2 = buildSlides(s2, S());
  check(
    "two semantic lines stay two lines",
    sl2[0].lines.length === 2,
    sl2[0].lines,
  );
  check(
    "order preserved",
    sl2[0].lines[0].startsWith("Amazing grace") &&
      sl2[0].lines[1].startsWith("That saved"),
  );
}

/* ===== 3. Long single line wraps ===== */
{
  const long =
    "This is an extremely long lyric line that goes on and on and will certainly need to be wrapped across multiple visual lines to fit the width of the presentation slide";
  const sl = buildSlides(
    [{ section_type: "verse", section_label: "V", content: long }],
    S({ maxLinesPerSlide: 4 }),
  );
  const joined = sl.map((s) => s.lines.join(" ")).join(" ");
  check("long line wrapped, not truncated", joined === long, joined);
  check(
    "long line produces multiple visual lines",
    sl.reduce((n, s) => n + s.lines.length, 0) > 1,
  );
  check(
    "long line word-boundary wrap",
    sl[0].lines.every((l) => long.includes(l) || l === long),
  );
}

/* ===== 4. Slide splitting: many lines split into multiple slides ===== */
{
  const content = [
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
  ].join("\n");
  const pastedWithSpacing = parseLyrics(
    `Verse 1\n\n${content.replace(/\n/g, "\n\n")}`,
  );
  check(
    "spaced pasted lyrics stay one section",
    pastedWithSpacing.length === 1 &&
      pastedWithSpacing[0].content.includes("eight"),
  );
  const sl = buildSlides(
    [{ section_type: "verse", section_label: "V", content }],
    S({ maxLinesPerSlide: 4 }),
  );
  check(
    "8 lines split by max 4 -> 2 slides",
    sl.length === 2,
    sl.map((s) => s.lines),
  );
  check(
    "no lines lost in split",
    sl.flatMap((s) => s.lines).join("|") ===
      "one|two|three|four|five|six|seven|eight",
  );
  check(
    "slide counters set",
    sl[0].totalSlidesInSection === 2 && sl[1].slideNumberInSection === 2,
  );

  const sixLineSlides = buildSlides(
    [
      {
        section_type: "verse",
        section_label: "V",
        content: ["one", "two", "three", "four", "five", "six"].join("\n"),
      },
    ],
    S({ maxLinesPerSlide: 4 }),
  );
  check(
    "6 lines balance to 3 + 3 when they fit",
    sixLineSlides.length === 2 &&
      sixLineSlides[0].lines.length === 3 &&
      sixLineSlides[1].lines.length === 3,
    sixLineSlides.map((s) => s.lines),
  );
}

/* ===== 5. Auto-fit reduces font before splitting when possible ===== */
{
  // 5 semantic lines but maxLines 4: engine should still fit them by reducing font
  const content = [
    "alpha line",
    "beta line",
    "gamma line",
    "delta line",
    "epsilon line",
  ].join("\n");
  const sl = buildSlides(
    [{ section_type: "verse", section_label: "V", content }],
    S({ maxLinesPerSlide: 5, fontSize: 36 }),
  );
  check(
    "5 short lines fit on one slide",
    sl.length === 1,
    sl.map((s) => s.lines),
  );
  check(
    "font reduced to fit (>= floor)",
    sl[0].fontSize >= minFontSize(36) && sl[0].fontSize <= 36,
    sl[0].fontSize,
  );
}

/* ===== 6. Font floor respected ===== */
{
  const many = Array.from({ length: 10 }, (_, i) => `lyric line ${i + 1}`).join(
    "\n",
  );
  const sl = buildSlides(
    [{ section_type: "verse", section_label: "V", content: many }],
    S({ maxLinesPerSlide: 10, fontSize: 40 }),
  );
  check(
    "font never below floor",
    sl.every((s) => s.fontSize >= minFontSize(40)),
    sl.map((s) => s.fontSize),
  );
  check(
    "overflow splits to extra slides when floor reached",
    sl.every((s) => s.lines.length <= 10),
  );
}

/* ===== 7. Repeated choruses preserved ===== */
{
  const repeated = `Verse 1\naaa\n\nChorus\nccc\n\nVerse 2\nbbb\n\nChorus\nccc\n\nBridge\nddd\n\nChorus\nccc`;
  const p = parseLyrics(repeated);
  const labels = p.map((s) => s.section_label);
  check(
    "repeated chorus order preserved",
    labels.join("|") === "Verse 1|Chorus|Verse 2|Chorus|Bridge|Chorus",
    labels,
  );
  const sl = buildSlides(p, S());
  check(
    "all 6 sections produce slides in order",
    sl.length === 6 &&
      sl.map((s) => s.sectionLabel).join("|") === labels.join("|"),
  );

  const duplicateVerses = buildSlides(
    [
      {
        section_type: "verse",
        section_label: "Verse 1",
        content: "same first line\nsame second line",
      },
      {
        section_type: "verse",
        section_label: "Verse 2",
        content: " SAME FIRST LINE \nSAME SECOND LINE",
      },
      {
        section_type: "chorus",
        section_label: "Chorus",
        content: "same first line\nsame second line",
      },
    ],
    S(),
  );
  check(
    "duplicate verse content is rendered once",
    duplicateVerses.filter((s) => s.sectionType === "verse").length === 1,
  );
  check(
    "repeated chorus content remains rendered",
    duplicateVerses.some((s) => s.sectionType === "chorus"),
  );
}

/* ===== 8. Parser variations ===== */
{
  check(
    "[Verse 1] recognized",
    matchSectionLabel("[Verse 1]")?.type === "verse",
  );
  check("CHORUS recognized", matchSectionLabel("CHORUS")?.type === "chorus");
  check("Verse 1: recognized", matchSectionLabel("Verse 1:")?.type === "verse");
  check(
    "PRE CHORUS recognized",
    matchSectionLabel("PRE CHORUS")?.type === "pre-chorus",
  );
  check(
    "Prechorus recognized",
    matchSectionLabel("Prechorus")?.type === "pre-chorus",
  );
  check("BRIDGE: recognized", matchSectionLabel("BRIDGE:")?.type === "bridge");
  check(
    "ordinary line not a label",
    matchSectionLabel("No place I'd rather be") === null,
  );
  check(
    "uppercase lyric line not a label",
    matchSectionLabel("HOW GREAT THOU ART") === null,
  );
  const p = parseLyrics(
    "[Verse 1]\nline a\n[CHORUS]\nline c\nPRE CHORUS\nline p\nBridge:\nline b\nprechorus\nline q",
  );
  check(
    "mixed variations parse",
    p.length === 5 &&
      p.map((s) => s.section_type).join("|") ===
        "verse|chorus|pre-chorus|bridge|pre-chorus",
    p.map((s) => s.section_label),
  );
}

/* ===== 9. Editable preview source mapping + worship set composition ===== */
{
  const source = "first lyric\nsecond lyric\nthird lyric";
  const sourceSlides = buildSlides(
    [{ section_type: "verse", section_label: "Verse 1", content: source }],
    S({ maxLinesPerSlide: 2 }),
  );
  const edited = replaceSlideSource(
    source,
    sourceSlides[0],
    "corrected lyric\nsecond lyric",
  );
  check(
    "preview edit maps back to source lines",
    edited === "corrected lyric\nsecond lyric\nthird lyric",
    edited,
  );

  const withTitles = buildWorshipSetSlides(
    [
      {
        title: "Song A",
        artist: "Artist A",
        sections: [
          {
            section_type: "verse",
            section_label: "Verse 1",
            content: "A lyric",
          },
        ],
      },
      {
        title: "Song B",
        artist: "Artist B",
        sections: [
          {
            section_type: "chorus",
            section_label: "Chorus",
            content: "B lyric",
          },
        ],
      },
    ],
    S(),
    true,
  );
  check(
    "worship set keeps both songs in order",
    withTitles.some((s) => s.lines.includes("A lyric")) &&
      withTitles.some((s) => s.lines.includes("B lyric")) &&
      withTitles.findIndex((s) => s.songTitle === "Song A") <
        withTitles.findIndex((s) => s.songTitle === "Song B"),
  );
  const withoutTitles = buildWorshipSetSlides(
    [
      {
        title: "Song A",
        sections: [
          {
            section_type: "verse",
            section_label: "Verse 1",
            content: "A lyric",
          },
        ],
      },
      {
        title: "Song B",
        sections: [
          {
            section_type: "chorus",
            section_label: "Chorus",
            content: "B lyric",
          },
        ],
      },
    ],
    S(),
    false,
  );
  check(
    "title slides can be disabled without losing lyrics",
    withoutTitles.length > 0 &&
      withoutTitles.every((s) => !s.isSongTitle) &&
      withoutTitles.some((s) => s.lines.includes("A lyric")) &&
      withoutTitles.some((s) => s.lines.includes("B lyric")),
  );
}

/* ===== 10. Uncategorized kept, nothing lost ===== */
{
  const raw = "some free text\nmore text\n\nanother block\nof words";
  const p = parseLyrics(raw);
  check(
    "unlabeled -> uncategorized",
    p.every((s) => s.section_type === "uncategorized"),
  );
  const sl = buildSlides(p, S());
  const allText = sl.flatMap((s) => s.lines).join(" ");
  check(
    "no lyrics lost end-to-end",
    ["some free text", "more text", "another block", "of words"].every((t) =>
      allText.includes(t),
    ),
  );
}

/* ===== 11. Aspect ratios & section labels ===== */
{
  for (const ratio of ["16:9", "4:3"]) {
    const content =
      "No place I'd rather be\nThan here in Your love, here in Your love";
    for (const showLabel of [true, false]) {
      const sl = buildSlides(
        [{ section_type: "chorus", section_label: "Chorus", content }],
        S({ aspectRatio: ratio, showSectionLabel: showLabel, fontSize: 44 }),
      );
      const settings = S({ aspectRatio: ratio, showSectionLabel: showLabel });
      const { width: W, height: H } = slideSizePx(ratio);
      const pad = slidePaddingPx(ratio);
      const labelH = showLabel ? ptToPx(12) * LINE_HEIGHT + 16 : 0;
      const fitsWidth = sl.every((s) =>
        s.lines.every(
          (l) =>
            measureTextWidth(
              l,
              settings.fontFamily,
              settings.fontWeight,
              ptToPx(s.fontSize),
            ) <=
            W - pad.x * 2,
        ),
      );
      const fitsHeight = sl.every(
        (s) =>
          s.lines.length * ptToPx(s.fontSize) * LINE_HEIGHT <=
          H - pad.y * 2 - labelH,
      );
      check(`${ratio} label=${showLabel}: width fits`, fitsWidth);
      check(`${ratio} label=${showLabel}: height fits`, fitsHeight);
    }
  }
}

/* ===== 12. Different font sizes ===== */
{
  for (const size of [20, 28, 36, 48, 60, 72]) {
    const content =
      "No place I'd rather be\nNo place I'd rather be\nNo place I'd rather be\nThan here in Your love, here in Your love";
    const sl = buildSlides(
      [{ section_type: "chorus", section_label: "Chorus", content }],
      S({ fontSize: size }),
    );
    const settings = S({ fontSize: size });
    const { width: W, height: H } = slideSizePx(settings.aspectRatio);
    const pad = slidePaddingPx(settings.aspectRatio);
    const fitsW = sl.every((s) =>
      s.lines.every(
        (l) =>
          measureTextWidth(
            l,
            settings.fontFamily,
            settings.fontWeight,
            ptToPx(s.fontSize),
          ) <=
          W - pad.x * 2,
      ),
    );
    const fitsH = sl.every(
      (s) => s.lines.length * ptToPx(s.fontSize) * LINE_HEIGHT <= H - pad.y * 2,
    );
    const noWordsBroken = sl
      .flatMap((s) => s.lines)
      .join(" ")
      .includes("rather be");
    check(
      `fontSize ${size}: fits + intact`,
      fitsW && fitsH && noWordsBroken,
      sl.flatMap((s) => s.lines),
    );
  }
}

/* ===== 13. Empty section produces blank slide ===== */
{
  check(
    "font size below 14 normalizes to default",
    normalizeSettings({ fontSize: 13 }).fontSize === DEFAULT_SETTINGS.fontSize,
  );
  check(
    "font size 14 remains valid",
    normalizeSettings({ fontSize: 14 }).fontSize === 14,
  );
  check(
    "font size 72 remains valid",
    normalizeSettings({ fontSize: 72 }).fontSize === 72,
  );
  check(
    "font size above 72 normalizes to default",
    normalizeSettings({ fontSize: 73 }).fontSize === DEFAULT_SETTINGS.fontSize,
  );
  check(
    "Sunday date label is present on Sunday",
    sundayDateLabel(new Date(2024, 0, 7)) !== null,
  );
  check(
    "Sunday date label is absent on other days",
    sundayDateLabel(new Date(2024, 0, 8)) === null,
  );

  const sl = buildSlides(
    [{ section_type: "outro", section_label: "Outro", content: "" }],
    S(),
  );
  check(
    "empty section -> one blank slide",
    sl.length === 1 && sl[0].lines[0] === "",
  );
}

/* ===== 14. PPTX generation from the same model ===== */
(async () => {
  process.chdir(__dirname);
  const p = parseLyrics(testLyrics);
  const settings = S({ showSectionLabel: true });
  const slidesForPptx = buildSlides(p, settings);
  await generatePowerPoint({
    songTitle: "Amazing Grace (My Test)",
    artist: "Test",
    slides: slidesForPptx,
    settings,
  });
  const fname = "MAYA - Amazing Grace (My Test).pptx";
  check("pptx created", fs.existsSync(fname));
  if (fs.existsSync(fname)) {
    const buf = fs.readFileSync(fname);
    check("valid zip header", buf[0] === 0x50 && buf[1] === 0x4b);
    const JSZip = require("jszip");
    const zip = await JSZip.loadAsync(buf);
    const slideNames = Object.keys(zip.files).filter((n) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(n),
    );
    check(
      "pptx slide count matches model",
      slideNames.length === slidesForPptx.length,
      `xml=${slideNames.length} model=${slidesForPptx.length}`,
    );
    const firstXml = await zip.file("ppt/slides/slide1.xml").async("string");
    const xmlEscaped = slidesForPptx[0].lines[0]
      .replace(/&/g, "&amp;")
      .replace(/'/g, "&apos;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    check(
      "pptx contains the same wrapped line as the model",
      firstXml.includes(xmlEscaped),
      slidesForPptx[0].lines[0],
    );
    check(
      "pptx uses slide-specific auto-fit font",
      firstXml.includes(`sz="${slidesForPptx[0].fontSize * 100}"`),
      slidesForPptx[0].fontSize,
    );
    check(
      "pptx uses configured font face",
      firstXml.includes(settings.fontFamily),
      settings.fontFamily,
    );
  }
  fs.existsSync(fname) && fs.unlinkSync(fname);
  console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
})();
