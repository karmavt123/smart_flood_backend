import { MODEL_VARIABLE_ORDER } from '@/constants/modelVariables';

/** Sắp các biến của công thức theo thứ tự dễ đọc (H, V trước; biến lạ xếp cuối theo ABC). */
export function sortModelVariables(names: string[]): string[] {
  const rank = (name: string) => {
    const index = MODEL_VARIABLE_ORDER.indexOf(name);
    return index === -1 ? 99 : index;
  };
  return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
