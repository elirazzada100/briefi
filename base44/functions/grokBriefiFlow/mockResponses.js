function sanitizeCopy(value) {
  return String(value || "")
    .replace(/\s*[-–—־]+\s*/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.:;!?])/g, "$1")
    .replace(/([,.:;!?])(?=\S)/g, "$1 ")
    .replace(/([.?!])\s*([,.:;!?])/g, "$1")
    .replace(/\.\s*\./g, ". ")
    .replace(/^\s*[.,:;!?]+\s*/g, "")
    .trim();
}

function sanitizeList(values) {
  return Array.isArray(values) ? values.map((value) => sanitizeCopy(value)) : [];
}

function buildProviderLog(stepName) {
  return {
    provider_used: "mock",
    step_name: stepName,
    success: true,
  };
}

function buildCreativeDnaCards() {
  return [
    {
      title: "הכיוון הכי חזק",
      summary: sanitizeCopy("זה עסק שצריך לעבוד דרך רגעים קטנים שאנשים מזהים מהחיים שלהם. הסושיאל צריך להרגיש חד, פשוט, וכזה שמבין למה אנשים באמת נעצרים."),
      tags: sanitizeList(["חד", "אנושי", "יומיומי"]),
    },
    {
      title: "מה מוכרים פה באמת",
      summary: sanitizeCopy("לא מוכרים רק מוצר או שירות. מוכרים תחושה של בחירה טובה שמרגישה ברורה גם בלי להסביר יותר מדי."),
      tags: sanitizeList(["תחושה", "בחירה", "ברור"]),
    },
    {
      title: "למה זה יכול לעבוד",
      summary: sanitizeCopy("יש פה חומר טוב לסושיאל כי אפשר להראות מצבים שאנשים כבר מכירים מעצמם, ואז לחבר אותם ישר לעסק בלי טקסט מתאמץ."),
      tags: sanitizeList(["הזדהות", "רגעים", "חיבור"]),
    },
    {
      title: "איך נגרום לאנשים לעצור",
      summary: sanitizeCopy("נפתח בסיטואציה קטנה שמרגישה אמיתית, ואז נביא פרט אחד חד שגורם להבין מהר למה שווה להמשיך לראות."),
      tags: sanitizeList(["פתיחה", "עצירה", "חדות"]),
    },
    {
      title: "הזווית של בריפי",
      summary: sanitizeCopy("כדאי לבנות דמות תוכן עקבית שמרגישה כמו מישהו שמכיר את העסק מבפנים אבל מדבר פשוט, בלי פוזה ובלי משפטים מנופחים."),
      tags: sanitizeList(["עקביות", "פשוט", "ישיר"]),
    },
  ];
}

export function getMockCreativeDNAResponse() {
  return {
    creative_dna: {
      business_analysis_cards: buildCreativeDnaCards(),
      recommended_content_directions: sanitizeList([
        "לצלם רגעים קטנים של בחירה או התלבטות ואז להראות למה אנשים חוזרים דווקא לכאן",
        "להבליט פרטים שאנשים שמים לב אליהם רק כשהם באמת משתמשים במוצר או מגיעים למקום",
        "לבנות סדרת תוכן קצרה סביב תגובות אמיתיות של אנשים ולא סביב הסבר ארוך",
      ]),
      main_angle: sanitizeCopy("הסושיאל צריך לגרום לאנשים להרגיש שהם כבר מבינים את הערך בלי שמוכרים להם בכוח."),
      audience_truth: sanitizeCopy("אנשים לא מחפשים הרצאה. הם מחפשים סימן קטן שיגרום להם להאמין שזה בשבילם."),
      what_is_interesting: sanitizeCopy("החומר הטוב נמצא בפרטים היומיומיים, בתגובות, ובהבדל הדק שמרגישים כשזה באמת עובד."),
      what_to_avoid: sanitizeCopy("לא ללכת על טון מתאמץ או על ניסוחים נוצצים. זה צריך להרגיש בטוח, פשוט, וקרוב לקרקע."),
    },
    provider: "mock",
  };
}

