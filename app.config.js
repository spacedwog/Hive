import 'dotenv/config';

export default {
  expo: {
    name: "HiveApp",
    slug: "hiveapp",
    version: "1.0.0",
    extra: {
      githubToken: process.env.GITHUB_TOKEN,
      authPassword: process.env.AUTH_PASSWORD, // se quiser proteger também
    },
  },
};