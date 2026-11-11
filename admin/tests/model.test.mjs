import test from "node:test";
import assert from "node:assert/strict";
import {
  initialRequests,
  latestRevision,
  restoreFields,
  transitionRequest,
  makeRequest,
  canRollback,
} from "../src/model.js";

test("restoring revision 1 retains request 1, removes 2 and 3, and appends history", () => {
  let records = initialRequests();
  records = transitionRequest(records, 104, "done");
  const target = records.find((r) => r.id === 102);
  const fields = restoreFields(target, records);
  assert.deepEqual(fields.removedRequestIds.sort(), [103, 104]);
  assert.deepEqual(fields.targetSnapshotIds, [102]);
  const request = makeRequest(records, fields, "관리자");
  records = [request, ...records];
  records = transitionRequest(records, request.id, "done");
  assert.deepEqual(latestRevision(records).snapshotIds, [102]);
  assert.equal(records.filter((r) => r.status === "done").length, 4);
  assert.equal(canRollback(latestRevision(records), records), false);
});
test("restoration is rejected if a newer change deploys before approval", () => {
  let records = initialRequests();
  const request = makeRequest(
    records,
    restoreFields(
      records.find((r) => r.id === 102),
      records,
    ),
    "관리자",
  );
  records = [request, ...records];
  records = transitionRequest(records, 104, "done");
  records = transitionRequest(records, request.id, "deploying");
  assert.equal(records.find((r) => r.id === request.id).status, "failed");
  assert.deepEqual(latestRevision(records).snapshotIds, [102, 103, 104]);
});
test("a later snapshot can be restored after rollback without deleting history", () => {
  let records = initialRequests();
  const later = records.find((r) => r.id === 103);
  const request = makeRequest(
    records,
    restoreFields(
      records.find((r) => r.id === 102),
      records,
    ),
    "관리자",
  );
  records = transitionRequest([request, ...records], request.id, "done");
  const forward = restoreFields(later, records);
  assert.deepEqual(forward.removedRequestIds, []);
  assert.deepEqual(forward.restoredRequestIds, [103]);
});