function buildConceptCopy(selectedStyle, isUGC, isTrendy) {
  if (isTrendy) {
    return [
      {
        concept_title: sanitizeCopy("רגע קטן שמקבל טוויסט"),
        short_description: sanitizeCopy("פותחים במשהו שנראה רגיל לגמרי, ואז מגיע פרט קטן שמחליף את כל התמונה וגורם לעצור."),
        why_it_works: sanitizeCopy("זה יושב טוב על טרנדי כי זה מרגיש קליל, חד, ונותן מקום לקצב מהיר בלי להסביר יותר מדי."),
        idea_tags: sanitizeList(["טרנדי", "טוויסט", "קצב"]),
      },
      {
        concept_title: sanitizeCopy("מה כולם מפספסים פה"),
        short_description: sanitizeCopy("מציגים דבר קטן שאנשים בדרך כלל לא שמים לב אליו, ואז מראים למה דווקא הוא הסיבה שהמקום הזה נתקע בזיכרון."),
        why_it_works: sanitizeCopy("הפורמט הזה נותן תחושה של גילוי, וזה בדיוק מה שעוזר לתוכן טרנדי להרגיש שווה שיתוף."),
        idea_tags: sanitizeList(["טרנדי", "גילוי", "שיתוף"]),
      },
      {
        concept_title: sanitizeCopy("לפני שמכירים, ואז אחרי"),
        short_description: sanitizeCopy("משווים בין מה שאנשים חושבים בהתחלה לבין מה שהם מבינים אחרי שחווים את העסק מקרוב."),
        why_it_works: sanitizeCopy("המעבר החד בין לפני ואחרי נותן מבנה ברור וקל לצפייה גם בלי הרבה טקסט."),
        idea_tags: sanitizeList(["טרנדי", "לפני ואחרי", "ברור"]),
      },
      {
        concept_title: sanitizeCopy("הקטע שאנשים שולחים לחבר"),
        short_description: sanitizeCopy("בונים וידאו סביב רגע אחד קטן שאנשים מזהים מיד ורוצים להעביר הלאה למישהו שיגיד בדיוק."),
        why_it_works: sanitizeCopy("כשיש רגע אחד מדויק שקל לזהות, יש יותר סיכוי שהתוכן ירגיש שווה לשלוח."),
        idea_tags: sanitizeList(["טרנדי", "שיתוף", "רגע חד"]),
      },
    ];
  }

  if (isUGC) {
    return [
      {
        concept_title: sanitizeCopy("לא חשבתי שאשים לב לזה"),
        short_description: sanitizeCopy("מישהי מספרת מה היא חשבה לפני שניסתה, ואז מה תפס אותה באמת ברגע קטן ולא צפוי."),
        why_it_works: sanitizeCopy("זה נשמע כמו חוויה של משתמשת אמיתית, ולכן ההמלצה מרגישה טבעית ולא כמו קול של עסק."),
        idea_tags: sanitizeList(["ugc", "חוויה אישית", "המלצה"]),
      },
      {
        concept_title: sanitizeCopy("מה שאהבתי כבר בדקה הראשונה"),
        short_description: sanitizeCopy("יוצר תוכן מתאר משהו קטן שהרגיש לו נכון מהרגע הראשון ומסביר למה זה שינה לו את כל החוויה."),
        why_it_works: sanitizeCopy("הפורמט הזה מחבר אנשים דרך תחושה פשוטה שקל להאמין לה כי היא מגיעה ממישהו שכבר ניסה."),
        idea_tags: sanitizeList(["ugc", "יוצר תוכן", "תחושה"]),
      },
      {
        concept_title: sanitizeCopy("אם אתם מתלבטים, זה מה שהכריע אצלי"),
        short_description: sanitizeCopy("מישהו משתף בהתלבטות אמיתית שהייתה לו, ואז מסביר מה גרם לו לבחור בסוף."),
        why_it_works: sanitizeCopy("זה נותן לצופה שפה של המלצה מבחוץ, בלי קול פנימי של מותג שמנסה לשכנע."),
        idea_tags: sanitizeList(["ugc", "התלבטות", "בחירה"]),
      },
      {
        concept_title: sanitizeCopy("הפרט הקטן שגרם לי לחזור"),
        short_description: sanitizeCopy("לקוחה מספרת על פרט אחד קטן שהיא לא ציפתה לו, אבל בגללו היא כבר ידעה שהיא תחזור שוב."),
        why_it_works: sanitizeCopy("דווקא פרט קטן ואישי יוצר אמינות גבוהה ותחושה של חוויה אמיתית."),
        idea_tags: sanitizeList(["ugc", "אמינות", "חוויה"]),
      },
    ];
  }

  return [
    {
      concept_title: sanitizeCopy("הרגע שבו מבינים למה זה עובד"),
      short_description: sanitizeCopy("מראים סיטואציה יומיומית שהקהל מכיר, ואז מחברים אותה ישר למה שהעסק פותר או משפר בפועל."),
      why_it_works: sanitizeCopy("זה מחדד את ההבטחה של העסק בלי להסביר יותר מדי ובלי להישמע כמו פרסומת כבדה."),
      idea_tags: sanitizeList([selectedStyle || "רגיל", "יומיומי", "ברור"]),
    },
    {
      concept_title: sanitizeCopy("הדבר הקטן שאנשים זוכרים"),
      short_description: sanitizeCopy("מתמקדים בפרט אחד קטן שמבדיל את העסק וגורם לאנשים לספר עליו גם אחר כך."),
      why_it_works: sanitizeCopy("כשבוחרים פרט אחד חזק, התוכן הופך להרבה יותר ברור וקל לזכור."),
      idea_tags: sanitizeList([selectedStyle || "רגיל", "זכירות", "פוקוס"]),
    },
    {
      concept_title: sanitizeCopy("למה אנשים בוחרים בזה שוב"),
      short_description: sanitizeCopy("לא מסבירים את כל הסיפור, אלא מראים דרך התנהגות או תגובה למה אנשים חוזרים שוב."),
      why_it_works: sanitizeCopy("זה נותן הוכחה דרך מצב אמיתי, וזה הרבה יותר חזק ממשפט שיווקי."),
      idea_tags: sanitizeList([selectedStyle || "רגיל", "חזרה", "הוכחה"]),
    },
    {
      concept_title: sanitizeCopy("מה מרגיש אחרת כאן"),
      short_description: sanitizeCopy("בונים וידאו שממחיש למה החוויה כאן מרגישה אחרת דרך קצב, בחירה, ומבט של מי שמגיע מבחוץ."),
      why_it_works: sanitizeCopy("הצופה מקבל תחושה ברורה בלי שנכריח אותו לחשוב עליה במילים גדולות."),
      idea_tags: sanitizeList([selectedStyle || "רגיל", "תחושה", "בהיר"]),
    },
  ];
}

