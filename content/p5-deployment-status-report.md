# P5 Deployment Status Report

Generated at: 2026-03-03T02:10:21.111Z
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
| Latest deploy workflow run is green | PASS | run #31, conclusion=success |
| Latest deploy run matches main HEAD | PASS | run sha=d7c450bd69311ed985cd52cead104ceb21a77b13, main sha=d7c450bd69311ed985cd52cead104ceb21a77b13 |
| Published URL is reachable | PASS | status=200, root=yes |
| Rollback target SHA is documented | PASS | b3f75390e59aab4c197eef3543f763636975d865 |

## Latest Deploy Run

- Run number: 31
- Status: completed
- Conclusion: success
- Head SHA: d7c450bd69311ed985cd52cead104ceb21a77b13
- Updated at: 2026-03-03T02:04:31Z
- Run URL: https://github.com/MNG-lab/mng-homepage/actions/runs/22604901074

## Rollback Target

- Recommended rollback SHA: b3f75390e59aab4c197eef3543f763636975d865
- Source run: #30 (success)
- Run URL: https://github.com/MNG-lab/mng-homepage/actions/runs/22604816145

### Rollback Commands

```bash
git checkout main
git pull origin main
git revert --no-edit b3f75390e59aab4c197eef3543f763636975d865..HEAD
git push origin main
```

- Note: After push, verify the new `Deploy to GitHub Pages` run from Actions history.
