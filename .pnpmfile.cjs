/**
 * pnpmfile.cjs
 *
 * Explicitly allows build scripts for packages that need them.
 * This resolves the [ERR_PNPM_IGNORED_BUILDS] error for esbuild and similar packages.
 *
 * @see https://pnpm.io/pnpmfile
 */

function readPackage(pkg) {
  // Allow build scripts for packages that require native compilation
  const packagesWithAllowedBuilds = ['esbuild', 'libvips', 'sharp', 'canvas'];

  if (packagesWithAllowedBuilds.includes(pkg.name)) {
    // Mark as allowed to run build scripts
    pkg.pnpm = pkg.pnpm || {};
    pkg.pnpm.allowedBuildScripts = true;
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