export function getMockConceptsResponse({ selectedStyle = "", isUGC = false, isTrendy = false } = {}) {
  return {
    concepts: buildConceptCopy(selectedStyle, isUGC, isTrendy),
    source: "mock",
    candidates_count: 4,
    pool_sent_to_openai: false,
    validation_passed: true,
    provider_log: buildProviderLog(isTrendy ? "concept_trendy_mock" : "concept_mock"),
  };
}

export function getMockOpeningOptionsResponse({ selectedStyle = "", isUGC = false } = {}) {
  const styleTag = sanitizeCopy(selectedStyle || (isUGC ? "ugc" : "רגיל"));
  const openingOptions = isUGC
    ? [
        {
          opening_line: sanitizeCopy("לא ציפיתי שזה מה שיתפוס אותי ראשון"),
          why_it_fits: sanitizeCopy("זה נשמע כמו מישהי שמספרת מה היא הרגישה באמת, ולכן זה עובד טוב כהמלצה."),
          mechanic_tag: sanitizeCopy("וידוי קטן"),
        },
        {
          opening_line: sanitizeCopy("באתי לבדוק, ודווקא הפרט הזה נשאר איתי"),
          why_it_fits: sanitizeCopy("הפתיחה מרגישה כמו חוויה אישית ולא כמו טקסט של עסק."),
          mechanic_tag: sanitizeCopy("חוויה אישית"),
        },
        {
          opening_line: sanitizeCopy("אם אתם מתלבטים, זה מה ששינה לי את הדעה"),
          why_it_fits: sanitizeCopy("יש פה זווית של משתמשת שמדברת מבחוץ, וזה שומר על קול UGC אמין."),
          mechanic_tag: sanitizeCopy("הכרעה"),
        },
        {
          opening_line: sanitizeCopy("מה שאהבתי פה קרה הרבה יותר מהר ממה שחשבתי"),
          why_it_fits: sanitizeCopy("המשפט נותן תחושת אמת קטנה שקל להתחבר אליה כבר מהשנייה הראשונה."),
          mechanic_tag: sanitizeCopy("הפתעה"),
        },
      ]
    : [
        {
          opening_line: sanitizeCopy("יש רגע אחד שבו מבינים למה אנשים נעצרים דווקא פה"),
          why_it_fits: sanitizeCopy(`הפתיחה מתאימה לסגנון ${styleTag} כי היא מסקרנת בלי לצעוק.`),
          mechanic_tag: sanitizeCopy("סקרנות"),
        },
        {
          opening_line: sanitizeCopy("לא צריך הרבה זמן כדי להבין למה זה עובד"),
          why_it_fits: sanitizeCopy("המשפט ישיר, קצר, ונותן בסיס טוב להמשך ברור."),
          mechanic_tag: sanitizeCopy("הצהרה"),
        },
        {
          opening_line: sanitizeCopy("הפרט הקטן הזה מספר את כל הסיפור"),
          why_it_fits: sanitizeCopy("זו פתיחה שממקדת את הצופה ומביאה אותו לחפש את הפרט הבא."),
          mechanic_tag: sanitizeCopy("פוקוס"),
        },
        {
          opening_line: sanitizeCopy("זה נראה פשוט, אבל זה בדיוק מה שתופס"),
          why_it_fits: sanitizeCopy("הפתיחה נותנת טון בטוח ונגישה גם לקהל שלא מכיר את העסק."),
          mechanic_tag: sanitizeCopy("ניגוד"),
        },
      ];

  return {
    opening_options: openingOptions,
    source: "mock",
    provider_log: buildProviderLog("opening_mock"),
  };
}

