export const ENV = {
    appId: process.env.VITE_APP_ID ?? "",
    cookieSecret: process.env.JWT_SECRET ?? "",
    databaseUrl: process.env.DATABASE_URL ?? "",
    isProduction: process.env.NODE_ENV === "production",
    // Adicione estas linhas para evitar o crash do servidor:
    ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
    ownerName: process.env.OWNER_NAME ?? "",
    forgeApiUrl: process.env.OAUTH_SERVER_URL ?? "https://api.manus.im",
    forgeApiKey: process.env.GROQ_API_KEY ?? "",
};
