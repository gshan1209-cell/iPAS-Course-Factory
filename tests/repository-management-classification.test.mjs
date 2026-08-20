import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(
  readFileSync(new URL("../.ai-company/repo-manifest.yaml", import.meta.url), "utf8"),
);

test("classifies iPAS as managed DEV4 product-platform", () => {
  assert.equal(manifest.repository, "gshan1209-cell/iPAS-Course-Factory");
  assert.equal(manifest.classification.repoClass, "product-platform");
  assert.equal(manifest.management.managementPolicy, "optional");
  assert.equal(manifest.management.managementStatus, "managed");
  assert.equal(manifest.management.portfolioInclusion, "active-product");
  assert.equal(manifest.development.maturity, "DEV4");
  assert.equal(manifest.development.productionReadiness, "not-claimed");
});

test("keeps GS-004 identity fail-closed", () => {
  assert.equal(manifest.identity.systemLevel.value, null);
  assert.equal(manifest.identity.systemLevel.status, "missing-current-repository-local-evidence");
  assert.equal(manifest.identity.systemCode.value, null);
  assert.equal(manifest.identity.systemNameZh.value, null);
  assert.equal(manifest.identity.systemNameEn.value, null);
  assert.equal(manifest.identity.systemDisplayLabel.value, null);
});

test("preserves current execution and human-gate boundaries", () => {
  assert.equal(manifest.executionPolicy.policy, "DS-003@2.1.1");
  assert.equal(manifest.executionPolicy.testPullRequest, null);
  assert.equal(manifest.executionPolicy.validatorRepositoryWrite, false);
  assert.equal(manifest.executionPolicy.validatorRemediation, false);
  assert.equal(manifest.executionPolicy.pendingValidationFreezesMain, false);
  assert.equal(manifest.humanGates.slidesApprovalRequired, true);
  assert.equal(manifest.humanGates.voiceApprovalRequired, true);
  assert.equal(manifest.humanGates.finalPublicationApprovalRequired, true);
  assert.equal(manifest.humanGates.externalOutputAutoApprovalAllowed, false);
  assert.equal(manifest.evidence.productValidationTask, "gshan1209-cell/AI-Workstream#225");
  assert.equal(manifest.evidence.identityGate, "gshan1209-cell/iPAS-Course-Factory#7");
  assert.equal(manifest.evidence.managementSource, "gshan1209-cell/iPAS-Course-Factory#8");
});