export function getMockCTAOptionsResponse({ selectedStyle = "", isUGC = false } = {}) {
  const styleTag = sanitizeCopy(selectedStyle || (isUGC ? "ugc" : "רגיל"));
  const ctaOptions = isUGC
    ? [
        {
          cta_text: sanitizeCopy("אם אתם מחפשים משהו כזה, שווה לבדוק בעצמכם"),
          why_it_fits: sanitizeCopy("זה נשמע כמו המלצה של משתמשת מרוצה, לא כמו עסק שפונה על עצמו."),
        },
        {
          cta_text: sanitizeCopy("אני הייתי בודקת את זה אם זה מדבר אליכם"),
          why_it_fits: sanitizeCopy("הניסוח נשאר אישי ורך, וזה בדיוק הטון שעובד טוב ב UGC."),
        },
        {
          cta_text: sanitizeCopy("אם זה בדיוק מה שחיפשתם, תנו לזה צאנס"),
          why_it_fits: sanitizeCopy("הקריאה מרגישה כמו טיפ מחברה ולא כמו שורת סיום מכירתית."),
        },
        {
          cta_text: sanitizeCopy("מי שזה מדבר אליו כנראה יבין לבד למה זה שווה בדיקה"),
          why_it_fits: sanitizeCopy("המשפט נותן המלצה מבחוץ בלי להחליק לקול של בעל העסק."),
        },
      ]
    : [
        {
          cta_text: sanitizeCopy("אם זה תפס אתכם, זה הזמן לבדוק את זה מקרוב"),
          why_it_fits: sanitizeCopy(`הסיום שומר על טון ${styleTag} ברור וישיר בלי לחץ מיותר.`),
        },
        {
          cta_text: sanitizeCopy("מי שזה מדבר אליו כבר יודע מה לעשות עכשיו"),
          why_it_fits: sanitizeCopy("זה CTA בטוח וקצר שממשיך את הקו של הסרטון בלי לקפוץ חזק מדי."),
        },
        {
          cta_text: sanitizeCopy("שווה לעצור רגע ולראות אם זה מתאים גם לכם"),
          why_it_fits: sanitizeCopy("הקריאה רגועה, אנושית, ולא מרגישה כמו סגירת מכירה כבדה."),
        },
        {
          cta_text: sanitizeCopy("אם חיפשתם משהו כזה, כנראה מצאתם כיוון טוב"),
          why_it_fits: sanitizeCopy("זה יוצר המשך טבעי לצפייה ומשאיר את הטון שימושי ופשוט."),
        },
      ];

  return {
    cta_options: ctaOptions,
    provider_log: buildProviderLog("cta_mock"),
  };
}

