# Redirect Validation Report

Generated at: 2026-03-03T02:10:14.715Z
Base URL: https://dglab.yonsei.ac.kr
Routes map: /Users/user/Desktop/mng-homepage/routes-map.md

## Summary

- PASS: 6
- WARN: 0
- FAIL: 2
- SKIP: 1

## Results

| Legacy | Expected | Policy | Result | Reason | Chain |
| --- | --- | --- | --- | --- | --- |
| /publications/publications | /publications | 301 redirect | FAIL | Expected redirect but response did not redirect. | 200 /publications/publications |
| /publications | /publications | keep | FAIL | Canonical route returns 404. | 404 /publications |
| / | / | keep | PASS | Canonical route is directly reachable. | 200 / |
| /research | /research | keep | PASS | Canonical route is directly reachable. | 200 /research |
| /professor | /professor | keep | PASS | Canonical route is directly reachable. | 200 /professor |
| /members | /members | keep | PASS | Canonical route is directly reachable. | 200 /members |
| /contact | /contact | keep | PASS | Canonical route is directly reachable. | 200 /contact |
| /gallery | /gallery | keep | PASS | Canonical route is directly reachable. | 200 /gallery |
| /news | /gallery | 301 redirect | SKIP | Ambiguous mapping row; requires manual decision. | - |
