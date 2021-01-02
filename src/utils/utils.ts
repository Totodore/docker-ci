import * as FormData from "form-data";

export function objectToFormdata(obj: { [K: string]: string }): FormData {
  const form = new FormData();
  for (const key in obj)
    form.append(key, obj[key]);
  return form;
} 

export function isUrl(str: string) {
  try {
    new URL(str);
    return true;
  } catch (err) {
    return false;
  }
};