function buildMockFinalBriefPayload({ selectedStyle = "", isUGC = false } = {}) {
  const styleLabel = sanitizeCopy(selectedStyle || (isUGC ? "ugc" : "רגיל"));
  const hook = isUGC
    ? sanitizeCopy("לא ציפיתי שזה יהיה הדבר הראשון שאני אזכור")
    : sanitizeCopy("יש רגע אחד שבו מבינים למה זה עובד");
  const cta = isUGC
    ? sanitizeCopy("אם אתם מחפשים משהו כזה, שווה לבדוק בעצמכם")
    : sanitizeCopy("אם זה תפס אתכם, זה הזמן לבדוק את זה מקרוב");

  return {
    brief_title: sanitizeCopy(isUGC ? "המלצה שמרגישה אמיתית" : `בריף ${styleLabel} שמרגיש חד`),
    video_concept: sanitizeCopy(isUGC
      ? "וידאו שמרגיש כמו המלצה של מישהי שכבר ניסתה ומשתפת מה תפס אותה באמת."
      : "וידאו קצר שממחיש דרך רגע אחד ברור למה אנשים מתחברים לעסק הזה מהר."),
    hook,
    script_format: "person_to_camera",
    script_text: sanitizeCopy(isUGC
      ? "ניסיתי את זה בלי ציפיות גדולות, ודווקא הפרט הקטן הזה גרם לי להבין למה אנשים מדברים על זה."
      : "פותחים בסיטואציה קטנה ומוכרת, ואז חושפים את הפרט שגורם להבין למה הדבר הזה עובד טוב."),
    shot_structure: [
      {
        step: 1,
        visual: sanitizeCopy("קלוז אפ על רגע קטן שמרגיש אמיתי"),
        spoken_or_overlay_text: hook,
      },
      {
        step: 2,
        visual: sanitizeCopy("מעבר לפרט שמסביר את הערך בלי הרצאה"),
        spoken_or_overlay_text: sanitizeCopy("זה בדיוק הרגע שמבהיר למה אנשים נעצרים"),
      },
      {
        step: 3,
        visual: sanitizeCopy("תגובה טבעית או פעולה קצרה שמוכיחה את הנקודה"),
        spoken_or_overlay_text: sanitizeCopy(isUGC ? "מה שאהבתי זה שזה הרגיש פשוט ונכון" : "לא צריך להסביר הרבה כשהדבר עצמו מדבר"),
      },
      {
        step: 4,
        visual: sanitizeCopy("סיום נקי שמחזיר אותנו לתחושה הראשית"),
        spoken_or_overlay_text: cta,
      },
    ],
    text_overlays: sanitizeList([
      "הרגע שתופס",
      "הפרט שעושה את ההבדל",
      "שווה לבדוק מקרוב",
    ]),
    cta,
    video_description: sanitizeCopy(isUGC
      ? "סרטון שמרגיש כמו המלצה של לקוחה אמיתית. הוא יושב על תחושה פשוטה שקל להאמין לה."
      : "סרטון קצר עם קו ברור ורגע אחד חזק. הוא מדגיש את מה שגורם לעסק להרגיש מעניין בלי להכביד."),
    caption_suggestion: sanitizeCopy(isUGC
      ? "לפעמים פרט קטן אחד גורם להבין לבד למה זה תופס."
      : "כשמראים את הדבר הנכון, לא צריך הרבה מילים."),
    visual_must_haves: sanitizeList([
      "קלוז אפ אחד ברור",
      "רגע תגובה טבעי",
      "סיום נקי עם מבט למצלמה",
    ]),
    production_notes: sanitizeCopy("לשמור על צילום פשוט, קצב טבעי, וטון שמרגיש כמו בן אדם."),
    why_it_works: sanitizeCopy(isUGC
      ? "הבריף נשען על קול חיצוני ואמין, ולכן ההמלצה מרגישה טבעית וקלה לקבלה."
      : "הבריף ממקד את הצופה ברגע אחד חד, וזה מה שעוזר לזכור את המסר ולהישאר איתו."),
  };
}

