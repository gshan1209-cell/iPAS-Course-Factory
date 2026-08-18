export const TEMPLATE_CONTRACTS = {
  sourceBrief: {
    path: 'source-brief/default.hbs',
    required: ['course', 'level', 'subject', 'unit', 'core_thesis', 'official_scope', 'source_pack', 'exam_focus']
  },
  slides: {
    path: 'slides/master-art-direction/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'core_thesis', 'source_pack', 'exam_focus', 'known_traps', 'visual_motif']
  },
  voice: {
    path: 'voice/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'core_thesis', 'slide_outline', 'exam_focus', 'known_traps']
  },
  handout: {
    path: 'handout/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'core_thesis', 'source_pack', 'exam_focus', 'known_traps']
  },
  desktopExplainers: {
    path: 'desktop-card/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'core_thesis', 'source_pack', 'exam_focus', 'visual_motif']
  },
  mobileCards: {
    path: 'mobile-card/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'core_thesis', 'source_pack', 'exam_focus', 'known_traps', 'visual_motif']
  },
  formulaDecisionCard: {
    path: 'formula-card/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'source_pack', 'exam_focus', 'known_traps']
  },
  officialQuestionBreakdown: {
    path: 'exam-breakdown/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'source_pack', 'exam_focus', 'official_question_refs']
  },
  questionBank: {
    path: 'question-bank/ipas-intermediate.hbs',
    required: ['course', 'subject', 'unit', 'source_pack', 'exam_focus', 'known_traps']
  }
} as const;

export type TemplateContractKey = keyof typeof TEMPLATE_CONTRACTS;
