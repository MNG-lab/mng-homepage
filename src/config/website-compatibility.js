// Rollback compatibility checkpoint, intentionally outside the editable paths.
// Increment when a foundation/security fix is made inside an editable page or
// content file, so automatic rollback cannot restore a version before that fix.
// This file is compared by the admin/runner; it need not be imported by the site.
export const websiteCompatibility = 1;