export function getMockFinalBriefResponse({ selectedStyle = "", isUGC = false } = {}) {
  return {
    final_brief: buildMockFinalBriefPayload({ selectedStyle, isUGC }),
    brief_id: "mock-brief-id",
    provider_log: {
      ...buildProviderLog("final_brief_mock"),
      openai_assemble_used: false,
      grok_polish_attempted: false,
      grok_polish_applied: false,
      grok_polish_failed_reason: null,
    },
    openai_assemble_used: false,
    grok_polish_attempted: false,
    grok_polish_applied: false,
    grok_polish_failed_reason: null,
  };
}

export function getMockImprovedFinalBriefResponse({ selectedStyle = "", isUGC = false } = {}) {
  const final_brief = buildMockFinalBriefPayload({ selectedStyle, isUGC });
  final_brief.script_text = sanitizeCopy(
    isUGC
      ? "לקחתי מזה משהו כבר מהשנייה הראשונה, ובגלל זה היה לי קל להמליץ עליו גם הלאה."
      : "הגרסה הזו שומרת על אותו רעיון, רק מדברת קצר יותר ונותנת למסך לעבוד במקום עודף הסבר."
  );
  final_brief.video_description = sanitizeCopy(
    isUGC
      ? "הגרסה המשופרת נשארת אישית ומבחוץ. היא מרגישה כמו מישהי שממליצה מתוך ניסיון."
      : "הגרסה המשופרת שומרת על חדות ונותנת לסיפור לזוז מהר יותר."
  );
  final_brief.caption_suggestion = sanitizeCopy(
    isUGC
      ? "כשהחוויה מרגישה נכונה, לא צריך להגזים כדי לדבר עליה."
      : "ברגע שהרעיון ברור, גם התוכן מרגיש בטוח יותר."
  );
  final_brief.production_notes = sanitizeCopy("להשאיר מקום לנשימה, מבט טבעי, וטקסט קצר.");
  final_brief.why_it_works = sanitizeCopy(
    isUGC
      ? "הטקסט נשאר בקול של משתמשת מבחוץ, וזה שומר על האמינות של כל הבריף."
      : "הדיוק נמצא בפשטות. פחות הסבר, יותר תמונה, ואותו כיוון נשמר."
  );

  return {
    final_brief,
    provider: "mock",
  };
}
