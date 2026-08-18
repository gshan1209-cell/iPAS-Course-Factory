export const STANDARD_UNIT_FOLDERS = {
  source: '01_Source',
  slides: '02_課程簡報',
  voice: '03_語音',
  video: '04_影片',
  handout: '05_講義',
  desktopExplainers: '06_電腦詳解圖',
  mobileCards: '07_手機重點卡',
  formulaDecisionCard: '08_公式卡',
  officialQuestionBreakdown: '09_真題拆解',
  questionBank: '10_題庫'
} as const;

export type UnitFolderKey = keyof typeof STANDARD_UNIT_FOLDERS;
export type UnitFolderMapping = Record<UnitFolderKey, string>;
