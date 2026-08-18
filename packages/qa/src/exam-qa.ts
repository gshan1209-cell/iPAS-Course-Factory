import type { QaFinding, UnitQaContext } from './types.js';

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function runExamQa(context: UnitQaContext): QaFinding[] {
  const findings: QaFinding[] = [];
  const item = context.unit.artifacts.questionBank?.items.find(candidate => candidate.kind === 'UNIT_QUESTION_BANK');
  if (!item || (item.status !== 'READY' && item.status !== 'APPROVED')) return findings;

  const questions = item.metadata.questions;
  if (!Array.isArray(questions)) {
    findings.push({
      code: 'EXAM_QUESTION_DATA_MISSING', severity: 'ERROR', artifactId: item.artifactId,
      message: 'Ready question-bank artifact requires structured questions metadata.'
    });
    return findings;
  }

  for (const [index, raw] of questions.entries()) {
    const question = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const questionId = nonEmpty(question.questionId) ? question.questionId : `index-${index + 1}`;
    const artifactId = item.artifactId;
    if (!nonEmpty(question.questionId)) {
      findings.push({ code: 'EXAM_QUESTION_ID_MISSING', severity: 'ERROR', artifactId, message: `Question ${questionId} is missing questionId.` });
    }
    if (!nonEmpty(question.topic)) {
      findings.push({ code: 'EXAM_TOPIC_MISSING', severity: 'ERROR', artifactId, message: `Question ${questionId} is missing topic.` });
    }
    if (!nonEmpty(question.stem)) {
      findings.push({ code: 'EXAM_STEM_MISSING', severity: 'ERROR', artifactId, message: `Question ${questionId} is missing stem.` });
    }
    const options = Array.isArray(question.options) ? question.options.filter(nonEmpty) : [];
    if (options.length < 2) {
      findings.push({ code: 'EXAM_OPTIONS_INSUFFICIENT', severity: 'ERROR', artifactId, message: `Question ${questionId} requires at least two options.` });
    }
    if (!nonEmpty(question.answer)) {
      findings.push({ code: 'EXAM_ANSWER_MISSING', severity: 'ERROR', artifactId, message: `Question ${questionId} is missing answer.` });
    }
    if (!nonEmpty(question.explanation)) {
      findings.push({ code: 'EXAM_EXPLANATION_MISSING', severity: 'ERROR', artifactId, message: `Question ${questionId} is missing explanation.` });
    }
    if (!Array.isArray(question.sourceIds) || question.sourceIds.length === 0 || !question.sourceIds.every(nonEmpty)) {
      findings.push({ code: 'EXAM_SOURCE_LINEAGE_MISSING', severity: 'ERROR', artifactId, message: `Question ${questionId} is missing source lineage.` });
    }

    if (nonEmpty(question.answer) && options.length >= 2) {
      const answer = question.answer;
      const distractors = question.distractorReasoning && typeof question.distractorReasoning === 'object'
        ? question.distractorReasoning as Record<string, unknown>
        : {};
      const labels = options.map(option => option.trim().charAt(0)).filter(Boolean);
      const incorrectLabels = labels.filter(label => label !== answer);
      if (!incorrectLabels.every(label => nonEmpty(distractors[label]))) {
        findings.push({
          code: 'EXAM_DISTRACTOR_REASONING_MISSING', severity: 'ERROR', artifactId,
          message: `Question ${questionId} is missing distractor reasoning for one or more incorrect options.`
        });
      }
    }
  }

  return findings;
}
