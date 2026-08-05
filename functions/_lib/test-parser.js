/**
 * DL-Library Test TXT Import Parser
 * 
 * Qoidalar (reja.md 4.2):
 * 1. Kamida 5 ta '+' belgisidan iborat qator (masalan +++++) savollarni ajratadi.
 * 2. Faqat '=' belgilaridan iborat qatorlar vizual separator va tashlanadi.
 * 3. Har bir blokdagi birinchi bo'sh bo'lmagan matn -> Savol matni.
 * 4. Keyingi bo'sh bo'lmagan matnlar -> Javob variantlari.
 * 5. Birinchi ko'rinadigan belgisi '#' bo'lgan variant -> To'g'ri javob (saqlashda '#' olib tashlanadi).
 * 6. Har bir savolda kamida 2 ta variant va aynan 1 ta to'g'ri javob bo'lishi shart.
 */

export function parseTestTxt(rawContent) {
  if (typeof rawContent !== 'string') {
    return {
      success: false,
      errors: [{ line: 0, message: "Fayl matni bo'sh yoki noto'g'ri formatda" }]
    };
  }

  // Windows CRLF va LF ni normallashtiramiz
  const normalized = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  // Savol bloklariga ajratish (kamida 5 ta '+' bo'lgan qator bo'yicha)
  const blockLines = [];
  let currentBlock = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Faqat '+' belgilaridan iborat va uzunligi >= 5 bo'lgan separator
    if (/^\+{5,}$/.test(trimmed)) {
      if (currentBlock.length > 0) {
        blockLines.push(currentBlock);
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    blockLines.push(currentBlock);
  }

  const parsedQuestions = [];
  const errors = [];
  const warnings = [];

  let questionIndex = 0;

  for (const rawBlock of blockLines) {
    // '=' separatorlarini tashlaymiz
    const filteredLines = rawBlock.filter(l => !/^={3,}$/.test(l.trim()));
    // Bo'sh bo'lmagan qatorlar
    const nonEntries = filteredLines.map(l => l.trim()).filter(l => l.length > 0);

    if (nonEntries.length === 0) {
      continue; // Qatordagi bo'sh blok bo'lsa o'tkazib yuboramiz
    }

    questionIndex++;

    const questionText = nonEntries[0];
    const optionEntries = nonEntries.slice(1);

    if (optionEntries.length < 2) {
      errors.push({
        questionNumber: questionIndex,
        message: `${questionIndex}-savolda kamida 2 ta javob varianti bo'lishi kerak. Topildi: ${optionEntries.length} ta.`
      });
      continue;
    }

    const options = [];
    let correctCount = 0;

    for (let oIdx = 0; oIdx < optionEntries.length; oIdx++) {
      let optText = optionEntries[oIdx];
      let isCorrect = false;

      if (optText.startsWith('#')) {
        isCorrect = true;
        correctCount++;
        optText = optText.slice(1).trim();
      }

      options.push({
        position: oIdx + 1,
        text: optText,
        isCorrect
      });
    }

    if (correctCount === 0) {
      errors.push({
        questionNumber: questionIndex,
        message: `${questionIndex}-savolda to'g'ri javob ('#' belgisi bilan) ko'rsatilmadi.`
      });
    } else if (correctCount > 1) {
      errors.push({
        questionNumber: questionIndex,
        message: `${questionIndex}-savolda 1 tadan ko'p to'g'ri javob belgilangan (${correctCount} ta). V1 da faqat 1 ta to'g'ri javob ruxsat etiladi.`
      });
    } else {
      parsedQuestions.push({
        position: questionIndex,
        questionText,
        options
      });
    }
  }

  if (parsedQuestions.length === 0 && errors.length === 0) {
    errors.push({
      questionNumber: 0,
      message: "Faylda hech qanday savol topilmadi."
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      questions: [],
      errors
    };
  }

  return {
    success: true,
    questions: parsedQuestions,
    warnings,
    totalQuestions: parsedQuestions.length
  };
}
