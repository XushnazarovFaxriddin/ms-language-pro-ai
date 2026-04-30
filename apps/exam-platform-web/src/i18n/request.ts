import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { notFound } from "next/navigation";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  let messages;
  try {
    if (locale === "en") {
      messages = (await import("@languagepro/i18n/en")).default;
    } else {
      messages = (await import("@languagepro/i18n/uz")).default;
    }
  } catch (error) {
    notFound();
  }

  return {
    locale,
    messages,
  };
});
