// Convex Auth's standard provider config: tokens are validated through the
// OIDC endpoints our http router serves at the site root.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
