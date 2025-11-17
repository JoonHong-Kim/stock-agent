import ko from "@/messages/ko.json";

export const messages = {
  ko,
};

export type Locale = keyof typeof messages;

export function t(key: keyof typeof ko, locale: Locale = "ko") {
  return messages[locale][key];
}
