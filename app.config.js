import 'dotenv/config';

export default {
  expo: {
    name: "Hive",
    slug: "hive",
    version: "1.0.0",
    extra: {
      githubToken: process.env.GITHUB_TOKEN,
      authUsername: process.env.AUTH_USERNAME, // se quiser proteger também
      authPassword: process.env.AUTH_PASSWORD, // se quiser proteger também
    },
  },
};