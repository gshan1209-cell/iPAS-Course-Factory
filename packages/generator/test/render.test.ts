import { describe, expect, it } from 'vitest';
import { TEMPLATE_CONTRACTS } from '../src/template-registry.js';
import { renderTemplate } from '../src/render.js';

describe('template registry', () => {
  it('enumerates exactly nine explicit contracts', () => {
    expect(Object.keys(TEMPLATE_CONTRACTS)).toEqual([
      'sourceBrief', 'slides', 'voice', 'handout', 'desktopExplainers',
      'mobileCards', 'formulaDecisionCard', 'officialQuestionBreakdown', 'questionBank'
    ]);
  });

  it('fails before reading a template when a required variable is missing', async () => {
    await expect(renderTemplate('sourceBrief', {
      course: 'iPAS', unit: 'M1-03'
    })).rejects.toThrow('Missing template variable: level');
  });

  it('treats blank required strings and empty arrays as missing', async () => {
    await expect(renderTemplate('formulaDecisionCard', {
      course: 'iPAS', subject: 'M1', unit: 'M1-03', source_pack: ' ', exam_focus: [], known_traps: ['trap']
    })).rejects.toThrow('Missing template variable: source_pack');
  });
});
