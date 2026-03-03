# P5 Deployment Status Report

Generated at: 2026-03-03T01:26:25.753Z
Repository: MNG-lab/mng-homepage
Branch: main
Workflow file: deploy-pages.yml
Published URL: https://mng-lab.github.io/mng-homepage/

## Summary

- PASS checks: 4
- FAIL checks: 0

## Checks

| Check | Result | Detail |
| --- | --- | --- |
| Latest deploy workflow run is green | PASS | run #22, conclusion=success |
| Latest deploy run matches main HEAD | PASS | run sha=94c6f1dad5576260f2b887cb4454387479835ab5, main sha=94c6f1dad5576260f2b887cb4454387479835ab5 |
| Published URL is reachable | PASS | status=200, root=yes |
| Rollback target SHA is documented | PASS | be3b816f574a68b48a6448d4f27f1a4d3dd29fdb |

## Latest Deploy Run

- Run number: 22
- Status: completed
- Conclusion: success
- Head SHA: 94c6f1dad5576260f2b887cb4454387479835ab5
- Updated at: 2026-03-03T01:24:25Z
- Run URL: https://github.com/MNG-lab/mng-homepage/actions/runs/22603847016

## Rollback Target

- Recommended rollback SHA: be3b816f574a68b48a6448d4f27f1a4d3dd29fdb
- Source run: #21 (success)
- Run URL: https://github.com/MNG-lab/mng-homepage/actions/runs/22603774254

### Rollback Commands

```bash
git checkout main
git pull origin main
git revert --no-edit be3b816f574a68b48a6448d4f27f1a4d3dd29fdb..HEAD
git push origin main
```

- Note: After push, verify the new `Deploy to GitHub Pages` run from Actions history.
