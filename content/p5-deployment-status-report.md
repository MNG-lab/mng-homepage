# P5 Deployment Status Report

Generated at: 2026-03-03T01:55:13.287Z
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
| Latest deploy workflow run is green | PASS | run #28, conclusion=success |
| Latest deploy run matches main HEAD | PASS | run sha=4f047e18dfda99ab966739215afc2af1d7302ef6, main sha=4f047e18dfda99ab966739215afc2af1d7302ef6 |
| Published URL is reachable | PASS | status=200, root=yes |
| Rollback target SHA is documented | PASS | 8bb6369370ae8b5ebf39440b7d7a3810657f10bc |

## Latest Deploy Run

- Run number: 28
- Status: completed
- Conclusion: success
- Head SHA: 4f047e18dfda99ab966739215afc2af1d7302ef6
- Updated at: 2026-03-03T01:51:22Z
- Run URL: https://github.com/MNG-lab/mng-homepage/actions/runs/22604574036

## Rollback Target

- Recommended rollback SHA: 8bb6369370ae8b5ebf39440b7d7a3810657f10bc
- Source run: #27 (success)
- Run URL: https://github.com/MNG-lab/mng-homepage/actions/runs/22604517006

### Rollback Commands

```bash
git checkout main
git pull origin main
git revert --no-edit 8bb6369370ae8b5ebf39440b7d7a3810657f10bc..HEAD
git push origin main
```

- Note: After push, verify the new `Deploy to GitHub Pages` run from Actions history.
